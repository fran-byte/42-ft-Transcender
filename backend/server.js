const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const BlackjackGame = require('./game/BlackjackGame');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = 3000;

// CORS configurado para permitir credenciales (cookies)
app.use(cors({
    origin: 'http://localhost:5173', // URL del frontend
    credentials: true // Permite enviar cookies
}));

app.use(express.json());
app.use(cookieParser()); // Para leer cookies

// Rutas de autenticación
app.use('/api/auth', authRoutes);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const games = {}; 

// Función auxiliar para emitir cambios
const emitUpdate = (roomId, game) => {
    io.to(roomId).emit('game_update', game.getPublicState());
};

io.on('connection', (socket) => {
    console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);

    socket.on('join_game', ({ roomId, username }) => {
        if (!games[roomId]) {
            // MODIFICADO: Pasamos el callback para que el temporizador funcione
        games[roomId] = new BlackjackGame(roomId, (gameState) => {
            // 1. Avisamos a todos del cambio
            io.to(roomId).emit('game_update', gameState);

            // 2. ¡IMPORTANTE! Comprobamos si el tiempo forzó el fin de la partida
            if (gameState.gameState === 'finished') {
                checkEndGame(roomId, games[roomId]);
            }
        });
            console.log(`✨ Sala creada: ${roomId}`);
        }
        
        const game = games[roomId];
        socket.join(roomId);

        const name = username || `Jugador ${socket.id.substr(0,4)}`;
        const success = game.addPlayer(socket.id, name);

        if (success) {
            console.log(`✅ ${name} se sentó en ${roomId}`);
            emitUpdate(roomId, game);
        } else {
            console.log(`👀 ${name} entró como espectador (partida en curso)`);
            socket.emit('game_update', game.getPublicState());
        }
    });

    socket.on('start_round', (roomId) => {
        console.log(`▶️ Intento de START en ${roomId} por ${socket.id}`);
        const game = games[roomId];
        
        if (game) {
            // MODIFICADO: Pasamos socket.id para verificar si es jugador
            game.startRound(socket.id);
            
            console.log(`🃏 Estado tras start: ${game.gameState}`);
            emitUpdate(roomId, game);
        } else {
            console.error(`❌ Error: No existe la sala ${roomId}`);
        }
    });

    socket.on('action_hit', (roomId) => {
        const game = games[roomId];
        if (game) {
            console.log(`👊 HIT: ${socket.id}`);
            game.hit(socket.id);
            emitUpdate(roomId, game);
            checkEndGame(roomId, game);
        }
    });

    socket.on('action_stand', (roomId) => {
        const game = games[roomId];
        if (game) {
            console.log(`✋ STAND: ${socket.id}`);
            game.stand(socket.id);
            emitUpdate(roomId, game);
            checkEndGame(roomId, game);
        }
    });

    socket.on('disconnect', () => {
        console.log(`💀 SE HA IDO: ${socket.id}`);
        
        for (const roomId in games) {
            const game = games[roomId];
            
            if (game.players[socket.id]) {
                console.log(`🧹 Limpiando silla de ${socket.id} en ${roomId}`);
                
                game.removePlayer(socket.id); 
                
                if (game.playerOrder.length === 0) {
                    console.log(`🗑️ Sala ${roomId} vacía. Eliminando partida.`);
                    // Es importante limpiar el timer antes de borrar el objeto
                    game.clearTurnTimer(); 
                    delete games[roomId];
                } else {
                    emitUpdate(roomId, game);
                }
                break;
            }
        }
    });
});

function checkEndGame(roomId, game) {
    if (game.gameState === 'finished') {
        console.log(`🏁 Partida terminada en ${roomId}. Reinicio en 5s...`);
        
        // Aseguramos que el timer de turnos esté parado
        game.clearTurnTimer();

        setTimeout(() => {
            if (games[roomId]) {
                game.resetRound();
                console.log(`🔄 Mesa ${roomId} lista para nueva ronda.`);
                emitUpdate(roomId, game);
            }
        }, 5000);
    }
}

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVIDOR LISTO EN PUERTO ${PORT}`);
});