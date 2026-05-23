#!/usr/bin/env python3
"""
Offline evaluation harness for the Blackjack DQN agent.

Compares three policies head-to-head over N hands:
  1. Trained DQN     — NumPy forward pass, no PyTorch required.
  2. Basic strategy  — textbook S17 / 6-deck, no split, no surrender.
  3. Random          — uniform over legal actions (sanity floor).

Global results + TRUE COUNT STRATIFICATION: breaks down mean reward by TC
bucket to show whether the DQN exploits the count better than basic strategy
at high true counts.

Usage:
    python evaluate.py                   # 20k hands, seed 12345
    python evaluate.py --hands 100000    # tighter standard error
    python evaluate.py --seed 7
    python evaluate.py --model path.npz
"""

import argparse
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from env import BlackjackEnv  # noqa: E402


# ---------------------------------------------------------------------------
# Constants (must stay in sync with dqn.py and app.py)
# ---------------------------------------------------------------------------

NORM_RANGES = {
    "player_score":   (4.0,   21.0),
    "dealer_visible": (2.0,   11.0),
    "usable_ace":     (0.0,    1.0),
    "true_count":     (-10.0, 15.0),
    "can_double":     (0.0,   1.0),
}
_KEYS = ["player_score", "dealer_visible", "usable_ace", "true_count", "can_double"]
_NORM_LO = np.array([NORM_RANGES[k][0] for k in _KEYS], dtype=np.float32)
_NORM_HI = np.array([NORM_RANGES[k][1] for k in _KEYS], dtype=np.float32)

WEIGHT_KEYS = [
    "shared_W1", "shared_b1", "shared_W2", "shared_b2",
    "value_W1",  "value_b1",  "value_W2",  "value_b2",
    "adv_W1",    "adv_b1",    "adv_W2",    "adv_b2",
]

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "blackjack_dqn.npz")

HIT, STAND, DOUBLE = 0, 1, 2
ACTION_NAMES = ["hit", "stand", "double"]

# True count buckets: (label, low_inclusive, high_exclusive)
TC_BUCKETS = [
    ("TC < 0",       -np.inf, 0),
    ("0 ≤ TC < 1",   0,       1),
    ("1 ≤ TC < 2",   1,       2),
    ("TC ≥ 2",       2,       np.inf),
]


# ---------------------------------------------------------------------------
# DQN policy — NumPy forward pass (mirrors app.py, no torch)
# ---------------------------------------------------------------------------

def load_model(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}")
    data = np.load(path)
    missing = [k for k in WEIGHT_KEYS if k not in data.files]
    if missing:
        raise ValueError(f"Model missing keys: {missing}")
    return {k: data[k] for k in WEIGHT_KEYS}


def _relu(x):
    return np.maximum(0, x)


def _forward(model, x):
    h = _relu(x @ model["shared_W1"] + model["shared_b1"])
    h = _relu(h @ model["shared_W2"] + model["shared_b2"])
    v = _relu(h @ model["value_W1"]  + model["value_b1"])
    v = v @ model["value_W2"] + model["value_b2"]
    a = _relu(h @ model["adv_W1"] + model["adv_b1"])
    a = a @ model["adv_W2"] + model["adv_b2"]
    return v + (a - a.mean())


def dqn_policy(model):
    def act(state, mask):
        x = (state - _NORM_LO) / (_NORM_HI - _NORM_LO)
        q = _forward(model, x.astype(np.float32))
        q_masked = np.where(mask, q, -np.inf)
        return int(np.argmax(q_masked))
    return act


# ---------------------------------------------------------------------------
# Basic strategy — S17, 6-deck, no split, no surrender (static, no count)
# ---------------------------------------------------------------------------

def basic_strategy(state, mask):
    player_score, dealer_visible, usable_ace, _tc, can_double = state
    player_score   = int(player_score)
    dealer_visible = int(dealer_visible)
    usable_ace     = bool(usable_ace)
    can_double     = bool(can_double) and bool(mask[DOUBLE])

    if usable_ace:
        if player_score >= 19:
            return STAND
        if player_score == 18:
            if dealer_visible in (3, 4, 5, 6) and can_double:
                return DOUBLE
            return STAND if dealer_visible in (2, 7, 8) else HIT
        if player_score == 17:
            return DOUBLE if dealer_visible in (3, 4, 5, 6) and can_double else HIT
        if player_score in (15, 16):
            return DOUBLE if dealer_visible in (4, 5, 6) and can_double else HIT
        if player_score in (13, 14):
            return DOUBLE if dealer_visible in (5, 6) and can_double else HIT
        return HIT

    if player_score >= 17:
        return STAND
    if player_score in (13, 14, 15, 16):
        return STAND if dealer_visible in (2, 3, 4, 5, 6) else HIT
    if player_score == 12:
        return STAND if dealer_visible in (4, 5, 6) else HIT
    if player_score == 11:
        return DOUBLE if dealer_visible != 11 and can_double else HIT
    if player_score == 10:
        return DOUBLE if dealer_visible in (2, 3, 4, 5, 6, 7, 8, 9) and can_double else HIT
    if player_score == 9:
        return DOUBLE if dealer_visible in (3, 4, 5, 6) and can_double else HIT
    return HIT


# ---------------------------------------------------------------------------
# Random policy
# ---------------------------------------------------------------------------

def random_policy(rng):
    def act(_state, mask):
        return int(rng.choice(np.flatnonzero(mask)))
    return act


# ---------------------------------------------------------------------------
# Rollout — tracks initial true count per hand for stratified analysis
# ---------------------------------------------------------------------------

