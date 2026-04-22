from flask import Flask, request, jsonify
import random

app = Flask(__name__)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'healthy' })


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    if not data:
        return jsonify({ 'error': 'No data provided' }), 400

    player_hand = data.get('player_hand', [])
    dealer_visible = data.get('dealer_visible')
    player_score = data.get('player_score', 0)

    action = random.choice(['hit', 'stand'])

    return jsonify({
        'action': action,
        'confidence': 0.5,
        'player_score': player_score,
        'dealer_visible': dealer_visible
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)