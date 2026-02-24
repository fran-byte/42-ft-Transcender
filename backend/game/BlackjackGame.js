const Deck = require('./Deck');

class BlackjackGame {
    constructor(id, emitUpdate) {
        this.id = id;
        this.emitUpdate = emitUpdate;
        this.deck = new Deck(6);
        this.players = {}; // CLAVE: userId (persistencia entre F5)
        this.playerOrder = []; // LISTA: userId
        this.spectators = []; // Lista de espera
        this.dealerHand = [];
        this.gameState = 'waiting'; 
        this.turn = null; 
        this.turnTimer = null; 
    }

    // --- MANEJO DE JUGADORES (Con soporte F5) ---
    addPlayer(userId, socketId, username) {
        // Si el usuario ya está en la mesa (por ejemplo, tras un F5)
        if (this.players[userId]) {
            console.log(`♻️ Reconexión: Actualizando socket de ${username}`);
            this.players[userId].socketId = socketId; // Actualizamos el "cable"
            return true;
        }

        // Si el juego está en curso, a la lista de espera
        if (this.gameState !== 'waiting') {
            const alreadyWaiting = this.spectators.find(s => s.userId === userId);
            if (!alreadyWaiting) {
                this.spectators.push({ userId, socketId, username });
            }
            return false;
        }

        // Nuevo asiento en la mesa
        this.players[userId] = {
            id: userId,
            socketId: socketId,
            username: username,
            hand: [],
            score: 0,
            status: 'waiting', 
            result: null
        };
        
        this.playerOrder.push(userId);
        return true;
    }

    removePlayer(userId) {
        if (this.players[userId]) {
            // Solo lo borramos físicamente si no hay partida o ya terminó
            if (this.gameState === 'waiting' || this.gameState === 'finished') {
                delete this.players[userId];
                this.playerOrder = this.playerOrder.filter(id => id !== userId);
            } else {
                // Durante la partida: se queda "AFK" pero con las cartas en mesa
                console.log(`🔌 Jugador ${userId} desconectado. Esperando reconexión...`);
                this.players[userId].socketId = null; 
            }
        } else {
            this.spectators = this.spectators.filter(s => s.userId !== userId);
        }
    }

    // --- LÓGICA DE PARTIDA ---
    startRound(requestingUserId) {
        if (!this.players[requestingUserId]) return;
        if (this.playerOrder.length === 0) return;
        
        this.clearTurnTimer();
        this.deck.reset();
        this.gameState = 'playing';
        this.dealerHand = this.deck.deal(2);

        this.playerOrder.forEach(id => {
            const player = this.players[id];
            player.hand = this.deck.deal(2);
            player.score = this.calculateScore(player.hand);
            player.status = 'playing';
            player.result = null;

            // --- CORRECCIÓN 21 NATURAL ---
            if (player.score === 21) {
                player.status = 'blackjack';
            }
        });

        this.turn = this.playerOrder[0];
        
        // Si el primer jugador tiene Blackjack o 21, saltamos turno automáticamente
        if (this.players[this.turn].status === 'blackjack' || this.players[this.turn].score === 21) {
            this.nextTurn();
        } else {
            this.startTurnTimer();
        }
    }

    hit(userId) {
        if (this.gameState !== 'playing' || this.turn !== userId) return;

        this.clearTurnTimer();
        const player = this.players[userId];
        player.hand.push(this.deck.deal(1)[0]);
        player.score = this.calculateScore(player.hand);

        if (player.score >= 21) {
            if (player.score > 21) player.status = 'busted';
            else player.status = 'stood'; // 21 exactos obliga a plantarse
            this.nextTurn();
        } else {
            this.startTurnTimer();
        }
    }

    stand(userId) {
        if (this.gameState !== 'playing' || this.turn !== userId) return;
        this.clearTurnTimer();
        this.players[userId].status = 'stood';
        this.nextTurn();
    }

    // --- TEMPORIZADOR ANTI-AFK ---
    startTurnTimer() {
        this.clearTurnTimer();
        const currentTurnUserId = this.turn;

        this.turnTimer = setTimeout(() => {
            console.log(`⏰ TIEMPO AGOTADO para ${currentTurnUserId}. STAND automático.`);
            this.stand(currentTurnUserId);
            
            // Forzamos actualización visual a todos
            if (this.emitUpdate) this.emitUpdate(this.getPublicState());
        }, 15000); 
    }

    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
    }

    nextTurn() {
        const currentIndex = this.playerOrder.indexOf(this.turn);
        
        if (currentIndex < this.playerOrder.length - 1) {
            const nextUserId = this.playerOrder[currentIndex + 1];
            this.turn = nextUserId;

            // --- CORRECCIÓN 21 NATURAL (Salto automático) ---
            if (this.players[nextUserId].status === 'blackjack' || this.players[nextUserId].score === 21) {
                this.nextTurn();
            } else {
                this.startTurnTimer();
            }
        } else {
            this.clearTurnTimer();
            this.playDealerTurn();
        }
    }

    playDealerTurn() {
        this.turn = 'dealer';
        let dealerScore = this.calculateScore(this.dealerHand);

        while (dealerScore < 17) {
            this.dealerHand.push(this.deck.deal(1)[0]);
            dealerScore = this.calculateScore(this.dealerHand);
        }

        this.gameState = 'finished';
        this.resolveWinners();
    }

    resolveWinners() {
        const dealerScore = this.calculateScore(this.dealerHand);
        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if (player.status === 'blackjack' && dealerScore !== 21) player.result = 'win';
            else if (player.status === 'busted') player.result = 'lose';
            else if (dealerScore > 21) player.result = 'win';
            else if (player.score > dealerScore) player.result = 'win';
            else if (player.score < dealerScore) player.result = 'lose';
            else player.result = 'push';
        });
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        for (let card of hand) {
            if (['J', 'Q', 'K'].includes(card.value)) score += 10;
            else if (card.value === 'A') { aces += 1; score += 11; }
            else score += parseInt(card.value);
        }
        while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
        return score;
    }

    resetRound() {
        this.clearTurnTimer();
        this.gameState = 'waiting';
        this.dealerHand = [];
        this.turn = null;
        this.deck.reset();

        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if (player) {
                player.hand = [];
                player.score = 0;
                player.status = 'waiting';
                player.result = null;
            }
        });

        if (this.spectators.length > 0) {
            this.spectators.forEach(spec => {
                this.addPlayer(spec.userId, spec.socketId, spec.username);
            });
            this.spectators = [];
        }
    }

    getPublicState() {
        let visibleHand = (this.gameState === 'playing') ? [this.dealerHand[0]] : this.dealerHand;
        return {
            id: this.id,
            gameState: this.gameState,
            turn: this.turn,
            dealerHand: visibleHand,
            dealerScore: this.calculateScore(visibleHand),
            playerOrder: this.playerOrder,
            players: this.players
        };
    }
}

module.exports = BlackjackGame;