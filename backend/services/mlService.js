import http from 'http';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:5000';
const [ML_HOST, ML_PORT] = ML_SERVICE_URL.replace('http://', '').split(':');

export async function callMLServiceEnhanced(playerScore, dealerVisible, usableAce, trueCount, canDouble = false) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      player_score: playerScore,
      dealer_visible: dealerVisible,
      usable_ace: usableAce,
      true_count: trueCount,
      can_double: canDouble,
    });

    const options = {
      hostname: ML_HOST,
      port: Number(ML_PORT) || 5000,
      path: '/predict',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ action: 'stand', confidence: 0 }); }
      });
    });

    req.on('error', (err) => { req.destroy(); reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('ML service timeout')); });

    req.write(data);
    req.end();
  });
}

// Fallback cuando ml-service no está disponible — estrategia básica estándar.
export function basicStrategyFallback(playerScore, dealerVisible, usableAce, canDouble) {
  if (canDouble) {
    if (playerScore === 11) return 'double';
    if (playerScore === 10 && dealerVisible >= 2 && dealerVisible <= 9) return 'double';
    if (playerScore === 9 && dealerVisible >= 3 && dealerVisible <= 6) return 'double';
  }
  if (usableAce) {
    if (playerScore <= 17) return 'hit';
    if (playerScore === 18) return dealerVisible >= 9 ? 'hit' : 'stand';
    return 'stand';
  }
  if (playerScore <= 11) return 'hit';
  if (playerScore === 12) return [4, 5, 6].includes(dealerVisible) ? 'stand' : 'hit';
  if (playerScore <= 16) return dealerVisible <= 6 ? 'stand' : 'hit';
  return 'stand';
}
