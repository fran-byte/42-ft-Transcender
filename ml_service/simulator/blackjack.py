import random
from enum import Enum


class CardValue(Enum):
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 10
    QUEEN = 10
    KING = 10
    ACE = 11


class Suit(Enum):
    HEARTS = "hearts"
    DIAMONDS = "diamonds"
    CLUBS = "clubs"
    SPADES = "spades"


class Card:
    def __init__(self, value, suit):
        self.value = value
        self.suit = suit
        self.numeric_value = CardValue[value].value if isinstance(value, str) and value in CardValue else int(value)

    def __repr__(self):
        return f"{self.value}_{self.suit}"

    def to_dict(self):
        return {"value": self.value, "suit": self.suit}

    @staticmethod
    def from_string(card_str):
        parts = card_str.split("_")
        if len(parts) != 2:
            raise ValueError(f"Invalid card string: {card_str}")
        return Card(parts[0], parts[1])


class Deck:
    def __init__(self, num_decks=6):
        self.num_decks = num_decks
        self.cards = []
        self.reset()

    def reset(self):
        self.cards = []
        values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
        suits = ["hearts", "diamonds", "clubs", "spades"]

        for _ in range(self.num_decks):
            for suit in suits:
                for value in values:
                    self.cards.append(Card(value, suit))

        random.shuffle(self.cards)

    def deal(self, num_cards=1):
        if len(self.cards) < num_cards:
            self.reset()
        
        dealt = self.cards[:num_cards]
        self.cards = self.cards[num_cards:]
        return dealt

    def remaining(self):
        return len(self.cards)

    def true_count(self):
        return self.hi_lo_count() / (len(self.cards) / 52)

    def hi_lo_count(self):
        count = 0
        for card in self.cards:
            if card.value in ["2", "3", "4", "5", "6"]:
                count += 1
            elif card.value in ["10", "J", "Q", "K", "A"]:
                count -= 1
        return count


def calculate_score(hand):
    if not hand:
        return 0
    
    score = 0
    aces = 0

    for card in hand:
        if isinstance(card, Card):
            value = card.numeric_value
        else:
            value = CardValue[card].value if card in CardValue else int(card)

        if value == 11:
            aces += 1
            score += 11
        else:
            score += value

    while score > 21 and aces > 0:
        score -= 10
        aces -= 1

    return score


def usable_ace(hand):
    if not hand:
        return False
    
    score = calculate_score(hand)
    aces = 0

    for card in hand:
        if isinstance(card, Card):
            if card.value == "A":
                aces += 1
        elif card == "A" or card == 11:
            aces += 1

    if aces == 0:
        return False

    return score == calculate_score([c for c in hand if (isinstance(c, Card) and c.value != "A") or (isinstance(c, str) and c != "A")] + [Card("A", "hearts")])


def has_blackjack(hand):
    if len(hand) != 2:
        return False
    
    score = calculate_score(hand)
    if score != 21:
        return False
    
    has_ace = False
    has_ten = False

    for card in hand:
        if isinstance(card, Card):
            if card.value == "A":
                has_ace = True
            elif card.numeric_value == 10:
                has_ten = True
        else:
            if card == "A":
                has_ace = True
            elif card in ["10", "J", "Q", "K"]:
                has_ten = True

    return has_ace and has_ten


def is_busted(hand):
    return calculate_score(hand) > 21