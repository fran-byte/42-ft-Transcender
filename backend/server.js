const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { Pool } = require("pg");
const BlackjackGame = require("./game/BlackjackGame");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = 3000;
const allowedOrigin = "https://blackjack.local";

// DB
const pool = new Pool({
  host: process.env.DB_HOST || "database",
  user: process.env.DB_USER || "transcendence",
  password: process.env.DB_PASSWORD || "transcendence",
  database: process.env.DB_NAME || "transcendence",
  port: 5432,
});

// ROOMS
const ROOM_CONFIGS = {
  "solo-table": {
    id: "solo-table",
    roomName: "Solo Table",
    maxPlayers: 1,
    minBet: 5,
    maxBet: 200,
    mode: "Solo",
    description: "A private practice table just for you",
  },
  "gold-room": {
    id: "gold-room",
    roomName: "Golden Table",
    maxPlayers: 2,
    minBet: 10,
    maxBet: 1000,
    mode: "Versus",
    description: "A two-player table for competitive duels",
  },
  "emerald-room": {
    id: "emerald-room",
    roomName: "Emerald Room",
    maxPlayers: 4,
    minBet: 5,
    maxBet: 500,
    mode: "Multiplayer",
    description: "A relaxed table with soft stakes",
  },
  "royal-room": {
    id: "royal-room",
    roomName: "Royal Lounge",
    maxPlayers: 4,
    minBet: 25,
    maxBet: 2000,
    mode: "Multiplayer",
    description: "A room for sharper players with bolder bets",
  },
  "diamond-room": {
    id: "diamond-room",
    roomName: "Diamond Room",
    maxPlayers: 5,
    minBet: 35,
    maxBet: 3500,
    mode: "Multiplayer",
    description: "A five-seat premium table for larger hands",
  },
  "velvet-room": {
    id: "velvet-room",
    roomName: "Velvet Room",
    maxPlayers: 6,
    minBet: 10,
    maxBet: 1000,
    mode: "Multiplayer",
    description: "Wider table for +4 players",
  },
};

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend running" });
});

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const games = {};

const emitUpdate = (roomId, game) => {
  io.to(roomId).emit("game_update", game.getPublicState());
};

const emitLobbyState = () => {
  const lobbyRooms = Object.values(ROOM_CONFIGS).map((roomConfig) => {
    const game = games[roomConfig.id];

    if (!game) {
      return {
        roomId: roomConfig.id,
        roomName: roomConfig.roomName,
        playersCount: 0,
        spectatorsCount: 0,
        totalConnected: 0,
        maxPlayers: roomConfig.maxPlayers,
        gameState: "waiting",
        minBet: roomConfig.minBet,
        maxBet: roomConfig.maxBet,
        mode: roomConfig.mode,
      };
    }

    const connectedPlayers = game.playerOrder
      .map((id) => game.players[id])
      .filter(
        (player) =>
          player &&
          player.socketIds instanceof Set &&
          player.socketIds.size > 0
      );

    const connectedSpectators = game.spectators.filter(
      (spectator) =>
        spectator &&
        spectator.socketIds instanceof Set &&
        spectator.socketIds.size > 0
    );

    return {
      roomId: game.id,
      roomName: game.roomName,
      playersCount: connectedPlayers.length,
      spectatorsCount: connectedSpectators.length,
      totalConnected: connectedPlayers.length + connectedSpectators.length,
      maxPlayers: game.maxPlayers,
      gameState: game.gameState,
      minBet: game.minBet,
      maxBet: game.maxBet,
      mode: game.mode,
    };
  });

  io.emit("lobby_state", lobbyRooms);
};