def run_policy(policy, num_hands, seed):
    """
    Returns global stats + per-hand (initial_tc, reward) for TC stratification.
    initial_tc = true count at the START of the hand (state[3] after reset).
    """
    env = BlackjackEnv(seed=seed)
    rewards     = np.empty(num_hands, dtype=np.float64)
    initial_tcs = np.empty(num_hands, dtype=np.float64)
    action_counts = np.zeros(3, dtype=np.int64)

    for i in range(num_hands):
        state = env.reset()
        initial_tcs[i] = float(state[3])   # true_count at start of hand
        done = False
        final_reward = 0.0
        while not done:
            mask = env.action_mask()
            action = policy(state, mask)
            if not mask[action]:
                action = STAND
            action_counts[action] += 1
            state, final_reward, done, _ = env.step(action)
        rewards[i] = final_reward

    # Global stats
    result = {
        "num_hands":   num_hands,
        "mean_reward": float(rewards.mean()),
        "se":          float(rewards.std(ddof=1) / np.sqrt(num_hands)),
        "win_rate":    float((rewards > 0.01).mean()),
        "push_rate":   float((np.abs(rewards) <= 0.01).mean()),
        "loss_rate":   float((rewards < -0.01).mean()),
        "action_dist": action_counts / max(1, action_counts.sum()),
        # Per-bucket breakdown
        "tc_buckets":  {},
    }

    for label, lo, hi in TC_BUCKETS:
        mask_b = (initial_tcs >= lo) & (initial_tcs < hi)
        n = mask_b.sum()
        if n == 0:
            result["tc_buckets"][label] = None
            continue
        r = rewards[mask_b]
        result["tc_buckets"][label] = {
            "n":           int(n),
            "mean_reward": float(r.mean()),
            "se":          float(r.std(ddof=1) / np.sqrt(n)),
            "win_rate":    float((r > 0.01).mean()),
            "loss_rate":   float((r < -0.01).mean()),
        }

    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _pct(x):
    return f"{100.0 * x:5.2f}%"


def print_global(results):
    headers = ["Policy", "Mean reward", "SE", "Win", "Push", "Loss",
               "Hit%", "Stand%", "Dbl%"]
    rows = []
    for name, r in results.items():
        rows.append([
            name,
            f"{r['mean_reward']:+.4f}",
            f"±{r['se']:.4f}",
            _pct(r["win_rate"]),
            _pct(r["push_rate"]),
            _pct(r["loss_rate"]),
            _pct(r["action_dist"][HIT]),
            _pct(r["action_dist"][STAND]),
            _pct(r["action_dist"][DOUBLE]),
        ])

    widths = [max(len(h), max(len(row[i]) for row in rows))
              for i, h in enumerate(headers)]
    sep = "  ".join("-" * w for w in widths)

    def fmt(cells):
        return "  ".join(c.ljust(w) for c, w in zip(cells, widths))

    num_hands = next(iter(results.values()))["num_hands"]
    print(f"\n{'='*70}")
    print(f" Global results — {num_hands} hands per policy")
    print(f" Rules: 6 decks, S17, no split, no surrender, BJ pays 3:2")
    print(f"{'='*70}")
    print(fmt(headers))
    print(sep)
    for row in rows:
        print(fmt(row))
    print("\n  House edge floor with perfect basic strategy ≈ −0.005 per hand.")
    print("  DQN has true count as a state feature; basic strategy ignores it.")


def print_tc_breakdown(results):
    print(f"\n{'='*70}")
    print(" Mean reward by TRUE COUNT at start of hand")
    print(" (KEY: does the DQN exploit the count better than basic strategy?)")
    print(f"{'='*70}")

    policy_names = list(results.keys())
    headers = ["TC bucket", "Hands"] + [f"{n[:10]} reward" for n in policy_names]
    col_w = [14, 7] + [16] * len(policy_names)

    def fmt(cells):
        return "  ".join(str(c).ljust(w) for c, w in zip(cells, col_w))

    print(fmt(headers))
    print("  ".join("-" * w for w in col_w))

    for label, _, _ in TC_BUCKETS:
        buckets = [results[n]["tc_buckets"][label] for n in policy_names]
        if all(b is None for b in buckets):
            continue
        n_hands = next(b["n"] for b in buckets if b is not None)

        row = [label, str(n_hands)]
        for b in buckets:
            if b is None:
                row.append("  n/a")
            else:
                row.append(f"{b['mean_reward']:+.4f} ±{b['se']:.4f}")
        print(fmt(row))

    print()
    print("  Interpretation:")
    print("  - At TC ≥ 2 the count favors the player (+0.5% per TC unit).")
    print("  - If DQN > basic strategy at TC ≥ 2, the count IS being exploited.")
    print("  - If DQN ≈ basic strategy everywhere, it learned the static table well.")
    print("  - If DQN < basic strategy everywhere, it needs more training.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate Blackjack DQN vs basic strategy vs random, with TC breakdown."
    )
    parser.add_argument("--hands", type=int, default=20_000)
    parser.add_argument("--seed",  type=int, default=12345)
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    model = load_model(args.model)

    rng = np.random.default_rng(args.seed)

    results = {
        "Trained DQN":    run_policy(dqn_policy(model),  args.hands, args.seed),
        "Basic strategy": run_policy(basic_strategy,     args.hands, args.seed),
        "Random":         run_policy(random_policy(rng), args.hands, args.seed),
    }

    print_global(results)
    print_tc_breakdown(results)


if __name__ == "__main__":
    main()
