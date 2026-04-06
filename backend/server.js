const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const BlackjackGame = require("./game/BlackjackGame");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = 3000;
const allowedOrigin = "https://blackjack.local";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
  const lobbyRooms = Object.values(games).map((game) => {
    const connectedPlayers = game.playerOrder
      .map((id) => game.players[id])
      .filter((player) => player && player.socketId !== null);

    const connectedSpectators = game.spectators.filter(
      (spectator) => spectator && spectator.socketId !== null
    );

    return {
      roomId: game.id,
      playersCount: connectedPlayers.length,
      spectatorsCount: connectedSpectators.length,
      totalConnected: connectedPlayers.length + connectedSpectators.length,
      maxPlayers: game.maxPlayers,
      gameState: game.gameState,
    };
  });

  io.emit("lobby_state", lobbyRooms);
};

io.on("connection", (socket) => {
  let currentUserId = null;
  let currentRoomId = null;

  console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);
  emitLobbyState();

  socket.on("join_game", ({ roomId, user, maxPlayers, preferredRole }) => {
    try {
        if (!roomId || !user || !user.id || !user.username) {
        console.error("❌ Intento de join_game inválido");
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
            Number(maxPlayers) || 4
        );

        console.log(
            `✨ Sala creada: ${roomId} (maxPlayers=${Number(maxPlayers) || 4})`
        );
        }

        const game = games[roomId];

        socket.join(roomId);

        const joinResult = game.addPlayer(
        user.id,
        socket.id,
        user.username,
        user.avatar || null,
        preferredRole || "player"
        );

        socket.emit("join_result", joinResult);

        console.log(
        `✅ ${user.username} (${user.id}) unido a ${roomId} como ${joinResult.role}`
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

  socket.on("action_hit", (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ HIT ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`👊 HIT de usuario: ${currentUserId}`);
      game.hit(currentUserId);
      emitUpdate(roomId, game);
    } catch (error) {
      console.error("❌ Error en action_hit:", error);
    }
  });

  socket.on("action_stand", (roomId) => {
    try {
      const game = games[roomId];
      if (!game || !currentUserId) return;

      if (game.turn !== currentUserId) {
        console.log(`⛔ STAND ignorado: no es turno de ${currentUserId}`);
        return;
      }

      console.log(`✋ STAND de usuario: ${currentUserId}`);
      game.stand(currentUserId);
      emitUpdate(roomId, game);
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

      const ok = game.placeBet(currentUserId, Number(amount));
      if (!ok) {
        console.log("⛔ Bet rechazada", {
          roomId,
          currentUserId,
          amount,
          isPlayer: !!game.players[currentUserId],
          isSpectator: game.spectators.some((s) => s.userId === currentUserId),
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
            (p) => p && p.socketId !== null
          );

          const activeSpectators = game.spectators.filter(
            (s) => s && s.socketId !== null
          );

          if (
            activePlayers.length === 0 &&
            activeSpectators.length === 0 &&
            game.gameState === "waiting"
          ) {
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