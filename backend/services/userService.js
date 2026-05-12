import pool from '../db/pool.js';

export async function getUser(userId) {
  const result = await pool.query(
    'SELECT id, username, email, balance FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function getBalance(userId) {
  const result = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
  return result.rows[0] ? parseFloat(result.rows[0].balance) : null;
}

export async function updateBalance(userId, type, amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const err = new Error('amount inválido');
    err.status = 400;
    throw err;
  }

  if (!['deposit', 'withdraw'].includes(type)) {
    const err = new Error('type inválido');
    err.status = 400;
    throw err;
  }

  const current = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);

  if (current.rows.length === 0) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }

  const currentBalance = parseFloat(current.rows[0].balance);
  const newBalance = type === 'deposit'
    ? currentBalance + numericAmount
    : currentBalance - numericAmount;

  if (newBalance < 0) {
    const err = new Error('Saldo insuficiente');
    err.status = 400;
    throw err;
  }

  const result = await pool.query(
    'UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance',
    [newBalance, userId]
  );

  return parseFloat(result.rows[0].balance);
}

export async function getStats(userId) {
  const result = await pool.query(
    'SELECT games_played, games_won, games_lost, games_pushed, blackjacks FROM users WHERE id = $1',
    [userId]
  );
  if (!result.rows[0]) return null;
  const r = result.rows[0];
  return {
    gamesPlayed: parseInt(r.games_played) || 0,
    gamesWon: parseInt(r.games_won) || 0,
    gamesLost: parseInt(r.games_lost) || 0,
    gamesPushed: parseInt(r.games_pushed) || 0,
    blackjacks: parseInt(r.blackjacks) || 0,
  };
}

export async function updateStats(userId, { gamesPlayed, gamesWon, gamesLost, gamesPushed, blackjacks }) {
  await pool.query(
    `UPDATE users SET
      games_played = $1,
      games_won = $2,
      games_lost = $3,
      games_pushed = $4,
      blackjacks = $5
     WHERE id = $6`,
    [gamesPlayed, gamesWon, gamesLost, gamesPushed, blackjacks || 0, userId]
  );
}

export async function getHistory(userId) {
  const result = await pool.query(
    `SELECT room_id, room_name, result, bet, player_score, dealer_score, chips_after, played_at
     FROM game_history
     WHERE user_id = $1
     ORDER BY played_at DESC
     LIMIT 5`,
    [userId]
  );
  return result.rows.map((row) => ({
    roomId: row.room_id,
    roomName: row.room_name,
    result: row.result,
    bet: Number(row.bet),
    score: Number(row.player_score),
    dealerScore: Number(row.dealer_score),
    chipsAfter: Number(row.chips_after),
    playedAt: row.played_at,
  }));
}

export async function getLeaderboard() {
  const result = await pool.query(
    'SELECT id, username, balance FROM users ORDER BY balance DESC, username ASC LIMIT 3'
  );
  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    balance: Number(row.balance),
  }));
}
