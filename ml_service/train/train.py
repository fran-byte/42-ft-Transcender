#!/usr/bin/env python3
"""
True DQN training for Blackjack via reinforcement learning.

No hardcoded basic-strategy labels — the agent learns optimal play purely
from simulated games against the dealer using:
  - Dueling DQN architecture
  - Double DQN target
  - Prioritized Experience Replay
  - ε-greedy exploration with linear decay
  - Action masking for DOUBLE (only valid on first action)

Action space: HIT / STAND / DOUBLE
State (5 features, raw): [player_score, dealer_visible, usable_ace, true_count, can_double]

Output: blackjack_dqn.npz consumable by ml_service/app.py (NumPy-only inference).
"""

import os
import time
from collections import deque
import numpy as np
import torch

from env import BlackjackEnv
from dqn import DQNAgent, export_to_numpy, normalize_state, NUM_ACTIONS

# ---------- Hyperparameters ----------
NUM_EPISODES = 2_000_000
LOG_INTERVAL = 5_000
EVAL_INTERVAL = 50_000
EVAL_EPISODES = 5_000
WARMUP_STEPS = 5_000

LR = 1e-4
GAMMA = 0.99
BUFFER_CAPACITY = 100_000
BATCH_SIZE = 256
TARGET_SYNC = 1_000

EPS_START = 1.0
EPS_END = 0.05
EPS_DECAY_STEPS = 500_000

PER_ALPHA = 0.6
PER_BETA_START = 0.4
PER_BETA_END = 1.0
PER_BETA_STEPS = 1_000_000

SEED = 42
MODEL_PATH = os.path.join(os.path.dirname(__file__), "blackjack_dqn.npz")
CHECKPOINT_PATH = MODEL_PATH.replace(".npz", "_ckpt.npz")
ACTION_NAMES = ["hit", "stand", "double"]


def evaluate(agent, num_episodes=EVAL_EPISODES, seed=12345):
    """Greedy evaluation. Returns (avg_reward, win_rate, action_distribution)."""
    eval_env = BlackjackEnv(seed=seed)
    total_reward = 0.0
    wins = 0
    losses = 0
    pushes = 0
    action_counts = np.zeros(NUM_ACTIONS, dtype=np.int64)

    for _ in range(num_episodes):
        state = eval_env.reset()
        done = False
        while not done:
            mask = eval_env.action_mask()
            action = agent.select_action(state, mask, explore=False)
            action_counts[action] += 1
            state, reward, done, _ = eval_env.step(action)
            if done:
                total_reward += reward
                if reward > 0.01:
                    wins += 1
                elif reward < -0.01:
                    losses += 1
                else:
                    pushes += 1
                break

    return {
        "avg_reward": total_reward / num_episodes,
        "win_rate": wins / num_episodes,
        "loss_rate": losses / num_episodes,
        "push_rate": pushes / num_episodes,
        "action_dist": action_counts / max(1, action_counts.sum()),
    }


def smoke_test(agent):
    """Sanity check that the trained policy makes sensible decisions on classic spots.

    These cases are NOT used for training — they only verify post-hoc that the
    learned policy roughly aligns with well-known basic-strategy ground truth.
    """
    cases = [
        # (player, dealer, ace, tc, can_double, expected_in)
        (16, 10, False, 0,  False, {"stand"}),
        (15, 9,  False, 2,  False, {"hit"}),
        (12, 5,  False, -2, False, {"stand"}),
        (17, 7,  False, 5,  False, {"stand"}),
        (18, 9,  True,  0,  False, {"hit"}),
        (18, 7,  True,  0,  False, {"stand"}),
        (11, 6,  False, 0,  True,  {"double"}),
        (10, 5,  False, 0,  True,  {"double"}),
        (20, 10, False, 0,  False, {"stand"}),
        (5,  10, False, 0,  False, {"hit"}),
    ]
    print("\nSmoke test (basic-strategy alignment):")
    correct = 0
    for ps, dv, ace, tc, cd, expected in cases:
        state = np.array([ps, dv, int(ace), tc, int(cd)], dtype=np.float32)
        mask = np.array([True, True, cd], dtype=bool)
        action = agent.select_action(state, mask, explore=False)
        name = ACTION_NAMES[action]
        ok = name in expected
        correct += int(ok)
        flag = "OK" if ok else "FAIL"
        print(f"  [{flag}] ps={ps:>2} dv={dv:>2} ace={int(ace)} tc={tc:+d} cd={int(cd)} → {name} (expected one of {expected})")
    print(f"  → {correct}/{len(cases)} aligned")
    return correct, len(cases)


