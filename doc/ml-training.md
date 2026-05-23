# ML Training Pipeline — Methodology

Reinforcement Learning training pipeline for the Blackjack AI opponent. This document is the technical reference for the **Custom RL Training Pipeline** (Module of Choice — Major, IV.10) claimed in the README.

It describes **how the model is trained**, not how it is served at runtime. Runtime inference is covered by the AI Opponent module (IV.4) and lives in `ml_service/app.py` (NumPy-only Flask service).

---

## 1. Scope and motivation

The AI Opponent module only requires a competent player. A static **basic strategy lookup table** — ~200 lines, no learning, known-optimal for the rules we use — would satisfy it. We chose instead to train a Deep RL agent from scratch because:

- The training pipeline is the substantive engineering contribution of `ml_service/`, not the inference.
- It demonstrates RL methodology (off-policy stability, prioritized replay, GPU vectorization) that is independent of the gameplay surface.
- The runtime is intentionally **lean and decoupled** (NumPy only, no PyTorch) so the trained weights are the only artifact crossing the boundary.

---

## 2. Problem formulation

### State (5 features)

| Feature | Range | Meaning |
| --- | --- | --- |
| `player_score` | 4–21 | Best valid score of the player's hand |
| `dealer_visible` | 2–11 | Dealer's up-card value (Ace = 11) |
| `usable_ace` | 0/1 | Whether the player has a non-busted Ace counted as 11 |
| `true_count` | −10 to +15 | Hi-Lo running count divided by decks remaining |
| `can_double` | 0/1 | Whether DOUBLE is legal in the current state |

All features are normalized to `[0, 1]` using fixed ranges defined in `ml_service/train/dqn.py` (`NORM_RANGES`). The same ranges are mirrored in `ml_service/app.py` to guarantee inference parity.

### Action space (3 discrete actions)

`0 = HIT`, `1 = STAND`, `2 = DOUBLE`. The environment enforces legality through an action mask passed to the agent at every step.

### Reward

Profit & loss in units of initial bet at the end of the hand: −2 to +2 (with double), and +1.5 for a natural blackjack. Intermediate steps return 0.

### Environment rules

- Heads-up vs dealer, 6-deck shoe.
- Dealer **stands on soft 17** (S17).
- Blackjack pays **3:2**.
- Double on any two cards.
- **No split, no surrender, no insurance** (out of scope; not in the runtime either).

Implemented in `ml_service/train/env.py` (CPU reference) and `ml_service/train/env_cuda.py` (GPU-vectorized).

---

## 3. Algorithm

### 3.1 Dueling Double DQN (D3QN)

The Q-function is decomposed into a state-value `V(s)` and an advantage `A(s, a)`:

```
Q(s, a) = V(s) + ( A(s, a) − mean_a A(s, a) )
```

Implemented in `DuelingDQN` (`dqn.py`):

- Shared trunk: `5 → 256 → 256` (ReLU).
- Value head: `256 → 128 → 1`.
- Advantage head: `256 → 128 → 3`.

Two networks are kept: a **policy network** updated by gradient descent and a **target network** synchronized every `TARGET_SYNC = 3000` training steps.

**Double DQN** is used in the TD target to mitigate Q-value overestimation: the policy network selects the next action, the target network evaluates it.

```
a*       = argmax_a Q_policy(s', a)
target   = r + (1 − done) · γ · Q_target(s', a*)
td_error = Q_policy(s, a) − target
```

### 3.2 Prioritized Experience Replay (PER)

Replay buffer (`PrioritizedReplayBuffer` in `dqn.py`) stores `(s, a, r, s', done, mask_next)` tuples with priorities `p_i ∝ |TD_i|^α`.

- `α = 0.6` (priority exponent).
- `β = 0.4 → 1.0` linearly over training (importance-sampling bias correction).
- Stratified sampling over the cumulative priority distribution (no SumTree — flat NumPy `cumsum` + `searchsorted`, fully vectorized).
- Vectorized `push_batch` inserts the 512 transitions from each iteration at once (O(1) instead of O(N) Python loop).

### 3.3 Loss

Importance-sampling-weighted MSE on the TD error, gradient clipped to ‖·‖₂ = 10:

```
loss = mean( w_i · (Q_policy(s_i, a_i) − target_i)² )
```

---

## 4. Training pipeline

### 4.1 GPU-vectorized environment

`CUDABlackjackEnv` (`env_cuda.py`) runs **512 parallel Blackjack hands** entirely on the GPU as PyTorch tensors. Action selection (`select_action_batch_t` in `dqn.py`) consumes those tensors directly — no CPU↔GPU round-trips on the hot path.

Compared with the CPU-only baseline (`BlackjackEnv` in `env.py`), this provides roughly an order of magnitude higher throughput, which is what makes the 2 M-step budget feasible.

### 4.2 Hyperparameters (`train.py`)

| Parameter | Value | Notes |
| --- | --- | --- |
| Total environment steps | 2,000,000 | ~3,900 iterations × 512 envs |
| Parallel envs | 512 | GPU-vectorized |
| Train steps per iter | 32 | Off-policy updates |
| Warmup steps | 5,000 | Random policy fills buffer |
| Batch size | 2,048 | Sampled from PER |
| Replay buffer capacity | 200,000 | Circular |
| Discount γ | 0.99 | |
| Learning rate | 1e-4 → 1e-5 | Linear decay over first 400k train steps |
| Target sync interval | 3,000 | Hard copy |
| ε (exploration) | 1.0 → 0.05 | Linear over first 40% of training |
| PER α | 0.6 | Priority exponent |
| PER β | 0.4 → 1.0 | Linear over full run |
| Network | 256/256 shared, 128 heads | Dueling architecture |
| Optimizer | Adam | Grad clip ‖·‖₂ = 10 |
| Seed | 42 | |

