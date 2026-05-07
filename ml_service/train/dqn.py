"""
Dueling Double DQN with Prioritized Experience Replay for Blackjack.

Trains in PyTorch (CPU). Exports weights to NumPy .npz so the production
inference service (ml_service/app.py) can load them without PyTorch.
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


# Must match ml_service/app.py exactly
NORM_RANGES = {
    "player_score":   (4.0, 21.0),
    "dealer_visible": (2.0, 11.0),
    "usable_ace":     (0.0,  1.0),
    "true_count":     (-10.0, 15.0),
    "can_double":     (0.0,  1.0),
}

NUM_ACTIONS = 3  # 0=HIT, 1=STAND, 2=DOUBLE
NUM_FEATURES = 5

SHARED_HIDDEN = 128
HEAD_HIDDEN = 64

_KEYS = ["player_score", "dealer_visible", "usable_ace", "true_count", "can_double"]
_NORM_LO = np.array([NORM_RANGES[k][0] for k in _KEYS], dtype=np.float32)
_NORM_HI = np.array([NORM_RANGES[k][1] for k in _KEYS], dtype=np.float32)


def normalize_state(state):
    """state: np.array shape (5,) or (B, 5) of raw values. Returns same shape, scaled to [0,1]."""
    return (state - _NORM_LO) / (_NORM_HI - _NORM_LO)


class DuelingDQN(nn.Module):
    def __init__(self, in_dim=NUM_FEATURES, shared_hidden=SHARED_HIDDEN,
                 head_hidden=HEAD_HIDDEN, num_actions=NUM_ACTIONS):
        super().__init__()
        self.shared1 = nn.Linear(in_dim, shared_hidden)
        self.shared2 = nn.Linear(shared_hidden, shared_hidden)
        self.value_head1 = nn.Linear(shared_hidden, head_hidden)
        self.value_head2 = nn.Linear(head_hidden, 1)
        self.adv_head1 = nn.Linear(shared_hidden, head_hidden)
        self.adv_head2 = nn.Linear(head_hidden, num_actions)

    def forward(self, x):
        h = F.relu(self.shared1(x))
        h = F.relu(self.shared2(h))
        v = F.relu(self.value_head1(h))
        v = self.value_head2(v)
        a = F.relu(self.adv_head1(h))
        a = self.adv_head2(a)
        return v + (a - a.mean(dim=-1, keepdim=True))


class PrioritizedReplayBuffer:
    """Proportional PER backed by a flat priorities array sampled with cumsum.

    Algorithmically identical to a SumTree-backed PER (priority ∝ |TD|^alpha,
    IS weights with β annealing) but vectorized in NumPy — no per-sample
    Python loop on the sampling path.
    """

    def __init__(self, capacity, alpha=0.6, epsilon=1e-6):
        self.capacity = capacity
        self.alpha = alpha
        self.epsilon = epsilon
        self.priorities = np.zeros(capacity, dtype=np.float64)
        self.states      = np.zeros((capacity, NUM_FEATURES), dtype=np.float32)
        self.actions     = np.zeros(capacity, dtype=np.int64)
        self.rewards     = np.zeros(capacity, dtype=np.float32)
        self.next_states = np.zeros((capacity, NUM_FEATURES), dtype=np.float32)
        self.dones       = np.zeros(capacity, dtype=np.float32)
        self.next_masks  = np.zeros((capacity, NUM_ACTIONS), dtype=bool)
        self.size = 0
        self.write = 0
        self.max_priority = 1.0

    def push(self, state, action, reward, next_state, done, mask_next):
        i = self.write
        self.states[i]      = state
        self.actions[i]     = action
        self.rewards[i]     = reward
        self.next_states[i] = next_state
        self.dones[i]       = done
        self.next_masks[i]  = mask_next
        self.priorities[i]  = (self.max_priority + self.epsilon) ** self.alpha
        self.write = (self.write + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size, beta=0.4):
        if self.size < batch_size:
            return None

        prios = self.priorities[:self.size]
        cum = np.cumsum(prios)
        total = cum[-1]
        # Stratified sampling: one uniform draw per equal-probability segment.
        segment = total / batch_size
        u = np.random.uniform(0.0, segment, batch_size) + np.arange(batch_size) * segment
        idxs = np.searchsorted(cum, u).clip(max=self.size - 1)

        sampling_probs = prios[idxs] / total
        weights = (self.size * sampling_probs) ** (-beta)
        weights = (weights / weights.max()).astype(np.float32)

        return (
            self.states[idxs],
            self.actions[idxs],
            self.rewards[idxs],
            self.next_states[idxs],
            self.dones[idxs],
            self.next_masks[idxs],
            idxs,
            weights,
        )

    def update_priorities(self, idxs, td_errors):
        errors = np.abs(td_errors).astype(np.float64)
        self.priorities[idxs] = (errors + self.epsilon) ** self.alpha
        m = float(errors.max())
        if m > self.max_priority:
            self.max_priority = m

    def __len__(self):
        return self.size


class DQNAgent:
    def __init__(
        self,
        lr=1e-4,
        gamma=0.99,
        buffer_capacity=100_000,
        batch_size=256,
        target_sync_interval=2000,
        eps_start=1.0,
        eps_end=0.05,
        eps_decay_steps=800_000,
        per_alpha=0.6,
        per_beta_start=0.4,
        per_beta_end=1.0,
        per_beta_steps=1_000_000,
        device="cpu",
    ):
        self.gamma = gamma
        self.batch_size = batch_size
        self.target_sync_interval = target_sync_interval
        self.eps_start = eps_start
        self.eps_end = eps_end
        self.eps_decay_steps = eps_decay_steps
        self.per_beta_start = per_beta_start
        self.per_beta_end = per_beta_end
        self.per_beta_steps = per_beta_steps
        self.device = device

        self.policy_net = DuelingDQN().to(device)
        self.target_net = DuelingDQN().to(device)
        self.target_net.load_state_dict(self.policy_net.state_dict())
        self.target_net.eval()

        self.optimizer = torch.optim.Adam(self.policy_net.parameters(), lr=lr)
        self.buffer = PrioritizedReplayBuffer(buffer_capacity, alpha=per_alpha)
        self.train_step = 0
        self.env_step = 0
        self.last_q_max = 0.0  # |Q|.max from the most recent learn() call (drift diagnostic)

    def epsilon(self):
        progress = min(1.0, self.env_step / self.eps_decay_steps)
        return self.eps_start + (self.eps_end - self.eps_start) * progress

    def beta(self):
        progress = min(1.0, self.train_step / self.per_beta_steps)
        return self.per_beta_start + (self.per_beta_end - self.per_beta_start) * progress

    def select_action_batch(self, states, masks, explore=True):
        """states: (B, 5) raw. masks: (B, 3) bool. Returns int64 array (B,)."""
        x = torch.from_numpy(normalize_state(states).astype(np.float32))
        with torch.no_grad():
            q = self.policy_net(x).numpy()
        q_masked = np.where(masks, q, -np.inf)
        greedy = q_masked.argmax(axis=1)

        if not explore:
            return greedy.astype(np.int64)

        eps = self.epsilon()
        explore_mask = np.random.random(len(states)) < eps
        if not explore_mask.any():
            return greedy.astype(np.int64)

        # For each exploring sample, pick uniformly among valid actions.
        random_actions = np.empty(len(states), dtype=np.int64)
        for i in np.where(explore_mask)[0]:
            valid = np.flatnonzero(masks[i])
            random_actions[i] = np.random.choice(valid)
        return np.where(explore_mask, random_actions, greedy).astype(np.int64)

    def select_action(self, state, mask, explore=True):
        """Single-state convenience wrapper used by evaluation and smoke tests."""
        a = self.select_action_batch(state[None, :], mask[None, :], explore=explore)
        return int(a[0])

    def push(self, state, action, reward, next_state, done, mask_next):
        self.buffer.push(state, action, reward, next_state, done, mask_next)
        self.env_step += 1

    def learn(self):
        if len(self.buffer) < self.batch_size:
            return None

        sample = self.buffer.sample(self.batch_size, beta=self.beta())
        if sample is None:
            return None
        states, actions, rewards, next_states, dones, next_masks, idxs, weights = sample

        s  = torch.from_numpy(normalize_state(states))
        s2 = torch.from_numpy(normalize_state(next_states))
        a  = torch.from_numpy(actions)
        r  = torch.from_numpy(rewards)
        d  = torch.from_numpy(dones)
        nm = torch.from_numpy(next_masks)
        w  = torch.from_numpy(weights)

        q_pred = self.policy_net(s).gather(1, a.unsqueeze(1)).squeeze(1)

        with torch.no_grad():
            q_next_policy = self.policy_net(s2).masked_fill(~nm, float("-inf"))
            next_actions = q_next_policy.argmax(dim=1, keepdim=True)
            q_next_target = self.target_net(s2).gather(1, next_actions).squeeze(1)
            q_target = r + (1.0 - d) * self.gamma * q_next_target

        td_error = q_pred - q_target
        loss = (w * td_error.pow(2)).mean()
        self.last_q_max = float(q_pred.detach().abs().max().item())

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), 10.0)
        self.optimizer.step()

        self.buffer.update_priorities(idxs, td_error.detach().numpy())
        self.train_step += 1

        if self.train_step % self.target_sync_interval == 0:
            self.target_net.load_state_dict(self.policy_net.state_dict())

        return float(loss.item())


def export_to_numpy(model: DuelingDQN, path: str):
    """Save weights as .npz with keys readable by the production NumPy inference in app.py."""
    sd = model.state_dict()
    np.savez(
        path,
        shared_W1=sd["shared1.weight"].cpu().numpy().T,
        shared_b1=sd["shared1.bias"].cpu().numpy(),
        shared_W2=sd["shared2.weight"].cpu().numpy().T,
        shared_b2=sd["shared2.bias"].cpu().numpy(),
        value_W1=sd["value_head1.weight"].cpu().numpy().T,
        value_b1=sd["value_head1.bias"].cpu().numpy(),
        value_W2=sd["value_head2.weight"].cpu().numpy().T,
        value_b2=sd["value_head2.bias"].cpu().numpy(),
        adv_W1=sd["adv_head1.weight"].cpu().numpy().T,
        adv_b1=sd["adv_head1.bias"].cpu().numpy(),
        adv_W2=sd["adv_head2.weight"].cpu().numpy().T,
        adv_b2=sd["adv_head2.bias"].cpu().numpy(),
    )
