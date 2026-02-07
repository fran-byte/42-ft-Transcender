const Deck = require('./Deck');

class BlackjackGame {
    // MODIFICADO: Ahora recibimos 'emitUpdate' (la función para avisar al servidor)
    constructor(id, emitUpdate) {
        this.id = id;
        this.emitUpdate = emitUpdate; // Guardamos la función
        this.deck = new Deck(6);
        this.players = {}; 
        this.playerOrder = []; 
        this.dealerHand = [];
        this.gameState = 'waiting'; 
        this.turn = null; 
        this.turnTimer = null; // Variable para guardar el temporizador
    }

    addPlayer(socketId, username) {
        if (this.gameState !== 'waiting') return false;
        if (this.players[socketId]) return true;

        this.players[socketId] = {
            id: socketId,
            username: username,
            hand: [],
            score: 0,
            status: 'waiting', 
            result: null
        };
        
        this.playerOrder.push(socketId);
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.playerOrder = this.playerOrder.filter(id => id !== socketId);
        
        // Si el que se va tenía el turno, paramos reloj y pasamos al siguiente
        if (this.gameState === 'playing' && this.turn === socketId) {
            this.clearTurnTimer();
            this.nextTurn();
        }
    }

    // MODIFICADO: Recibimos requestingSocketId para verificar seguridad
    startRound(requestingSocketId) {
        // SEGURIDAD: Si el que pide start NO es un jugador sentado, ignoramos.
        if (!this.players[requestingSocketId]) {
            console.log(`⚠️ Espectador ${requestingSocketId} intentó iniciar partida. Denegado.`);
            return;
        }

        if (this.playerOrder.length === 0) return;
        
        this.clearTurnTimer(); // Limpieza preventiva
        this.deck.reset();
        this.gameState = 'playing';
        this.dealerHand = this.deck.deal(2);

        this.playerOrder.forEach(id => {
            const player = this.players[id];
            player.hand = this.deck.deal(2);
            player.score = this.calculateScore(player.hand);
            player.status = 'playing';
            player.result = null;

            if (player.score === 21) player.status = 'blackjack';
        });

        this.turn = this.playerOrder[0];
        
        // Si el primero tiene Blackjack, pasa turno. Si no, ¡EMPIEZA EL RELOJ!
        if (this.players[this.turn].score === 21) {
            this.nextTurn();
        } else {
            this.startTurnTimer();
        }
    }

    hit(socketId) {
        if (this.gameState !== 'playing' || this.turn !== socketId) return;

        this.clearTurnTimer(); // Paramos el reloj porque ha actuado

        const player = this.players[socketId];
        player.hand.push(this.deck.deal(1)[0]);
        player.score = this.calculateScore(player.hand);

        if (player.score >= 21) {
            if (player.score > 21) player.status = 'busted';
            this.nextTurn();
        } else {
            // Si sigue vivo, reiniciamos el reloj para su siguiente decisión
            this.startTurnTimer();
        }
    }

    stand(socketId) {
        if (this.gameState !== 'playing' || this.turn !== socketId) return;
        
        this.clearTurnTimer(); // Paramos el reloj
        this.players[socketId].status = 'stood';
        this.nextTurn();
    }

    // --- NUEVO: LÓGICA DEL TEMPORIZADOR ---
    startTurnTimer() {
        this.clearTurnTimer(); // Limpiamos anterior por si acaso

        const currentTurnPlayer = this.turn;
        console.log(`⏳ Iniciando contador de 15s para ${currentTurnPlayer}`);

        this.turnTimer = setTimeout(() => {
            console.log(`⏰ TIEMPO AGOTADO para ${currentTurnPlayer}. Forzando STAND.`);
            
            // 1. Ejecutamos la lógica de plantarse
            this.stand(currentTurnPlayer);
            
            // 2. AVISAMOS AL SERVIDOR ("Teléfono Rojo")
            // Esto es vital porque 'stand' ocurrió sin petición del socket
            if (this.emitUpdate) {
                this.emitUpdate(this.getPublicState());
            }
        }, 15000); // 15 segundos
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
            const nextPlayerId = this.playerOrder[currentIndex + 1];
            this.turn = nextPlayerId;

            if (this.players[nextPlayerId].status === 'blackjack') {
                this.nextTurn();
            } else {
                // Nuevo turno -> Nuevo reloj
                this.startTurnTimer();
            }
        } else {
            this.clearTurnTimer(); // Se acabaron los turnos de humanos
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
            if (player.status === 'busted') player.result = 'lose';
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
        this.clearTurnTimer(); // IMPORTANTE: Limpiar reloj al resetear
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
    }

    getPublicState() {
        let visibleHand = [];
        if (this.gameState === 'playing' && this.dealerHand.length > 0) {
            visibleHand = [this.dealerHand[0]];
        } else {
            visibleHand = this.dealerHand;
        }

        const visibleScore = this.calculateScore(visibleHand);

        return {
            id: this.id,
            gameState: this.gameState,
            turn: this.turn,
            dealerHand: visibleHand,
            dealerScore: visibleScore,
            playerOrder: this.playerOrder,
            players: this.players
        };
    }
}

module.exports = BlackjackGame;