### 4.3 Training loop

For each of `~3,900` iterations:

1. **Roll out** 512 parallel hands one step each on the GPU; collect 512 transitions.
2. **Push** the full batch into the PER buffer (single vectorized op).
3. **Learn** `TRAIN_PER_ITER = 32` times: sample 2,048 transitions weighted by priority, compute Double-DQN TD target, take a gradient step, update priorities from the new TD errors.
4. **Sync** target network every 3,000 train steps.
5. **Log** every 200 iterations, **evaluate** every 500 iterations (20,000 greedy hands).
6. **Early stop** if eval mean reward has not improved by ≥ 0.003 in the last 8 evaluations.

### 4.4 Evaluation during training

Greedy evaluation on a fresh `CUDABlackjackEnv` instance, 20,000 hands. Reports `avg_reward`, win/loss/push rates, action distribution. Best checkpoint by `avg_reward` is exported.

---

## 5. Train / inference separation

This is the design choice that justifies the module as MLOps work rather than as a duplicate of AI Opponent.

| Concern | Training | Inference |
| --- | --- | --- |
| Container | `ml_service/Dockerfile.train` | `ml_service/Dockerfile` |
| Base image | `pytorch/pytorch:2.3.1-cuda12.1-cudnn8-runtime` | Slim Python |
| Dependencies | PyTorch, CUDA, NumPy | NumPy, Flask |
| GPU required | Yes (CUDA) | No |
| Code entrypoint | `ml_service/train/train.py` | `ml_service/app.py` |
| Artifact crossing the boundary | `blackjack_dqn.npz` | — |
| Algorithm | D3QN + PER training | Forward pass only |

`export_to_numpy` in `dqn.py` serializes the policy network weights as a flat `.npz` with explicit keys (`shared_W1`, `shared_b1`, …) that `app.py` reads directly into NumPy arrays. There is **no PyTorch import in the inference container**.

---

## 6. Reproducibility

A complete retraining is one command:

```bash
make train
```

This builds the training image (if not cached) and runs `python ml_service/train/train.py` inside it, which:

1. Initializes the agent (fixed seed `SEED = 42`).
2. Runs the full training loop with periodic checkpointing to `blackjack_dqn_ckpt.npz`.
3. Exports the best model by eval reward to `blackjack_dqn.npz`.
4. Prints a final smoke test (see §7).

The artifact `ml_service/train/blackjack_dqn.npz` is what the inference container loads at startup.

---

## 7. Results

The pipeline reaches the practical optimum for the rules in use. Blackjack with these rules has a **known house edge of ~0.5%**, so a near-zero mean reward is the theoretical ceiling for any policy — no learner can be positive.

- Trained mean reward: ≈ **−0.0186 per hand** (close to the optimal house-edge floor).
- Smoke test (10 hand-picked Blackjack textbook spots, comparing the policy against basic strategy): **10/10** correct on the latest checkpoint.

Compared to a naive "hit until 17, never double" baseline (`baseline_hit17` in `train.py`), the agent learns to:

- Use the player's hard/soft distinction.
- Double down on favorable 9/10/11 totals against weak dealer cards.
- Stand on stiff hands (12–16) against weak dealer up-cards.
- Bias hit/stand slightly with the true count (the only state feature that goes beyond basic strategy).

A side-by-side comparison against basic strategy and random over 20k hands is provided by `ml_service/train/evaluate.py` (see the script for exact numbers; they are deterministic given `SEED = 42`).

---

## 8. Limitations and honest caveats

- **No split, no surrender.** Both would expand the action space; the runtime does not expose them either, so out of scope.
- **True count is observed, not estimated.** The environment hands the agent the true count directly. A more realistic setting would require the agent to estimate it from a card-history feature.
- **CPU-only training would also converge**, just much slower. The CUDA path is an engineering optimization, not an algorithmic requirement.
- **House edge floor.** No RL policy can be positive-expected-value at S17 / 6-deck / no surrender / no split. The training target is "as close to zero as possible," not "win the casino."
- **The runtime is deterministic** (greedy argmax over masked actions). It does not simulate human-like noise; that was a deliberate trade-off in favor of consistent behavior at evaluation time.

---

## 9. File map

```
ml_service/
├── Dockerfile              # inference image (NumPy + Flask)
├── Dockerfile.train        # training image (PyTorch + CUDA)
├── app.py                  # inference runtime (no PyTorch)
└── train/
    ├── train.py            # training loop + evaluation + smoke test
    ├── dqn.py              # DuelingDQN, PER, DQNAgent, export_to_numpy
    ├── env.py              # CPU reference environment
    ├── env_cuda.py         # GPU-vectorized environment (512 envs)
    ├── evaluate.py         # offline DQN vs basic strategy vs random
    ├── test_basic.py       # unit smoke checks
    └── blackjack_dqn.npz   # exported weights (the artifact)
```

---

## 10. Why this is a Major (not a Minor)

- **Scale.** ~1,200 lines of training-side code (`train.py`, `dqn.py`, `env.py`, `env_cuda.py`), plus the evaluation harness.
- **Algorithmic depth.** D3QN, PER, target networks, importance sampling, and bias correction implemented from scratch — not wired together from `stable-baselines3`.
- **Two distinct engineering artifacts.** Each one of {CUDA-vectorized environment, custom PER buffer, dueling architecture, train/inference separation with NumPy export} is substantive on its own.
- **End-to-end reproducibility.** `make train` rebuilds the container and produces a new model from scratch — not a script glued together by a `requirements.txt`.

Subject reference: **IV.10 — Major: Modules of choice**.
