"""
CUDA-vectorized Blackjack environment for DQN training.

All episode state lives on GPU — no CPU/GPU round-trips during stepping.
Drop-in replacement for VectorizedBlackjackEnv with the same public API:
    reset_all()        → states (N,5) float32 CUDA tensor
    step(actions_t)    → (states, rewards, dones, mask_nexts) CUDA tensors
    action_mask_all()  → (N,3) bool CUDA tensor

Rules: 6-deck shoe, S17, BJ pays 3:2, double first 2 cards only, no split.
State: [player_score, dealer_visible, usable_ace, true_count, can_double]
"""

import torch

TRUE_COUNT_CLIP = (-10.0, 15.0)
SHOE_SIZE = 312       # 6 decks × 52 cards
MAX_HAND  = 12        # max cards any hand can hold

# Card values and hi-lo counts for one 6-deck shoe.
# Card order: 2,3,4,5,6,7,8,9,10,J,Q,K,A repeated ×4 suits ×6 decks.
_VALS_DECK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11] * 4   # 52 cards
_HILO_DECK = [1, 1, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1, -1] * 4

_BASE_VALS = torch.tensor(_VALS_DECK * 6, dtype=torch.int32)   # (312,)
_BASE_HILO = torch.tensor(_HILO_DECK * 6, dtype=torch.int32)   # (312,)


# ---------------------------------------------------------------------------
# Vectorized hand utilities (all GPU, no loops over envs)
# ---------------------------------------------------------------------------

def _score(hand, size, device):
    """
    hand : (N, MAX_HAND) int32 — padded with 0
    size : (N,)          int32 — number of valid cards
    Returns (N,) int32 scores with aces optimally reduced.
    """
    mask  = torch.arange(MAX_HAND, device=device) < size.unsqueeze(1)
    total = (hand * mask).sum(1)
    aces  = ((hand == 11) & mask).sum(1)
    for _ in range(4):              # at most 4 aces per hand
        drop   = ((total > 21) & (aces > 0)).int()
        total -= drop * 10
        aces  -= drop
    return total


def _usable_ace(hand, size, device):
    """Returns (N,) bool — True if hand has a usable (soft) ace."""
    mask  = torch.arange(MAX_HAND, device=device) < size.unsqueeze(1)
    total = (hand * mask).sum(1)
    aces  = ((hand == 11) & mask).sum(1)
    soft  = aces > 0
    for _ in range(4):
        drop   = ((total > 21) & (aces > 0)).int()
        total -= drop * 10
        aces  -= drop
    return soft & (aces > 0) & (total <= 21)


def _natural_bj(hand, size):
    """Returns (N,) bool — exactly 2-card hand: one ace + one ten-value card."""
    two   = size == 2
    ace   = (hand[:, 0] == 11) | (hand[:, 1] == 11)
    ten   = (hand[:, 0] == 10) | (hand[:, 1] == 10)
    return two & ace & ten


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

