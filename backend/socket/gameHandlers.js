import BlackjackGame from '../game/BlackjackGame.js';
import ROOM_CONFIGS from '../game/roomConfigs.js';
import { persistFinishedGame } from '../services/gameService.js';
import { emitLobbyState } from './lobbyHandlers.js';
import pool from '../db/pool.js';

export function registerGameHandlers(io, socket, games) {
  let currentUserId = null;
  let currentRoomId = null;

  const emitUpdate = (roomId, game) => {
    io.to(roomId).emit('game_update', game.getPublicState());
  };

  socket.on('sync_wallet_balance', ({ roomId, userId, balance }) => {
    try {
      const game = games[roomId];
      if (!game) return;
      if (!currentUserId || String(currentUserId) !== String(userId)) return;

      const ok = game.updatePlayerWallet(userId, Number(balance));
      if (!ok) return;

      emitUpdate(roomId, game);
      emitLobbyState(io, games);
    } catch (error) {
      console.error('❌ Error en sync_wallet_balance:', error);
    }
  });

  socket.on('join_game', async ({ roomId, user, preferredRole }) => {
    try {
      if (!roomId || !user || !user.id || !user.username) {
        console.error('❌ Intento de join_game inválido');
        return;
      }

      const roomConfig = ROOM_CONFIGS[roomId];
      if (!roomConfig) {
        console.error(`❌ Room inválida: ${roomId}`);
        socket.emit('join_result', { success: false, reason: 'invalid_room' });
        return;
      }

      currentUserId = user.id;
      currentRoomId = roomId;

      if (!games[roomId]) {
        games[roomId] = new BlackjackGame(
          roomId,
          (gameState) => { io.to(roomId).emit('game_update', gameState); },
          roomConfig
        );
        console.log(`✨ Sala creada: ${roomId} (maxPlayers=${roomConfig.maxPlayers})`);
      }

      const game = games[roomId];
      socket.join(roomId);

      const balanceResult = await pool.query(
        'SELECT balance FROM users WHERE id = $1',
        [user.id]
      );
      const dbBalance = balanceResult.rows.length > 0
        ? Number(balanceResult.rows[0].balance)
        : 0;

      const joinResult = game.addPlayer(
        user.id, socket.id, user.username,
        user.avatar || null, preferredRole || 'player', dbBalance
      );

      socket.emit('join_result', {
        ...joinResult,
        roomConfig: {
          roomId: roomConfig.id,
          roomName: roomConfig.roomName,
          maxPlayers: roomConfig.maxPlayers,
          minBet: roomConfig.minBet,
          maxBet: roomConfig.maxBet,
          mode: roomConfig.mode,
        },
      });

      console.log(`✅ ${user.username} (${user.id}) unido a ${roomId} como ${joinResult.role}`);

      emitUpdate(roomId, game);
      emitLobbyState(io, games);
    } catch (error) {
      console.error('❌ Error en join_game:', error);
    }
  });

  socket.on('start_round', (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const hostId = game.playerOrder[0];
      if (currentUserId !== hostId) {
        console.log(`⛔ ${currentUserId} intentó iniciar la ronda sin ser host`);
        return;
      }

      if (!game.players[currentUserId]) {
        console.log(`⛔ ${currentUserId} no es jugador de la mesa`);
        return;
      }

      if (!game.canStartRound()) {
        console.log('⛔ No se puede iniciar: faltan apuestas');
        return;
      }

      console.log(`🃏 START ROUND por host: ${currentUserId} en sala ${roomId}`);
      game.startRound(currentUserId);
      emitUpdate(roomId, game);
      emitLobbyState(io, games);
    } catch (error) {
      console.error('❌ Error en start_round:', error);
    }
  });

  socket.on('action_hit', async (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ HIT ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`👊 HIT de usuario: ${currentUserId}`);
      const wasFinished = game.gameState === 'finished';

      game.hit(currentUserId);
      emitUpdate(roomId, game);

      if (!wasFinished && game.gameState === 'finished') {
        await persistFinishedGame(game);
      }
    } catch (error) {
      console.error('❌ Error en action_hit:', error);
    }
  });

  socket.on('action_stand', async (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ STAND ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`✋ STAND de usuario: ${currentUserId}`);
      const wasFinished = game.gameState === 'finished';

      game.stand(currentUserId);
      emitUpdate(roomId, game);

      if (!wasFinished && game.gameState === 'finished') {
        await persistFinishedGame(game);
      }
    } catch (error) {
      console.error('❌ Error en action_stand:', error);
    }
  });

  socket.on('reset_round', (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const hostId = game.playerOrder[0];
      if (currentUserId !== hostId) {
        console.log(`⛔ ${currentUserId} intentó resetear la ronda sin ser host`);
        return;
      }

      console.log(`🔄 RESET ROUND por host: ${currentUserId} en sala ${roomId}`);
      game.resetRound();
      emitUpdate(roomId, game);
      emitLobbyState(io, games);
    } catch (error) {
      console.error('❌ Error en reset_round:', error);
    }
  });

  socket.on('place_bet', ({ roomId, amount }) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const numericAmount = Number(amount);
      const ok = game.placeBet(currentUserId, numericAmount);

      if (!ok) {
        const player = game.players[currentUserId];
        console.log('⛔ Bet rechazada', { roomId, currentUserId, amount: numericAmount });
        socket.emit('bet_error', {
          success: false,
          message: 'Invalid bet for this table or insufficient chips.',
          minBet: game.minBet,
          maxBet: game.maxBet,
          chips: player?.chips ?? 0,
          currentBet: player?.bet ?? 0,
        });
        return;
      }

      emitUpdate(roomId, game);
    } catch (error) {
      console.error('❌ Error en place_bet:', error);
    }
  });

  socket.on('clear_bet', (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const ok = game.clearBet(currentUserId);
      if (!ok) return;

      emitUpdate(roomId, game);
    } catch (error) {
      console.error('❌ Error en clear_bet:', error);
    }
  });

  socket.on('leave_room', (roomId) => {
    try {
      if (!roomId || !currentUserId) return;
      const game = games[roomId];
      if (game) {
        game.removePlayer(currentUserId, socket.id);
        emitUpdate(roomId, game);
        emitLobbyState(io, games);
      }
      socket.leave(roomId);
      console.log(`🚪 ${currentUserId} abandonó sala ${roomId}`);
    } catch (error) {
      console.error('❌ Error en leave_room:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      console.log(`💀 Socket desconectado: ${socket.id} (User: ${currentUserId})`);

      if (currentRoomId && currentUserId) {
        const game = games[currentRoomId];

        if (game) {
          game.removePlayer(currentUserId, socket.id);

          const activePlayers = Object.values(game.players).filter(
            (p) => p && p.socketIds instanceof Set && p.socketIds.size > 0
          );
          const activeSpectators = game.spectators.filter(
            (s) => s && s.socketIds instanceof Set && s.socketIds.size > 0
          );

          if (activePlayers.length === 0 && activeSpectators.length === 0) {
            console.log(`🗑️ Sala ${currentRoomId} vacía. Eliminando.`);
            game.clearTurnTimer();
            delete games[currentRoomId];
          } else {
            emitUpdate(currentRoomId, game);
          }

          emitLobbyState(io, games);
        }
      }
    } catch (error) {
      console.error('❌ Error en disconnect:', error);
    }
  });
}