def main():
    np.random.seed(SEED)
    torch.manual_seed(SEED)

    print(f"Initializing environment and agent (device=cpu, episodes={NUM_EPISODES:,})...")
    env = BlackjackEnv(seed=SEED)
    agent = DQNAgent(
        lr=LR,
        gamma=GAMMA,
        buffer_capacity=BUFFER_CAPACITY,
        batch_size=BATCH_SIZE,
        target_sync_interval=TARGET_SYNC,
        eps_start=EPS_START,
        eps_end=EPS_END,
        eps_decay_steps=EPS_DECAY_STEPS,
        per_alpha=PER_ALPHA,
        per_beta_start=PER_BETA_START,
        per_beta_end=PER_BETA_END,
        per_beta_steps=PER_BETA_STEPS,
    )

    recent_rewards = deque(maxlen=LOG_INTERVAL)
    recent_losses  = deque(maxlen=LOG_INTERVAL)
    start_time = time.time()

    for episode in range(1, NUM_EPISODES + 1):
        state = env.reset()
        episode_reward = 0.0
        done = False

        while not done:
            mask = env.action_mask()
            action = agent.select_action(state, mask, explore=True)
            next_state, reward, done, _ = env.step(action)
            mask_next = env.action_mask() if not done else np.array([True, True, False], dtype=bool)
            agent.push(state, action, reward, next_state, done, mask_next)
            state = next_state
            episode_reward += reward

            if agent.env_step > WARMUP_STEPS:
                loss = agent.learn()
                if loss is not None:
                    recent_losses.append(loss)

        recent_rewards.append(episode_reward)

        if episode % LOG_INTERVAL == 0:
            elapsed = time.time() - start_time
            avg_r = np.mean(recent_rewards)
            avg_loss = np.mean(recent_losses) if recent_losses else 0.0
            eps = agent.epsilon()
            eps_per_s = episode / elapsed if elapsed > 0 else 0.0
            print(
                f"ep {episode:>8,} | avg_r {avg_r:+.4f} | loss {avg_loss:.4f} "
                f"| ε {eps:.3f} | buf {len(agent.buffer):>6,} "
                f"| {eps_per_s:.0f} ep/s | {elapsed/60:.1f}min"
            )

        if episode % EVAL_INTERVAL == 0:
            metrics = evaluate(agent)
            print(
                f"  ↳ EVAL: avg_r {metrics['avg_reward']:+.4f} "
                f"| W {metrics['win_rate']:.3f} L {metrics['loss_rate']:.3f} P {metrics['push_rate']:.3f} "
                f"| actions hit/stand/double = "
                f"{metrics['action_dist'][0]:.2f}/{metrics['action_dist'][1]:.2f}/{metrics['action_dist'][2]:.2f}"
            )
            export_to_numpy(agent.policy_net, CHECKPOINT_PATH)

    print("\nFinal evaluation (20k episodes)...")
    metrics = evaluate(agent, num_episodes=20_000, seed=99999)
    print(
        f"  avg_reward (player edge): {metrics['avg_reward']:+.4f} "
        f"| win {metrics['win_rate']:.3f} | loss {metrics['loss_rate']:.3f} | push {metrics['push_rate']:.3f}"
    )

    smoke_test(agent)

    print(f"\nExporting model to {MODEL_PATH}...")
    export_to_numpy(agent.policy_net, MODEL_PATH)
    size_kb = os.path.getsize(MODEL_PATH) / 1024
    print(f"Saved ({size_kb:.1f} KB).")


if __name__ == "__main__":
    main()
