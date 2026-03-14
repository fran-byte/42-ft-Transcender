const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const BlackjackGame = require('./game/BlackjackGame');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

/*LINES ADDED IN ORDER TO CHECK BACKEND WORKS IN PORT 3000*/
/**/
app.get('/', (req, res) => {
    res.send('Backend funcionando');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'blackjack-backend'
    });
});
/**/
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
    // LOG DE CONTROL
    console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);

    socket.on('join_game', ({ roomId, username }) => {
        if (!games[roomId]) {
            games[roomId] = new BlackjackGame(roomId);
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
            game.startRound();
            console.log(`🃏 Cartas repartidas. Turno de: ${game.turn}`);
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

    // --- AQUÍ ESTÁ EL ARREGLO DE LOS ZOMBIS ---
    socket.on('disconnect', () => {
        console.log(`💀 SE HA IDO: ${socket.id}`);
        
        // Buscamos en todas las salas si este socket estaba jugando
        for (const roomId in games) {
            const game = games[roomId];
            
            // Si está en la lista de jugadores...
            if (game.players[socket.id]) {
                console.log(`🧹 Limpiando silla de ${socket.id} en ${roomId}`);
                
                game.removePlayer(socket.id); // Lo borramos de la lógica
                
                // IMPORTANTE: Si era su turno, removePlayer debería haber pasado el turno.
                // Si la sala se queda vacía, reseteamos para no acumular basura
                if (game.playerOrder.length === 0) {
                    console.log(`🗑️ Sala ${roomId} vacía. Eliminando partida.`);
                    delete games[roomId];
                } else {
                    emitUpdate(roomId, game); // Avisamos a los que quedan
                }
                break; // Ya lo encontramos, dejamos de buscar
            }
        }
    });
});

// Lógica de fin de partida y reinicio
function checkEndGame(roomId, game) {
    if (game.gameState === 'finished') {
        console.log(`🏁 Partida terminada en ${roomId}. Reinicio en 5s...`);
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