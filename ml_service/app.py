from flask import Flask, request, jsonify
import numpy as np
import os

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "train", "blackjack_dqn.npz")

model = None

def load_model(path):
    global model
    if not os.path.exists(path):
        return None
    
    data = np.load(path)
    model = {
        'W1': data['W1'],
        'b1': data['b1'],
        'W2': data['W2'],
        'b2': data['b2'],
        'W3': data['W3'],
        'b3': data['b3']
    }
    return model

def relu(x):
    return np.maximum(0, x)

def softmax(x):
    exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
    return exp_x / np.sum(exp_x, axis=1, keepdims=True)

def predict_dqn(model, X):
    if model is None:
        return None
    
    X = np.array([X], dtype=np.float32)
    
    z1 = X @ model['W1'] + model['b1']
    a1 = relu(z1)
    z2 = a1 @ model['W2'] + model['b2']
    a2 = relu(z2)
    z3 = a2 @ model['W3'] + model['b3']
    output = softmax(z3)
    
    return output[0]

load_model(MODEL_PATH)


@app.route('/health', methods=['GET'])
def health():
    status = "healthy" if model is not None else "no model loaded"
    return jsonify({ 'status': status, 'model_loaded': model is not None })


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    if not data:
        return jsonify({ 'error': 'No data provided' }), 400

    player_score = data.get('player_score', 0)
    dealer_visible = data.get('dealer_visible')
    usable_ace = data.get('usable_ace', False)
    true_count = data.get('true_count', 0)

    if model is not None:
        X = [player_score, dealer_visible, int(usable_ace), true_count]
        probs = predict_dqn(model, X)
        action_idx = np.argmax(probs)
        action = "hit" if action_idx == 0 else "stand"
        confidence = float(probs[action_idx])
    else:
        action = "stand"
        confidence = 0.5

    return jsonify({
        'action': action,
        'confidence': confidence,
        'player_score': player_score,
        'dealer_visible': dealer_visible,
        'usable_ace': usable_ace,
        'true_count': true_count
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)