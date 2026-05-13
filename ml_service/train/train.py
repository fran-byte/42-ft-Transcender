#!/usr/bin/env python3
"""
DQN training for Blackjack — v3 CUDA edition.

v3 improvements over v2:
  - Full GPU pipeline: CUDABlackjackEnv + GPU-native action selection (no CPU/GPU round-trips).
  - Larger network: 256/128 hidden units (vs 128/64).
  - N_ENVS 64 → 512, BATCH_SIZE 512 → 2048, TRAIN_PER_ITER 16 → 32.
  - Vectorized push_batch (O(1) buffer insertion vs O(N) loop).
  - LR decay 1e-4 → 1e-5, TARGET_SYNC 3000, PER_BETA over full training.
"""

import os
import time
from collections import deque
import numpy as np
import torch

from env import BlackjackEnv
from env_cuda import CUDABlackjackEnv
from dqn import DQNAgent, export_to_numpy, NUM_ACTIONS

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------- Hyperparameters ----------
TOTAL_ENV_STEPS = 2_000_000
N_ENVS          = 512
TRAIN_PER_ITER  = 32
WARMUP_STEPS    = 5_000

LR             = 1e-4
LR_END         = 1e-5
LR_DECAY_STEPS = 400_000          # decay over first ~400k train steps
GAMMA          = 0.99
BUFFER_CAPACITY = 200_000
BATCH_SIZE      = 2048
TARGET_SYNC     = 3_000

EPS_START      = 1.0
EPS_END        = 0.05
EPS_DECAY_STEPS = int(0.4 * TOTAL_ENV_STEPS)   # epsilon done at 40% of training

PER_ALPHA      = 0.6
PER_BETA_START = 0.4
PER_BETA_END   = 1.0
PER_BETA_STEPS = TOTAL_ENV_STEPS

LOG_INTERVAL_ITERS  = 200
EVAL_INTERVAL_ITERS = 500
EVAL_EPISODES       = 20_000
EVAL_N_ENVS         = 512

EARLY_STOP_PATIENCE  = 8
EARLY_STOP_MIN_DELTA = 0.003

SEED = 42
MODEL_PATH      = os.path.join(os.path.dirname(__file__), "blackjack_dqn.npz")
CHECKPOINT_PATH = MODEL_PATH.replace(".npz", "_ckpt.npz")
ACTION_NAMES    = ["hit", "stand", "double"]

NUM_ITERATIONS = TOTAL_ENV_STEPS // N_ENVS


# ---------- Vectorized greedy evaluation ----------

def evaluate(agent, num_episodes=EVAL_EPISODES, n_envs=EVAL_N_ENVS, seed=12345):
    """Greedy eval — fully on GPU."""
    vec    = CUDABlackjackEnv(n_envs=n_envs, device=DEVICE)
    states = vec.reset_all()

    rewards = []
    action_counts = np.zeros(NUM_ACTIONS, dtype=np.int64)

    while len(rewards) < num_episodes:
        masks   = vec.action_mask_all()
        actions = agent.select_action_batch_t(states, masks, explore=False)
        for a in actions.cpu().numpy():
            action_counts[int(a)] += 1
        next_states, step_rewards, dones, _ = vec.step(actions)
        done_mask = dones.bool()
        for r in step_rewards[done_mask].cpu().numpy():
            rewards.append(float(r))
        states = next_states

    rs = np.asarray(rewards[:num_episodes], dtype=np.float64)
    return {
        "avg_reward": float(rs.mean()),
        "se":         float(rs.std() / np.sqrt(len(rs))),
        "win_rate":  float((rs > 0.01).mean()),
        "loss_rate": float((rs < -0.01).mean()),
        "push_rate": float((np.abs(rs) <= 0.01).mean()),
        "action_dist": action_counts / max(1, action_counts.sum()),
    }


# ---------- Baseline ("hit until 17") ----------

