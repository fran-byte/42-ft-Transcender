import pool from '../db/pool.js';

export async function persistFinishedGame(game) {
  try {
    const dealerScore = game.calculateScore(game.dealerHand);

    for (const userId of game.playerOrder) {
      const player = game.players[userId];
      if (!player) continue;
      if (player.isAI) continue;

      await pool.query(
        `INSERT INTO game_history (user_id, room_id, room_name, result, bet, player_score, dealer_score, chips_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          game.id,
          game.roomName,
          player.result || 'unknown',
          player.bet || 0,
          player.score || 0,
          dealerScore || 0,
          player.chips || 0,
        ]
      );

      await pool.query(
        'UPDATE users SET balance = $1 WHERE id = $2',
        [player.chips || 0, userId]
      );
    }
  } catch (error) {
    if (import.meta.env.DEV) {
  console.log('❌ Error guardando historial:', error);}
  }
}
