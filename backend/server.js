const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const BlackjackGame = require('./game/BlackjackGame'); // Importamos la lógica

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- GESTIÓN DE PARTIDAS ---
// En memoria (futuro: Redis/DB)
const games = {}; 

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    // EVENTO 1: Unirse a una mesa (o crearla)
    socket.on('join_game', (roomId) => {
        // Si no existe, la creamos
        if (!games[roomId]) {
            games[roomId] = new BlackjackGame(roomId);
            console.log(`Nueva partida creada: ${roomId}`);
        }

        const game = games[roomId];
        
        // Añadimos al jugador a la lógica
        if (game.addPlayer(socket.id, "Player " + socket.id.substr(0,4))) {
            // Unimos el socket a la sala de Socket.io
            socket.join(roomId);
            
            // Enviamos el estado actual a TODOS los de la sala
            io.to(roomId).emit('game_update', game.getPublicState());
        }
    });

    // EVENTO 2: Empezar ronda (Solo debería poder el "host" o automático, por ahora cualquiera)
    socket.on('start_round', (roomId) => {
        const game = games[roomId];
        if (game) {
            game.startRound();
            io.to(roomId).emit('game_update', game.getPublicState());
        }
    });

    // EVENTO 3: Pedir carta (Hit)
    socket.on('action_hit', (roomId) => {
        const game = games[roomId];
        if (game) {
            game.hit(socket.id); // La clase valida si es su turno
            io.to(roomId).emit('game_update', game.getPublicState());
        }
    });

    // EVENTO 4: Plantarse (Stand)
    socket.on('action_stand', (roomId) => {
        const game = games[roomId];
        if (game) {
            game.stand(socket.id);
            io.to(roomId).emit('game_update', game.getPublicState());
        }
    });

    socket.on('disconnect', () => {
        // Aquí deberíamos limpiar al jugador de la partida
        console.log('Desconexión:', socket.id);
    });
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server corriendo en puerto ${PORT}`);
});