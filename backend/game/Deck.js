export default class Deck {
  constructor(numDecks = 6) {
    this.numDecks = numDecks;
    this.cards = [];
    this.reset();
  }

  reset() {
    const suits = ['♥', '♦', '♣', '♠'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    this.cards = [];

    for (let i = 0; i < this.numDecks; i++) {
      for (const suit of suits) {
        for (const value of values) {
          this.cards.push({ suit, value });
        }
      }
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(num) {
    const hand = [];
    for (let i = 0; i < num; i++) {
      if (this.cards.length === 0) this.reset();
      hand.push(this.cards.pop());
    }
    return hand;
  }
}
