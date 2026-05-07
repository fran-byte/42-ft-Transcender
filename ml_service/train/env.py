"""
Blackjack RL Environment for DQN training.

Heads-up vs dealer, 6-deck shoe, S17 (dealer stands on soft 17),
blackjack pays 3:2, no surrender, no split, double on any 2 cards.

State: [player_score, dealer_visible, usable_ace, true_count, can_double] (raw, un-normalized)
Actions: 0=HIT, 1=STAND, 2=DOUBLE
Reward: P&L in units of initial bet (-2 to +2 with double, +1.5 natural blackjack)
"""

import random
import numpy as np


TRUE_COUNT_CLIP = (-10.0, 15.0)

# ---------------------------------------------------------------------------
# Minimal card / deck utilities (self-contained, no simulator dependency)
# ---------------------------------------------------------------------------

_CARD_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "10": 10, "J": 10, "Q": 10, "K": 10, "A": 11,
}
_LO_CARDS = {"2", "3", "4", "5", "6"}
_HI_CARDS = {"10", "J", "Q", "K", "A"}


class _Card:
    __slots__ = ("value", "numeric_value")

    def __init__(self, value):
        self.value = value
        self.numeric_value = _CARD_VALUES[value]


class Deck:
    def __init__(self, num_decks=6):
        self.num_decks = num_decks
        self.cards = []
        self.reset()

    def reset(self):
        values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
        self.cards = [_Card(v) for _ in range(self.num_decks) for _ in range(4) for v in values]
        random.shuffle(self.cards)

    def deal(self, n=1):
        if len(self.cards) < n:
            self.reset()
        out = self.cards[:n]
        self.cards = self.cards[n:]
        return out

    def true_count(self):
        count = sum(
            1 if c.value in _LO_CARDS else -1 if c.value in _HI_CARDS else 0
            for c in self.cards
        )
        decks_remaining = max(len(self.cards) / 52, 0.5)
        return count / decks_remaining


def calculate_score(hand):
    score, aces = 0, 0
    for c in hand:
        v = c.numeric_value
        if v == 11:
            aces += 1
        score += v
    while score > 21 and aces:
        score -= 10
        aces -= 1
    return score


def usable_ace(hand):
    score, soft = 0, False
    for c in hand:
        v = c.numeric_value
        if v == 11:
            soft = True
        score += v
    while score > 21 and soft:
        score -= 10
        soft = False
    return soft and score <= 21


def has_blackjack(hand):
    if len(hand) != 2:
        return False
    vals = {c.value for c in hand}
    return "A" in vals and bool(vals & {"10", "J", "Q", "K"})


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

