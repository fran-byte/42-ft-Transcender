const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const BlackjackGame = require('./game/BlackjackGame');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 3000;
const allowedOrigin = 'http://localhost:5173';

app.use(cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
/* 
app.options('/*', cors({
    origin: allowedOrigin,
    credentials: true
}));
*/
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const games = {};

const emitUpdate = (roomId, game) => {
    io.to(roomId).emit('game_update', game.getPublicState());
};

io.on('connection', (socket) => {
    let currentUserId = null;
    let currentRoomId = null;

    console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);

    socket.on('join_game', ({ roomId, user }) => {
        if (!user || !user.id) return console.error("❌ Intento de join sin User ID");

        currentUserId = user.id;
        currentRoomId = roomId;

        if (!games[roomId]) {
            games[roomId] = new BlackjackGame(roomId, (gameState) => {
                io.to(roomId).emit('game_update', gameState);
                if (gameState.gameState === 'finished') {
                    checkEndGame(roomId, games[roomId]);
                }
            });
            console.log(`✨ Sala creada: ${roomId}`);
        }

        const game = games[roomId];
        socket.join(roomId);

        const success = game.addPlayer(user.id, socket.id, user.username);

        if (success) {
            console.log(`✅ ${user.username} (${user.id}) sentado/reconectado en ${roomId}`);
            emitUpdate(roomId, game);
        } else {
            console.log(`👀 ${user.username} como espectador`);
            socket.emit('game_update', game.getPublicState());
        }
    });

    socket.on('start_round', (roomId) => {
        const game = games[roomId];
        if (game && currentUserId) {
            game.startRound(currentUserId);
            emitUpdate(roomId, game);
        }
    });

    socket.on('action_hit', (roomId) => {
        const game = games[roomId];
        if (game && game.turn === currentUserId) {
            console.log(`👊 HIT de usuario: ${currentUserId}`);
            game.hit(currentUserId);
            emitUpdate(roomId, game);
            checkEndGame(roomId, game);
        }
    });

    socket.on('action_stand', (roomId) => {
        const game = games[roomId];
        if (game && game.turn === currentUserId) {
            console.log(`✋ STAND de usuario: ${currentUserId}`);
            game.stand(currentUserId);
            emitUpdate(roomId, game);
            checkEndGame(roomId, game);
        }
    });

    socket.on('disconnect', () => {
        console.log(`💀 Socket desconectado: ${socket.id} (User: ${currentUserId})`);

        if (currentRoomId && currentUserId) {
            const game = games[currentRoomId];
            if (game) {
                game.removePlayer(currentUserId);

                const activeSockets = Object.values(game.players).filter(p => p.socketId !== null);

                if (activeSockets.length === 0 && game.gameState === 'waiting') {
                    console.log(`🗑️ Sala ${currentRoomId} vacía. Eliminando.`);
                    game.clearTurnTimer();
                    delete games[currentRoomId];
                } else {
                    emitUpdate(currentRoomId, game);
                }
            }
        }
    });
});

function checkEndGame(roomId, game) {
    if (game.gameState === 'finished') {
        game.clearTurnTimer();
        setTimeout(() => {
            if (games[roomId]) {
                game.resetRound();
                emitUpdate(roomId, game);
            }
        }, 5000);
    }
}

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR ROBUSTO LISTO EN PUERTO ${PORT}`);
});