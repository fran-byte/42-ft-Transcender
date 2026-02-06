const Deck = require('./Deck');

class BlackjackGame {
    constructor(id) {
        this.id = id;
        this.deck = new Deck(6);
        this.players = {}; 
        this.playerOrder = []; // ARRAY NUEVO: Para saber el orden de turno (silla 1, silla 2...)
        this.dealerHand = [];
        this.gameState = 'waiting'; 
        this.turn = null; 
    }

    addPlayer(socketId, username) {
        // Solo dejamos entrar si estamos en la sala de espera
        if (this.gameState !== 'waiting') return false;
        
        // Evitar duplicados
        if (this.players[socketId]) return true;

        this.players[socketId] = {
            id: socketId,
            username: username,
            hand: [],
            score: 0,
            status: 'waiting', 
            result: null
        };
        
        // Lo añadimos a la lista de orden
        this.playerOrder.push(socketId);
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.playerOrder = this.playerOrder.filter(id => id !== socketId);
        
        // Si el que se va tenía el turno, pasamos al siguiente (para que no se bloquee)
        if (this.gameState === 'playing' && this.turn === socketId) {
            this.nextTurn();
        }
    }

    startRound() {
        // Necesitamos al menos 1 jugador
        if (this.playerOrder.length === 0) return;
        
        this.deck.reset();
        this.gameState = 'playing';
        this.dealerHand = this.deck.deal(2);

        // 1. Repartir a TODOS los sentados
        this.playerOrder.forEach(id => {
            const player = this.players[id];
            player.hand = this.deck.deal(2);
            player.score = this.calculateScore(player.hand);
            player.status = 'playing';
            player.result = null;

            if (player.score === 21) player.status = 'blackjack';
        });

        // 2. Dar el turno al PRIMERO de la lista
        this.turn = this.playerOrder[0];
        
        // Si el primero tiene Blackjack directo, pasamos turno automáticamente
        if (this.players[this.turn].score === 21) {
            this.nextTurn();
        }
    }

    hit(socketId) {
        if (this.gameState !== 'playing' || this.turn !== socketId) return;

        const player = this.players[socketId];
        player.hand.push(this.deck.deal(1)[0]);
        player.score = this.calculateScore(player.hand);

        // Si se pasa o tiene 21, turno acabado automáticamente
        if (player.score >= 21) {
            if (player.score > 21) player.status = 'busted';
            this.nextTurn();
        }
    }

    stand(socketId) {
        if (this.gameState !== 'playing' || this.turn !== socketId) return;
        this.players[socketId].status = 'stood';
        this.nextTurn();
    }

    // --- LÓGICA DE ROTACIÓN DE TURNOS ---
    nextTurn() {
        const currentIndex = this.playerOrder.indexOf(this.turn);
        
        // ¿Quedan jugadores después de mí?
        if (currentIndex < this.playerOrder.length - 1) {
            // Pasamos la patata al siguiente
            const nextPlayerId = this.playerOrder[currentIndex + 1];
            this.turn = nextPlayerId;

            // Si el siguiente ya tiene Blackjack (de cuando repartimos), saltamos al otro
            if (this.players[nextPlayerId].status === 'blackjack') {
                this.nextTurn();
            }
        } else {
            // No queda nadie más, le toca al Dealer (La Máquina)
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
        this.gameState = 'waiting';
        this.dealerHand = [];
        this.turn = null;
        this.deck.reset(); // Barajar de nuevo (opcional, o seguir con el mazo)

        // Recorremos los IDs de los jugadores sentados (playerOrder)
        this.playerOrder.forEach(id => {
            const player = this.players[id];
            if (player) {
                player.hand = [];     // Quitar cartas
                player.score = 0;     // Reset puntos
                player.status = 'waiting'; // Estado de espera
                player.result = null; // Quitar cartel de WIN/LOSE
            }
        });
    }

    getPublicState() {
        let visibleHand = [];

        // 1. Decidir qué cartas se ven
        if (this.gameState === 'playing' && this.dealerHand.length > 0) {
            // Durante el juego: Solo mostramos la primera carta
            visibleHand = [this.dealerHand[0]];
        } else {
            // Al terminar: Mostramos todas
            visibleHand = this.dealerHand;
        }

        // 2. Calcular puntos SOLO de lo visible
        const visibleScore = this.calculateScore(visibleHand);

        return {
            id: this.id,
            gameState: this.gameState,
            turn: this.turn,
            dealerHand: visibleHand,
            dealerScore: visibleScore, // <--- Ahora envía el número correcto (ej: 10 o 24)
            playerOrder: this.playerOrder,
            players: this.players
        };
    }
}

module.exports = BlackjackGame;