#!/usr/bin/env python3
"""
DQN Training Script for Blackjack AI using pure NumPy
Generates 500K states and trains a simple neural network model with gradient descent.
"""

import os
import sys
import random
import numpy as np


NUM_SAMPLES = 500_000
EPOCHS = 20
LEARNING_RATE = 0.001
MODEL_PATH = os.path.join(os.path.dirname(__file__), "blackjack_dqn.npz")


class NeuralNetwork:
    def __init__(self, input_dim=4, hidden_dim=32, output_dim=2):
        np.random.seed(42)
        self.W1 = np.random.randn(input_dim, hidden_dim) * 0.1
        self.b1 = np.zeros(hidden_dim)
        self.W2 = np.random.randn(hidden_dim, hidden_dim) * 0.1
        self.b2 = np.zeros(hidden_dim)
        self.W3 = np.random.randn(hidden_dim, output_dim) * 0.1
        self.b3 = np.zeros(output_dim)
    
    def relu(self, x):
        return np.maximum(0, x)
    
    def relu_derivative(self, x):
        return (x > 0).astype(float)
    
    def softmax(self, x):
        exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=1, keepdims=True)
    
    def forward(self, X):
        self.z1 = X @ self.W1 + self.b1
        self.a1 = self.relu(self.z1)
        self.z2 = self.a1 @ self.W2 + self.b2
        self.a2 = self.relu(self.z2)
        self.z3 = self.a2 @ self.W3 + self.b3
        return self.softmax(self.z3)
    
    def backward(self, X, y, output):
        m = X.shape[0]
        
        dz3 = output.copy()
        dz3[np.arange(m), y] -= 1
        dz3 /= m
        
        dW3 = self.a2.T @ dz3
        db3 = np.sum(dz3, axis=0)
        
        da2 = dz3 @ self.W3.T
        dz2 = da2 * self.relu_derivative(self.z2)
        
        dW2 = self.a1.T @ dz2
        db2 = np.sum(dz2, axis=0)
        
        da1 = dz2 @ self.W2.T
        dz1 = da1 * self.relu_derivative(self.z1)
        
        dW1 = X.T @ dz1
        db1 = np.sum(dz1, axis=0)
        
        self.W3 -= LEARNING_RATE * dW3
        self.b3 -= LEARNING_RATE * db3
        self.W2 -= LEARNING_RATE * dW2
        self.b2 -= LEARNING_RATE * db2
        self.W1 -= LEARNING_RATE * dW1
        self.b1 -= LEARNING_RATE * db1
    
    def train(self, X, y, epochs=EPOCHS, batch_size=2048):
        m = X.shape[0]
        indices = np.arange(m)
        
        for epoch in range(epochs):
            np.random.shuffle(indices)
            total_loss = 0
            correct = 0
            
            for start in range(0, m, batch_size):
                end = min(start + batch_size, m)
                batch_idx = indices[start:end]
                
                X_batch = X[batch_idx]
                y_batch = y[batch_idx]
                
                output = self.forward(X_batch)
                self.backward(X_batch, y_batch, output)
                
                pred = np.argmax(output, axis=1)
                correct += (pred == y_batch).sum()
                
                # Cross-entropy loss
                chosen_probs = output[np.arange(len(y_batch)), y_batch]
                loss = -np.mean(np.log(chosen_probs + 1e-10))
                total_loss += loss
            
            accuracy = 100 * correct / m
            avg_loss = total_loss / (m // batch_size + 1)
            print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%")
    
    def predict(self, X):
        output = self.forward(X)
        return np.argmax(output, axis=1)
    
    def predict_probs(self, X):
        output = self.forward(X)
        return output
    
    def save(self, path):
        np.savez(path, W1=self.W1, b1=self.b1, W2=self.W2, b2=self.b2, W3=self.W3, b3=self.b3)
        size_kb = os.path.getsize(path) / 1024
        print(f"Model saved to {path} ({size_kb:.1f} KB)")
    
    def load(self, path):
        data = np.load(path)
        self.W1 = data['W1']
        self.b1 = data['b1']
        self.W2 = data['W2']
        self.b2 = data['b2']
        self.W3 = data['W3']
        self.b3 = data['b3']


BASIC_STRATEGY = {
    (4, 2, False): "hit", (4, 3, False): "hit", (4, 4, False): "hit", (4, 5, False): "hit", (4, 6, False): "hit", (4, 7, False): "hit", (4, 8, False): "hit", (4, 9, False): "hit", (4, 10, False): "hit", (4, 11, False): "hit", (4, 12, False): "hit", (4, 13, False): "hit", (4, 14, False): "hit", (4, 15, False): "hit", (4, 16, False): "hit", (4, 17, False): "stand",
    (5, 2, False): "hit", (5, 3, False): "hit", (5, 4, False): "hit", (5, 5, False): "hit", (5, 6, False): "hit", (5, 7, False): "hit", (5, 8, False): "hit", (5, 9, False): "hit", (5, 10, False): "hit", (5, 11, False): "hit", (5, 12, False): "hit", (5, 13, False): "hit", (5, 14, False): "hit", (5, 15, False): "hit", (5, 16, False): "hit", (5, 17, False): "stand",
    (6, 2, False): "hit", (6, 3, False): "hit", (6, 4, False): "hit", (6, 5, False): "hit", (6, 6, False): "hit", (6, 7, False): "hit", (6, 8, False): "hit", (6, 9, False): "hit", (6, 10, False): "hit", (6, 11, False): "hit", (6, 12, False): "hit", (6, 13, False): "hit", (6, 14, False): "hit", (6, 15, False): "hit", (6, 16, False): "hit", (6, 17, False): "stand",
    (7, 2, False): "hit", (7, 3, False): "hit", (7, 4, False): "hit", (7, 5, False): "hit", (7, 6, False): "hit", (7, 7, False): "hit", (7, 8, False): "hit", (7, 9, False): "hit", (7, 10, False): "hit", (7, 11, False): "hit", (7, 12, False): "hit", (7, 13, False): "hit", (7, 14, False): "hit", (7, 15, False): "hit", (7, 16, False): "hit", (7, 17, False): "stand",
    (8, 2, False): "hit", (8, 3, False): "hit", (8, 4, False): "hit", (8, 5, False): "hit", (8, 6, False): "hit", (8, 7, False): "hit", (8, 8, False): "hit", (8, 9, False): "hit", (8, 10, False): "hit", (8, 11, False): "hit", (8, 12, False): "hit", (8, 13, False): "hit", (8, 14, False): "hit", (8, 15, False): "hit", (8, 16, False): "hit", (8, 17, False): "stand",
    (9, 2, False): "hit", (9, 3, False): "hit", (9, 4, False): "hit", (9, 5, False): "hit", (9, 6, False): "hit", (9, 7, False): "hit", (9, 8, False): "hit", (9, 9, False): "hit", (9, 10, False): "hit", (9, 11, False): "hit", (9, 12, False): "hit", (9, 13, False): "hit", (9, 14, False): "hit", (9, 15, False): "hit", (9, 16, False): "hit", (9, 17, False): "stand",
    (10, 2, False): "hit", (10, 3, False): "hit", (10, 4, False): "hit", (10, 5, False): "hit", (10, 6, False): "hit", (10, 7, False): "hit", (10, 8, False): "hit", (10, 9, False): "hit", (10, 10, False): "stand", (10, 11, False): "stand", (10, 12, False): "hit", (10, 13, False): "hit", (10, 14, False): "hit", (10, 15, False): "hit", (10, 16, False): "hit", (10, 17, False): "stand",
    (11, 2, False): "hit", (11, 3, False): "hit", (11, 4, False): "hit", (11, 5, False): "hit", (11, 6, False): "hit", (11, 7, False): "hit", (11, 8, False): "hit", (11, 9, False): "hit", (11, 10, False): "hit", (11, 11, False): "hit", (11, 12, False): "hit", (11, 13, False): "hit", (11, 14, False): "hit", (11, 15, False): "hit", (11, 16, False): "hit", (11, 17, False): "stand",
    (12, 2, False): "hit", (12, 3, False): "hit", (12, 4, False): "hit", (12, 5, False): "stand", (12, 6, False): "stand", (12, 7, False): "hit", (12, 8, False): "hit", (12, 9, False): "hit", (12, 10, False): "hit", (12, 11, False): "hit", (12, 12, False): "hit", (12, 13, False): "hit", (12, 14, False): "hit", (12, 15, False): "hit", (12, 16, False): "hit", (12, 17, False): "stand",
    (13, 2, False): "stand", (13, 3, False): "stand", (13, 4, False): "stand", (13, 5, False): "stand", (13, 6, False): "stand", (13, 7, False): "hit", (13, 8, False): "hit", (13, 9, False): "hit", (13, 10, False): "hit", (13, 11, False): "hit", (13, 12, False): "hit", (13, 13, False): "stand", (13, 14, False): "stand", (13, 15, False): "stand", (13, 16, False): "stand", (13, 17, False): "stand",
    (14, 2, False): "stand", (14, 3, False): "stand", (14, 4, False): "stand", (14, 5, False): "stand", (14, 6, False): "stand", (14, 7, False): "hit", (14, 8, False): "hit", (14, 9, False): "hit", (14, 10, False): "hit", (14, 11, False): "hit", (14, 12, False): "hit", (14, 13, False): "stand", (14, 14, False): "stand", (14, 15, False): "stand", (14, 16, False): "stand", (14, 17, False): "stand",
    (15, 2, False): "stand", (15, 3, False): "stand", (15, 4, False): "stand", (15, 5, False): "stand", (15, 6, False): "stand", (15, 7, False): "hit", (15, 8, False): "hit", (15, 9, False): "hit", (15, 10, False): "hit", (15, 11, False): "hit", (15, 12, False): "hit", (15, 13, False): "stand", (15, 14, False): "stand", (15, 15, False): "stand", (15, 16, False): "stand", (15, 17, False): "stand",
    (16, 2, False): "stand", (16, 3, False): "stand", (16, 4, False): "stand", (16, 5, False): "stand", (16, 6, False): "stand", (16, 7, False): "hit", (16, 8, False): "hit", (16, 9, False): "hit", (16, 10, False): "hit", (16, 11, False): "hit", (16, 12, False): "hit", (16, 13, False): "stand", (16, 14, False): "stand", (16, 15, False): "hit", (16, 16, False): "hit", (16, 17, False): "stand",
    (17, 2, False): "stand", (17, 3, False): "stand", (17, 4, False): "stand", (17, 5, False): "stand", (17, 6, False): "stand", (17, 7, False): "stand", (17, 8, False): "stand", (17, 9, False): "stand", (17, 10, False): "stand", (17, 11, False): "stand", (17, 12, False): "stand", (17, 13, False): "stand", (17, 14, False): "stand", (17, 15, False): "stand", (17, 16, False): "stand", (17, 17, False): "stand",
    (18, 2, False): "stand", (18, 3, False): "stand", (18, 4, False): "stand", (18, 5, False): "stand", (18, 6, False): "stand", (18, 7, False): "stand", (18, 8, False): "stand", (18, 9, False): "stand", (18, 10, False): "stand", (18, 11, False): "stand", (18, 12, False): "stand", (18, 13, False): "stand", (18, 14, False): "stand", (18, 15, False): "stand", (18, 16, False): "stand", (18, 17, False): "stand",
    (19, 2, False): "stand", (19, 3, False): "stand", (19, 4, False): "stand", (19, 5, False): "stand", (19, 6, False): "stand", (19, 7, False): "stand", (19, 8, False): "stand", (19, 9, False): "stand", (19, 10, False): "stand", (19, 11, False): "stand", (19, 12, False): "stand", (19, 13, False): "stand", (19, 14, False): "stand", (19, 15, False): "stand", (19, 16, False): "stand", (19, 17, False): "stand",
    (20, 2, False): "stand", (20, 3, False): "stand", (20, 4, False): "stand", (20, 5, False): "stand", (20, 6, False): "stand", (20, 7, False): "stand", (20, 8, False): "stand", (20, 9, False): "stand", (20, 10, False): "stand", (20, 11, False): "stand", (20, 12, False): "stand", (20, 13, False): "stand", (20, 14, False): "stand", (20, 15, False): "stand", (20, 16, False): "stand", (20, 17, False): "stand",
    (21, 2, False): "stand", (21, 3, False): "stand", (21, 4, False): "stand", (21, 5, False): "stand", (21, 6, False): "stand", (21, 7, False): "stand", (21, 8, False): "stand", (21, 9, False): "stand", (21, 10, False): "stand", (21, 11, False): "stand", (21, 12, False): "stand", (21, 13, False): "stand", (21, 14, False): "stand", (21, 15, False): "stand", (21, 16, False): "stand", (21, 17, False): "stand",
}


def get_optimal_action(player_score, dealer_card, usable_ace=False):
    key = (player_score, dealer_card, usable_ace)
    return BASIC_STRATEGY.get(key, "stand")


def generate_training_data(num_samples=NUM_SAMPLES, seed=42):
    random.seed(seed)
    
    X = np.zeros((num_samples, 4), dtype=np.float32)
    y = np.zeros(num_samples, dtype=np.int64)

    for i in range(num_samples):
        player_score = random.randint(4, 21)
        dealer_card = random.randint(2, 11)
        usable_ace = random.choice([True, False])
        true_count = random.randint(-5, 10)

        action = get_optimal_action(player_score, dealer_card, usable_ace)
        action_idx = 0 if action == "hit" else 1

        X[i] = [player_score, dealer_card, int(usable_ace), true_count]
        y[i] = action_idx

    return X, y


def main():
    print(f"Generating {NUM_SAMPLES:,} training samples...")
    X, y = generate_training_data(NUM_SAMPLES)

    print(f"X shape: {X.shape}, y shape: {y.shape}")
    print(f"Sample: {X[0]} -> {y[0]}")

    print("\nBuilding DQN model...")
    model = NeuralNetwork()

    print(f"\nTraining for {EPOCHS} epochs...")
    model.train(X, y, EPOCHS)

    print(f"\nSaving model...")
    model.save(MODEL_PATH)

    print("\nVerifying model...")
    test_cases = [
        [15, 9, 0, 2],
        [10, 10, 0, 0],
        [12, 5, 0, -2],
        [17, 7, 0, 5],
    ]
    
    actions = ["hit", "stand"]
    print("\nTest predictions:")
    for tc in test_cases:
        probs = model.predict_probs(np.array([tc]))[0]
        action = actions[np.argmax(probs)]
        print(f"  {tc} -> {action} ({probs})")

    print("\nTraining complete!")
    return MODEL_PATH


if __name__ == "__main__":
    main()