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
        q = v + (a - a.mean(dim=-1, keepdim=True))
        return q


class SumTree:
    def __init__(self, capacity):
        self.capacity = capacity
        self.tree = np.zeros(2 * capacity - 1, dtype=np.float64)
        self.size = 0
        self.write = 0

    def _propagate(self, idx, change):
        while idx != 0:
            idx = (idx - 1) // 2
            self.tree[idx] += change

    def update(self, idx, priority):
        change = priority - self.tree[idx]
        self.tree[idx] = priority
        self._propagate(idx, change)

    def add(self, priority):
        idx = self.write + self.capacity - 1
        self.update(idx, priority)
        data_idx = self.write
        self.write = (self.write + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)
        return data_idx, idx

    def get(self, s):
        idx = 0
        while idx < self.capacity - 1:
            left = 2 * idx + 1
            right = left + 1
            if s <= self.tree[left]:
                idx = left
            else:
                s -= self.tree[left]
                idx = right
        data_idx = idx - (self.capacity - 1)
        return idx, self.tree[idx], data_idx

    def total(self):
        return float(self.tree[0])


class PrioritizedReplayBuffer:
    def __init__(self, capacity, alpha=0.6):
        self.capacity = capacity
        self.alpha = alpha
        self.tree = SumTree(capacity)
        self.buffer = [None] * capacity
        self.max_priority = 1.0
        self.epsilon = 1e-6

    def push(self, state, action, reward, next_state, done, mask_next):
        priority = (self.max_priority + self.epsilon) ** self.alpha
        data_idx, _ = self.tree.add(priority)
        self.buffer[data_idx] = (state, action, reward, next_state, done, mask_next)

    def sample(self, batch_size, beta=0.4):
        if self.tree.size < batch_size:
            return None

        batch = []
        idxs = np.empty(batch_size, dtype=np.int64)
        priorities = np.empty(batch_size, dtype=np.float64)
        segment = self.tree.total() / batch_size

        for i in range(batch_size):
            s = np.random.uniform(segment * i, segment * (i + 1))
            tree_idx, p, data_idx = self.tree.get(s)
            data = self.buffer[data_idx]
            if data is None:
                # Fallback: sample uniformly from filled slots
                data_idx = np.random.randint(0, self.tree.size)
                data = self.buffer[data_idx]
                tree_idx = data_idx + (self.capacity - 1)
                p = self.tree.tree[tree_idx]
            batch.append(data)
            idxs[i] = tree_idx
            priorities[i] = p

        total = self.tree.total()
        sampling_probs = priorities / total if total > 0 else np.ones_like(priorities) / batch_size
        weights = (self.tree.size * sampling_probs) ** (-beta)
        weights = weights / weights.max()

        s_list, a_list, r_list, ns_list, d_list, nm_list = zip(*batch)
        states      = np.stack(s_list)
        actions     = np.array(a_list,  dtype=np.int64)
        rewards     = np.array(r_list,  dtype=np.float32)
        next_states = np.stack(ns_list)
        dones       = np.array(d_list,  dtype=np.float32)
        next_masks  = np.stack(nm_list)

        return states, actions, rewards, next_states, dones, next_masks, idxs, weights.astype(np.float32)

    def update_priorities(self, idxs, td_errors):
        errors = np.abs(td_errors)
        for idx, err in zip(idxs, errors):
            self.tree.update(int(idx), (err + self.epsilon) ** self.alpha)
        self.max_priority = max(self.max_priority, float(errors.max()))

    def __len__(self):
        return self.tree.size


class DQNAgent:
    def __init__(
        self,
        lr=1e-4,
        gamma=0.99,
        buffer_capacity=100_000,
        batch_size=256,
        target_sync_interval=1000,
        eps_start=1.0,
        eps_end=0.05,
        eps_decay_steps=500_000,
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

    def epsilon(self):
        progress = min(1.0, self.env_step / self.eps_decay_steps)
        return self.eps_start + (self.eps_end - self.eps_start) * progress

    def beta(self):
        progress = min(1.0, self.train_step / self.per_beta_steps)
        return self.per_beta_start + (self.per_beta_end - self.per_beta_start) * progress

    def select_action(self, state, mask, explore=True):
        """state: raw np.array (5,). mask: bool (3,). Returns int action."""
        valid_actions = np.where(mask)[0]
        if explore and np.random.random() < self.epsilon():
            return int(np.random.choice(valid_actions))
        x = torch.from_numpy(normalize_state(state)).unsqueeze(0).to(self.device)
        with torch.no_grad():
            q = self.policy_net(x).cpu().numpy()[0]
        q_masked = np.where(mask, q, -np.inf)
        return int(np.argmax(q_masked))

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

        states_n = normalize_state(states)
        next_states_n = normalize_state(next_states)

        s = torch.from_numpy(states_n).to(self.device)
        a = torch.from_numpy(actions).to(self.device)
        r = torch.from_numpy(rewards).to(self.device)
        s2 = torch.from_numpy(next_states_n).to(self.device)
        d = torch.from_numpy(dones).to(self.device)
        nm = torch.from_numpy(next_masks).to(self.device)
        w = torch.from_numpy(weights).to(self.device)

        q_pred = self.policy_net(s).gather(1, a.unsqueeze(1)).squeeze(1)

        with torch.no_grad():
            q_next_policy = self.policy_net(s2)
            q_next_policy = q_next_policy.masked_fill(~nm, float("-inf"))
            next_actions = q_next_policy.argmax(dim=1, keepdim=True)
            q_next_target = self.target_net(s2).gather(1, next_actions).squeeze(1)
            q_target = r + (1.0 - d) * self.gamma * q_next_target

        td_error = q_pred - q_target
        loss = (w * td_error.pow(2)).mean()

        self.optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.policy_net.parameters(), 10.0)
        self.optimizer.step()

        self.buffer.update_priorities(idxs, td_error.detach().cpu().numpy())
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
