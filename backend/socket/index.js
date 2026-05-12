import { Server } from 'socket.io';
import env from '../config/env.js';
import { registerGameHandlers } from './gameHandlers.js';
import { registerLobbyHandlers } from './lobbyHandlers.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const games = {};

  io.on('connection', (socket) => {
    console.log(`🔌 NUEVA CONEXIÓN: ${socket.id}`);
    registerLobbyHandlers(io, socket, games);
    registerGameHandlers(io, socket, games);
  });

  return io;
}
