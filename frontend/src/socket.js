import { io } from 'socket.io-client';

// Crear el socket pero NO conectar automáticamente hasta login
export const socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    autoConnect: false // NO conectar hasta que el usuario haga login
});