class CUDABlackjackEnv:
    """N parallel blackjack games fully on GPU."""

    def __init__(self, n_envs: int, device: str = "cuda", penetration: float = 0.75):
        self.n_envs  = n_envs
        self.device  = device
        self.reshuffle_thresh = int(SHOE_SIZE * (1 - penetration))   # 78

        base_v = _BASE_VALS.to(device)
        base_h = _BASE_HILO.to(device)
        self._base_vals = base_v
        self._base_hilo = base_h

        # N independent shuffled shoes
        perms = torch.stack([torch.randperm(SHOE_SIZE, device=device) for _ in range(n_envs)])
        self.shoe_vals    = base_v[perms].clone()                               # (N, 312) int32
        self.shoe_hilo    = base_h[perms].clone()                               # (N, 312) int32
        self.shoe_pos     = torch.zeros(n_envs, dtype=torch.int64,  device=device)
        self.running_cnt  = torch.zeros(n_envs, dtype=torch.float32, device=device)

        # Hands (0-padded)
        self.ph  = torch.zeros(n_envs, MAX_HAND, dtype=torch.int32, device=device)  # player hand
        self.phs = torch.zeros(n_envs,           dtype=torch.int32, device=device)  # player hand size
        self.dh  = torch.zeros(n_envs, MAX_HAND, dtype=torch.int32, device=device)  # dealer hand
        self.dhs = torch.zeros(n_envs,           dtype=torch.int32, device=device)  # dealer hand size

        # Episode flags
        self.first_action = torch.zeros(n_envs, dtype=torch.bool, device=device)
        self.bet_doubled  = torch.zeros(n_envs, dtype=torch.bool, device=device)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _deal(self, idx, hand, hand_size):
        """Deal one card from each env's shoe into the given hand."""
        pos  = self.shoe_pos[idx]                         # (M,)
        vals = self.shoe_vals[idx, pos]                   # (M,)
        hilo = self.shoe_hilo[idx, pos].float()           # (M,)
        self.shoe_pos[idx]   += 1
        self.running_cnt[idx] -= hilo                     # remove dealt card from remaining count
        slot = hand_size[idx]                             # (M,) — position to write
        hand[idx, slot] = vals                            # element-wise advanced indexing
        hand_size[idx]  += 1

    def _reshuffle(self, idx):
        n     = idx.numel()
        perms = torch.stack([torch.randperm(SHOE_SIZE, device=self.device) for _ in range(n)])
        self.shoe_vals[idx]   = self._base_vals[perms]
        self.shoe_hilo[idx]   = self._base_hilo[perms]
        self.shoe_pos[idx]    = 0
        self.running_cnt[idx] = 0.0

    def _reset_envs(self, idx):
        need = (SHOE_SIZE - self.shoe_pos[idx]) < self.reshuffle_thresh
        if need.any():
            self._reshuffle(idx[need])
        self.ph[idx] = 0;  self.phs[idx] = 0
        self.dh[idx] = 0;  self.dhs[idx] = 0
        self.bet_doubled[idx]  = False
        self._deal(idx, self.ph, self.phs)   # player card 1
        self._deal(idx, self.ph, self.phs)   # player card 2
        self._deal(idx, self.dh, self.dhs)   # dealer card 1
        self._deal(idx, self.dh, self.dhs)   # dealer card 2
        self.first_action[idx] = True

    def _dealer_play(self, idx):
        """Hit dealer until score >= 17 (S17 rules)."""
        active = idx
        for _ in range(8):
            if active.numel() == 0:
                break
            sc      = _score(self.dh[active], self.dhs[active], self.device)
            to_deal = active[sc < 17]
            if to_deal.numel() == 0:
                break
            self._deal(to_deal, self.dh, self.dhs)
            active = to_deal   # re-check only those that just received a card

    def _resolve(self, idx):
        """Compute rewards for envs where the player hasn't busted."""
        doubled = self.bet_doubled[idx]
        pbj     = _natural_bj(self.ph[idx], self.phs[idx]) & ~doubled
        dbj     = _natural_bj(self.dh[idx], self.dhs[idx])

        # Dealer plays for normal (non-BJ) hands
        normal_idx = idx[~pbj & ~dbj]
        if normal_idx.numel():
            self._dealer_play(normal_idx)

        ps = _score(self.ph[idx], self.phs[idx], self.device).float()
        ds = _score(self.dh[idx], self.dhs[idx], self.device).float()

        r = torch.zeros(idx.numel(), device=self.device)

        both_bj   = pbj & dbj
        player_bj = pbj & ~dbj
        dealer_bj = ~pbj & dbj
        normal    = ~pbj & ~dbj

        r[player_bj] = 1.5
        r[dealer_bj] = -1.0
        # both_bj → 0 (already zero)

        if normal.any():
            ps_n  = ps[normal]
            ds_n  = ds[normal]
            dbl_n = doubled[normal]
            win   = (ds_n > 21) | (ps_n > ds_n)
            lose  = ps_n < ds_n
            r[normal] = torch.where(
                win,  torch.where(dbl_n,  torch.full_like(r[normal],  2.0),  torch.ones_like(r[normal])),
                torch.where(
                lose, torch.where(dbl_n,  torch.full_like(r[normal], -2.0), -torch.ones_like(r[normal])),
                torch.zeros_like(r[normal])))
        return r

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def reset_all(self):
        idx = torch.arange(self.n_envs, device=self.device)
        self._reset_envs(idx)
        return self._states()

    def action_mask_all(self):
        ones = torch.ones(self.n_envs, dtype=torch.bool, device=self.device)
        return torch.stack([ones, ones, self.first_action], dim=1)   # (N, 3)

    def step(self, actions):
        """
        actions : (N,) int64 CUDA tensor  (0=hit, 1=stand, 2=double)
        Returns  : (states, rewards, dones, mask_nexts) — all CUDA tensors
        """
        dev = self.device
        rewards = torch.zeros(self.n_envs, device=dev)
        dones   = torch.zeros(self.n_envs, dtype=torch.bool, device=dev)

        # Guard: double after first action → stand
        actions = actions.clone()
        actions[(actions == 2) & ~self.first_action] = 1

        # ---- HIT ----
        hit_idx = (actions == 0).nonzero(as_tuple=True)[0]
        if hit_idx.numel():
            self._deal(hit_idx, self.ph, self.phs)
            self.first_action[hit_idx] = False
            sc   = _score(self.ph[hit_idx], self.phs[hit_idx], dev)
            bust = sc > 21
            at21 = sc == 21
            if bust.any():
                b = hit_idx[bust];  rewards[b] = -1.0;  dones[b] = True
            if at21.any():
                a = hit_idx[at21];  rewards[a] = self._resolve(a);  dones[a] = True

        # ---- STAND ----
        stand_idx = (actions == 1).nonzero(as_tuple=True)[0]
        if stand_idx.numel():
            rewards[stand_idx] = self._resolve(stand_idx)
            dones[stand_idx]   = True

        # ---- DOUBLE ----
        dbl_idx = (actions == 2).nonzero(as_tuple=True)[0]
        if dbl_idx.numel():
            self.bet_doubled[dbl_idx] = True
            self._deal(dbl_idx, self.ph, self.phs)
            sc   = _score(self.ph[dbl_idx], self.phs[dbl_idx], dev)
            bust = sc > 21
            if bust.any():
                b = dbl_idx[bust];  rewards[b] = -2.0
            non_bust = dbl_idx[~bust]
            if non_bust.numel():
                rewards[non_bust] = self._resolve(non_bust)
            dones[dbl_idx] = True

        # Auto-reset finished envs
        done_idx = dones.nonzero(as_tuple=True)[0]
        if done_idx.numel():
            self._reset_envs(done_idx)

        return self._states(), rewards, dones.float(), self.action_mask_all()

    def _states(self):
        """Returns (N, 5) float32 CUDA state tensor."""
        ps  = _score(self.ph, self.phs, self.device).float()
        dv  = self.dh[:, 0].float()
        ua  = _usable_ace(self.ph, self.phs, self.device).float()
        rem = ((SHOE_SIZE - self.shoe_pos).float() / 52.0).clamp(min=0.5)
        tc  = (self.running_cnt / rem).clamp(*TRUE_COUNT_CLIP)
        cd  = self.first_action.float()
        return torch.stack([ps, dv, ua, tc, cd], dim=1)