def baseline_hit17(num_episodes=EVAL_EPISODES, seed=12345):
    """Naive policy: hit until score >= 17, never double. A floor every learner must beat."""
    env = BlackjackEnv(seed=seed)
    total = 0.0
    wins = losses = pushes = 0
    for _ in range(num_episodes):
        state = env.reset()
        done = False
        reward = 0.0
        while not done:
            action = 0 if state[0] < 17 else 1
            state, reward, done, _ = env.step(action)
        total += reward
        if reward > 0.01:
            wins += 1
        elif reward < -0.01:
            losses += 1
        else:
            pushes += 1
    return {
        "avg_reward": total / num_episodes,
        "win_rate":   wins   / num_episodes,
        "loss_rate":  losses / num_episodes,
        "push_rate":  pushes / num_episodes,
    }


def smoke_test(agent):
    """Sanity check that the trained policy makes sensible decisions on classic spots."""
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

    print(f"Device: {DEVICE.upper()} | N_ENVS={N_ENVS} | batch={BATCH_SIZE} | net=256/128")
    print(f"Vectorized env (N={N_ENVS}) | {NUM_ITERATIONS:,} iters × {N_ENVS} = {TOTAL_ENV_STEPS:,} env steps")
    print(f"Schedules: ε [{EPS_START}→{EPS_END}] over {EPS_DECAY_STEPS:,} env steps "
          f"| β [{PER_BETA_START}→{PER_BETA_END}] over {PER_BETA_STEPS:,} train steps")
    print(f"Eval: {EVAL_EPISODES:,} ep every {EVAL_INTERVAL_ITERS} iters "
          f"| early stop after {EARLY_STOP_PATIENCE} non-improving evals (Δ < {EARLY_STOP_MIN_DELTA})")

    print("\nBaseline (hit-until-17, never double):")
    b = baseline_hit17(num_episodes=EVAL_EPISODES, seed=99999)
    print(f"  avg_r {b['avg_reward']:+.4f} | W {b['win_rate']:.3f} L {b['loss_rate']:.3f} P {b['push_rate']:.3f}")

    vec_env = CUDABlackjackEnv(n_envs=N_ENVS, device=DEVICE)
    agent = DQNAgent(
        lr=LR,
        lr_end=LR_END,
        lr_decay_steps=LR_DECAY_STEPS,
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
        device=DEVICE,
    )

    states = vec_env.reset_all()    # (N, 5) CUDA tensor
    recent_losses = deque(maxlen=1_000)
    start_time = time.time()

    best_eval = -float("inf")
    best_eval_iter = 0
    patience = 0
    stopped_early = False

    for it in range(1, NUM_ITERATIONS + 1):
        masks   = vec_env.action_mask_all()                                    # (N, 3) CUDA bool
        actions = agent.select_action_batch_t(states, masks, explore=True)     # (N,)  CUDA int64
        next_states, rewards, dones, mask_nexts = vec_env.step(actions)

        # Batch push to numpy buffer (one GPU→CPU transfer per iteration)
        agent.push_batch(
            states.cpu().numpy(),
            actions.cpu().numpy(),
            rewards.cpu().numpy(),
            next_states.cpu().numpy(),
            dones.cpu().numpy(),
            mask_nexts.cpu().numpy(),
        )
        states = next_states

        if agent.env_step > WARMUP_STEPS:
            for _ in range(TRAIN_PER_ITER):
                loss = agent.learn()
                if loss is not None:
                    recent_losses.append(loss)

        if it % LOG_INTERVAL_ITERS == 0:
            elapsed = time.time() - start_time
            avg_loss = np.mean(recent_losses) if recent_losses else 0.0
            steps_per_s = agent.env_step / elapsed if elapsed > 0 else 0.0
            print(
                f"it {it:>5,}/{NUM_ITERATIONS:,} "
                f"| env {agent.env_step:>7,} | train {agent.train_step:>6,} "
                f"| loss {avg_loss:.4f} | |Q|max {agent.last_q_max:.2f} "
                f"| ε {agent.epsilon():.3f} | β {agent.beta():.3f} "
                f"| buf {len(agent.buffer):>6,} | {steps_per_s:.0f} env/s | {elapsed/60:.1f}m"
            )

        if it % EVAL_INTERVAL_ITERS == 0:
            m = evaluate(agent)
            print(
                f"  ↳ EVAL: avg_r {m['avg_reward']:+.4f} ± {m['se']:.4f} "
                f"| W {m['win_rate']:.3f} L {m['loss_rate']:.3f} P {m['push_rate']:.3f} "
                f"| h/s/d = "
                f"{m['action_dist'][0]:.2f}/{m['action_dist'][1]:.2f}/{m['action_dist'][2]:.2f}"
            )

            if m["avg_reward"] > best_eval + EARLY_STOP_MIN_DELTA:
                best_eval = m["avg_reward"]
                best_eval_iter = it
                patience = 0
                export_to_numpy(agent.policy_net, CHECKPOINT_PATH)
                print(f"  ✓ new best: {best_eval:+.4f} → checkpoint saved")
            else:
                patience += 1
                if patience >= EARLY_STOP_PATIENCE:
                    print(f"  ⏹ early stop: no improvement > {EARLY_STOP_MIN_DELTA} "
                          f"in {patience} evals (best {best_eval:+.4f} @ it {best_eval_iter:,})")
                    stopped_early = True
                    break

    if not stopped_early:
        print(f"\nReached max iterations. Best eval: {best_eval:+.4f} @ it {best_eval_iter:,}")

    # Restore the best checkpoint into the agent for final reporting.
    if os.path.exists(CHECKPOINT_PATH):
        ckpt = np.load(CHECKPOINT_PATH)
        sd = agent.policy_net.state_dict()
        sd["shared1.weight"]    = torch.from_numpy(ckpt["shared_W1"].T.copy())
        sd["shared1.bias"]      = torch.from_numpy(ckpt["shared_b1"].copy())
        sd["shared2.weight"]    = torch.from_numpy(ckpt["shared_W2"].T.copy())
        sd["shared2.bias"]      = torch.from_numpy(ckpt["shared_b2"].copy())
        sd["value_head1.weight"] = torch.from_numpy(ckpt["value_W1"].T.copy())
        sd["value_head1.bias"]   = torch.from_numpy(ckpt["value_b1"].copy())
        sd["value_head2.weight"] = torch.from_numpy(ckpt["value_W2"].T.copy())
        sd["value_head2.bias"]   = torch.from_numpy(ckpt["value_b2"].copy())
        sd["adv_head1.weight"]    = torch.from_numpy(ckpt["adv_W1"].T.copy())
        sd["adv_head1.bias"]      = torch.from_numpy(ckpt["adv_b1"].copy())
        sd["adv_head2.weight"]    = torch.from_numpy(ckpt["adv_W2"].T.copy())
        sd["adv_head2.bias"]      = torch.from_numpy(ckpt["adv_b2"].copy())
        agent.policy_net.load_state_dict(sd)

    print("\nFinal evaluation (best checkpoint, 30k episodes across 3 seeds)...")
    seeds = [99999, 12345, 7777]
    avg_rs = []
    for s in seeds:
        m = evaluate(agent, num_episodes=10_000, seed=s)
        print(f"  seed {s}: avg_r {m['avg_reward']:+.4f} ± {m['se']:.4f} "
              f"| W {m['win_rate']:.3f} L {m['loss_rate']:.3f} P {m['push_rate']:.3f}")
        avg_rs.append(m["avg_reward"])
    print(f"  mean across seeds: {np.mean(avg_rs):+.4f} (std {np.std(avg_rs):.4f})")

    print(f"\nBaseline avg_r: {b['avg_reward']:+.4f}  →  DQN improvement: "
          f"{np.mean(avg_rs) - b['avg_reward']:+.4f}")

    smoke_test(agent)

    print(f"\nExporting best model to {MODEL_PATH}...")
    export_to_numpy(agent.policy_net, MODEL_PATH)
    print(f"Saved ({os.path.getsize(MODEL_PATH) / 1024:.1f} KB).")


if __name__ == "__main__":
    main()