class BlackjackEnv:
    def __init__(self, num_decks=6, penetration=0.75, dealer_hits_soft_17=False, seed=None):
        self.num_decks = num_decks
        self.dealer_hits_soft_17 = dealer_hits_soft_17
        self.reshuffle_threshold = int(num_decks * 52 * (1 - penetration))
        if seed is not None:
            np.random.seed(seed)
            random.seed(seed)
        self.deck = Deck(num_decks)
        self.player_hand = []
        self.dealer_hand = []
        self.first_action = True
        self.done = True

    def _reshuffle_if_needed(self):
        if len(self.deck.cards) < self.reshuffle_threshold:
            self.deck.reset()

    def _true_count(self):
        tc = self.deck.true_count()
        return float(np.clip(tc, *TRUE_COUNT_CLIP))

    def _get_state(self):
        ps = calculate_score(self.player_hand)
        dv = self.dealer_hand[0].numeric_value
        ua = int(usable_ace(self.player_hand))
        tc = self._true_count()
        cd = int(self.first_action)
        return np.array([ps, dv, ua, tc, cd], dtype=np.float32)

    def reset(self):
        self._reshuffle_if_needed()
        self.player_hand = self.deck.deal(2)
        self.dealer_hand = self.deck.deal(2)
        self.first_action = True
        self.done = False
        return self._get_state()

    def _dealer_play(self):
        score = calculate_score(self.dealer_hand)
        while score < 17 or (
            score == 17 and self.dealer_hits_soft_17 and usable_ace(self.dealer_hand)
        ):
            self.dealer_hand.append(self.deck.deal(1)[0])
            score = calculate_score(self.dealer_hand)

    def _resolve(self, doubled=False):
        ps = calculate_score(self.player_hand)
        if ps > 21:
            return -2.0 if doubled else -1.0

        player_bj = has_blackjack(self.player_hand) and not doubled
        dealer_bj = has_blackjack(self.dealer_hand)

        if player_bj and dealer_bj:
            return 0.0
        if player_bj:
            return 1.5
        if dealer_bj:
            return -1.0

        self._dealer_play()
        ds = calculate_score(self.dealer_hand)

        if ds > 21 or ps > ds:
            return 2.0 if doubled else 1.0
        if ps < ds:
            return -2.0 if doubled else -1.0
        return 0.0

    def step(self, action):
        if self.done:
            raise RuntimeError("Episode is done. Call reset() first.")

        if action == 2 and not self.first_action:
            action = 1

        if action == 0:  # HIT
            self.first_action = False
            self.player_hand.append(self.deck.deal(1)[0])
            ps = calculate_score(self.player_hand)
            if ps > 21:
                self.done = True
                return self._get_state(), -1.0, True, {"reason": "bust"}
            if ps == 21:
                self.done = True
                reward = self._resolve()
                return self._get_state(), reward, True, {"reason": "auto_stand_21"}
            return self._get_state(), 0.0, False, {}

        if action == 1:  # STAND
            self.done = True
            reward = self._resolve()
            return self._get_state(), reward, True, {"reason": "stand"}

        if action == 2:  # DOUBLE (only valid on first action — guarded above)
            self.player_hand.append(self.deck.deal(1)[0])
            self.done = True
            reward = self._resolve(doubled=True)
            return self._get_state(), reward, True, {"reason": "double"}

        raise ValueError(f"Invalid action: {action}")

    def action_mask(self):
        """Returns bool array [hit_ok, stand_ok, double_ok] for the current state."""
        return np.array([True, True, self.first_action], dtype=bool)


# ---------------------------------------------------------------------------
# Vectorized environment: N parallel BlackjackEnv with auto-reset on done.
# ---------------------------------------------------------------------------

class VectorizedBlackjackEnv:
    def __init__(self, n_envs, num_decks=6, penetration=0.75,
                 dealer_hits_soft_17=False, seed_base=0):
        self.n_envs = n_envs
        self.envs = [
            BlackjackEnv(num_decks=num_decks, penetration=penetration,
                         dealer_hits_soft_17=dealer_hits_soft_17,
                         seed=seed_base + i)
            for i in range(n_envs)
        ]

    def reset_all(self):
        return np.stack([e.reset() for e in self.envs])

    def action_mask_all(self):
        return np.stack([e.action_mask() for e in self.envs])

    def step(self, actions):
        """
        actions: np.ndarray (n_envs,) int64
        Returns (next_states, rewards, dones, mask_nexts).
        For envs that finish on this step, next_states is the post-reset state
        of a fresh episode and mask_nexts is its action mask. The DQN target
        gates Q(next) by (1 - done), so the value of next_state for terminal
        transitions doesn't affect learning.
        """
        next_states = np.empty((self.n_envs, 5), dtype=np.float32)
        rewards = np.empty(self.n_envs, dtype=np.float32)
        dones = np.empty(self.n_envs, dtype=np.float32)
        mask_nexts = np.empty((self.n_envs, 3), dtype=bool)

        for i, env in enumerate(self.envs):
            ns, r, done, _ = env.step(int(actions[i]))
            rewards[i] = r
            dones[i] = float(done)
            if done:
                ns = env.reset()
            next_states[i] = ns
            mask_nexts[i] = env.action_mask()

        return next_states, rewards, dones, mask_nexts
