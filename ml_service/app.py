from flask import Flask, request, jsonify
import numpy as np
import os

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "train", "blackjack_dqn.npz")

# MUST stay in sync with ml_service/train/dqn.py:NORM_RANGES
NORM_RANGES = {
    'player_score':   (4.0,   21.0),
    'dealer_visible': (2.0,   11.0),
    'usable_ace':     (0.0,    1.0),
    'true_count':    (-10.0,  15.0),
    'can_double':     (0.0,    1.0),
}

ACTION_NAMES = ["hit", "stand", "double"]
NUM_ACTIONS = 3

# Weight schema saved by dqn.export_to_numpy():
#   shared_W1 (5, 256)   shared_b1 (256,)
#   shared_W2 (256, 256) shared_b2 (256,)
#   value_W1  (256, 128) value_b1  (128,)
#   value_W2  (128, 1)   value_b2  (1,)
#   adv_W1    (256, 128) adv_b1    (128,)
#   adv_W2    (128, 3)   adv_b2    (3,)
WEIGHT_KEYS = [
    'shared_W1', 'shared_b1', 'shared_W2', 'shared_b2',
    'value_W1', 'value_b1', 'value_W2', 'value_b2',
    'adv_W1', 'adv_b1', 'adv_W2', 'adv_b2',
]

model = None


def normalize_input(player_score, dealer_visible, usable_ace, true_count, can_double):
    def scale(v, lo, hi):
        return (v - lo) / (hi - lo)
    return [
        scale(player_score,   *NORM_RANGES['player_score']),
        scale(dealer_visible, *NORM_RANGES['dealer_visible']),
        scale(usable_ace,     *NORM_RANGES['usable_ace']),
        scale(true_count,     *NORM_RANGES['true_count']),
        scale(can_double,     *NORM_RANGES['can_double']),
    ]


def load_model(path):
    global model
    if not os.path.exists(path):
        return None

    data = np.load(path)
    if not all(k in data.files for k in WEIGHT_KEYS):
        missing = [k for k in WEIGHT_KEYS if k not in data.files]
        print(f"WARNING: model file {path} has wrong format, missing keys: {missing}. Running without model.")
        return None

    model = {k: data[k] for k in WEIGHT_KEYS}
    return model


def relu(x):
    return np.maximum(0, x)


def softmax(x):
    x = np.asarray(x, dtype=np.float64)
    x = x - np.max(x)
    e = np.exp(x)
    return e / np.sum(e)


def forward_dueling(model, x):
    """x: shape (5,) — normalized features. Returns Q-values shape (3,)."""
    h = relu(x @ model['shared_W1'] + model['shared_b1'])
    h = relu(h @ model['shared_W2'] + model['shared_b2'])
    v = relu(h @ model['value_W1'] + model['value_b1'])
    v = v @ model['value_W2'] + model['value_b2']
    a = relu(h @ model['adv_W1'] + model['adv_b1'])
    a = a @ model['adv_W2'] + model['adv_b2']
    q = v + (a - a.mean())
    return q


def predict(model, player_score, dealer_visible, usable_ace, true_count, can_double):
    norm = normalize_input(
        player_score, dealer_visible,
        int(usable_ace), float(true_count), int(can_double),
    )
    x = np.array(norm, dtype=np.float32)
    q = forward_dueling(model, x)

    mask = np.array([True, True, bool(can_double)])
    q_masked = np.where(mask, q, -np.inf)
    action_idx = int(np.argmax(q_masked))

    probs = softmax(q_masked[mask] if mask.all() else q_masked)
    confidence = float(probs[action_idx]) if np.isfinite(probs[action_idx]) else 1.0
    return action_idx, confidence, q.tolist()


load_model(MODEL_PATH)


@app.route('/health', methods=['GET'])
def health():
    status = "healthy" if model is not None else "no model loaded"
    return jsonify({'status': status, 'model_loaded': model is not None})


@app.route('/predict', methods=['POST'])
def predict_endpoint():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        player_score   = int(data['player_score'])
        dealer_visible = int(data['dealer_visible'])
        usable_ace     = bool(data.get('usable_ace', False))
        true_count     = float(data.get('true_count', 0))
        can_double     = bool(data.get('can_double', False))
    except (KeyError, ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid input: {e}'}), 400

    if not (4 <= player_score <= 21):
        return jsonify({'error': 'player_score must be between 4 and 21'}), 400
    if not (2 <= dealer_visible <= 11):
        return jsonify({'error': 'dealer_visible must be between 2 and 11'}), 400

    if model is not None:
        action_idx, confidence, q_values = predict(
            model, player_score, dealer_visible, usable_ace, true_count, can_double,
        )
        action = ACTION_NAMES[action_idx]
    else:
        action = "stand"
        confidence = 0.5
        q_values = None

    return jsonify({
        'action':         action,
        'confidence':     confidence,
        'q_values':       q_values,
        'player_score':   player_score,
        'dealer_visible': dealer_visible,
        'usable_ace':     usable_ace,
        'true_count':     true_count,
        'can_double':     can_double,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
