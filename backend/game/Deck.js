class Deck {
    // Por defecto usaremos 6 barajas (Standard Casino Rule)
    constructor(numDecks = 6) {
        this.numDecks = numDecks;
        this.cards = [];
        this.reset();
    }

    reset() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        this.cards = [];
        
        // Bucle 1: Repetir por cada baraja (ej: 6 veces)
        for (let i = 0; i < this.numDecks; i++) {
            // Bucle 2: Palos
            for (let suit of suits) {
                // Bucle 3: Valores
                for (let value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }
        
        // Ahora tienes 312 cartas en el array
        this.shuffle();
    }

    shuffle() {
        // Algoritmo Fisher-Yates
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(num) {
        const hand = [];
        for (let i = 0; i < num; i++) {
            // Si por algún casual se acaban, reseteamos (aunque en modo RNG no debería pasar)
            if (this.cards.length === 0) this.reset();
            hand.push(this.cards.pop());
        }
        return hand;
    }
}

module.exports = Deck;