const persistFinishedGame = async (game) => {
  try {
    const dealerScore = game.calculateScore(game.dealerHand);

    for (const userId of game.playerOrder) {
      const player = game.players[userId];
      if (!player) continue;

      await pool.query(
        `
        INSERT INTO game_history (
          user_id,
          room_id,
          room_name,
          result,
          bet,
          player_score,
          dealer_score,
          chips_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          userId,
          game.id,
          game.roomName,
          player.result || "unknown",
          player.bet || 0,
          player.score || 0,
          dealerScore || 0,
          player.chips || 0,
        ]
      );

      await pool.query(
        `
        UPDATE users
        SET balance = $1
        WHERE id = $2
        `,
        [player.chips || 0, userId]
      );
    }
  } catch (error) {
    console.error("❌ Error guardando historial:", error);
  }
};

io.on("connection", (socket) => {
  let currentUserId = null;
  let currentRoomId = null;

  console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);
  emitLobbyState();

  socket.on("get_lobby_state", () => {
    emitLobbyState();
  });

  socket.on("sync_wallet_balance", ({ roomId, userId, balance }) => {
    try {
      const game = games[roomId];
      if (!game) return;
      if (!currentUserId || String(currentUserId) !== String(userId)) return;

      const ok = game.updatePlayerWallet(userId, Number(balance));
      if (!ok) return;

      emitUpdate(roomId, game);
      emitLobbyState();
    } catch (error) {
      console.error("❌ Error en sync_wallet_balance:", error);
    }
  });

  socket.on("join_game", async ({ roomId, user, preferredRole }) => {
    try {
      if (!roomId || !user || !user.id || !user.username) {
        console.error("❌ Intento de join_game inválido");
        return;
      }

      const roomConfig = ROOM_CONFIGS[roomId];
      if (!roomConfig) {
        console.error(`❌ Room inválida: ${roomId}`);
        socket.emit("join_result", {
          success: false,
          reason: "invalid_room",
        });
        return;
      }

      currentUserId = user.id;
      currentRoomId = roomId;

      if (!games[roomId]) {
        games[roomId] = new BlackjackGame(
          roomId,
          (gameState) => {
            io.to(roomId).emit("game_update", gameState);
          },
          roomConfig
        );

        console.log(
          `✨ Sala creada: ${roomId} (maxPlayers=${roomConfig.maxPlayers}, minBet=${roomConfig.minBet}, maxBet=${roomConfig.maxBet})`
        );
      }

      const game = games[roomId];
      socket.join(roomId);

      const balanceResult = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [user.id]
      );

      const dbBalance =
        balanceResult.rows.length > 0
          ? Number(balanceResult.rows[0].balance)
          : 0;

      const joinResult = game.addPlayer(
        user.id,
        socket.id,
        user.username,
        user.avatar || null,
        preferredRole || "player",
        dbBalance
      );

      socket.emit("join_result", {
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

      console.log(
        `✅ ${user.username} (${user.id}) unido a ${roomId} como ${joinResult.role} con chips=${dbBalance}`
      );

      emitUpdate(roomId, game);
      emitLobbyState();
    } catch (error) {
      console.error("❌ Error en join_game:", error);
    }
  });

  socket.on("start_round", (roomId) => {
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
        console.log(`⛔ No se puede iniciar: faltan apuestas`);
        return;
      }

      console.log(`🃏 START ROUND por host: ${currentUserId} en sala ${roomId}`);
      game.startRound(currentUserId);
      emitUpdate(roomId, game);
      emitLobbyState();
    } catch (error) {
      console.error("❌ Error en start_round:", error);
    }
  });

  socket.on("action_hit", async (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ HIT ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`👊 HIT de usuario: ${currentUserId}`);

      const wasFinished = game.gameState === "finished";

      game.hit(currentUserId);
      emitUpdate(roomId, game);

      if (!wasFinished && game.gameState === "finished") {
        await persistFinishedGame(game);
      }
    } catch (error) {
      console.error("❌ Error en action_hit:", error);
    }
  });

  socket.on("action_stand", async (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ STAND ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`✋ STAND de usuario: ${currentUserId}`);

      const wasFinished = game.gameState === "finished";

      game.stand(currentUserId);
      emitUpdate(roomId, game);

      if (!wasFinished && game.gameState === "finished") {
        await persistFinishedGame(game);
      }
    } catch (error) {
      console.error("❌ Error en action_stand:", error);
    }
  });

  socket.on("reset_round", (roomId) => {
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
      emitLobbyState();
    } catch (error) {
      console.error("❌ Error en reset_round:", error);
    }
  });

  socket.on("place_bet", ({ roomId, amount }) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const numericAmount = Number(amount);
      const ok = game.placeBet(currentUserId, numericAmount);

      if (!ok) {
        const player = game.players[currentUserId];

        console.log("⛔ Bet rechazada", {
          roomId,
          currentUserId,
          amount: numericAmount,
          isPlayer: !!player,
          isSpectator: game.spectators.some((s) => s.userId === currentUserId),
          currentBet: player?.bet ?? null,
          chips: player?.chips ?? null,
          minBet: game.minBet,
          maxBet: game.maxBet,
        });

        socket.emit("bet_error", {
          success: false,
          message: "Invalid bet for this table or insufficient chips.",
          minBet: game.minBet,
          maxBet: game.maxBet,
          chips: player?.chips ?? 0,
          currentBet: player?.bet ?? 0,
        });
        return;
      }

      emitUpdate(roomId, game);
    } catch (error) {
      console.error("❌ Error en place_bet:", error);
    }
  });

  socket.on("clear_bet", (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      const ok = game.clearBet(currentUserId);
      if (!ok) return;

      emitUpdate(roomId, game);
    } catch (error) {
      console.error("❌ Error en clear_bet:", error);
    }
  });

  socket.on("disconnect", () => {
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

          emitLobbyState();
        }
      }
    } catch (error) {
      console.error("❌ Error en disconnect:", error);
    }
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 SERVIDOR LISTO EN PUERTO ${PORT}`);
});