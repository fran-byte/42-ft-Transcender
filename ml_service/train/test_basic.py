#!/usr/bin/env python3
"""Quick sanity check of env and DQN without full training loop."""

import numpy as np
import torch
from env import BlackjackEnv
from dqn import DQNAgent

print("Testing environment...")
env = BlackjackEnv(seed=42)
state = env.reset()
print(f"  Initial state: {state}")

for i in range(10):
    mask = env.action_mask()
    action = np.random.choice(np.where(mask)[0])
    next_state, reward, done, info = env.step(action)
    print(f"    Step {i}: action={action}, reward={reward}, done={done}, next_state={next_state}")
    if done:
        break

print("\nTesting DQN agent...")
agent = DQNAgent(lr=1e-4, gamma=0.99, buffer_capacity=10000, batch_size=32)

for episode in range(10):
    state = env.reset()
    done = False
    steps = 0
    while not done:
        mask = env.action_mask()
        action = agent.select_action(state, mask, explore=True)
        next_state, reward, done, _ = env.step(action)
        mask_next = env.action_mask() if not done else np.array([True, True, False], dtype=bool)
        agent.push(state, action, reward, next_state, done, mask_next)
        state = next_state
        steps += 1

        if agent.env_step > 100:
            loss = agent.learn()
            if loss is not None:
                print(f"  ep {episode} step {steps}: loss={loss:.6f}, buffer_size={len(agent.buffer)}")
            break

print("\nDone! No crashes.")
