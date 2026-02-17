import { io } from 'socket.io-client';

// Creamos la conexión UNA sola vez y la exportamos para usarla en toda la app
export const socket = io('/', {
    path: '/socket.io',
    transports: ['websocket'], // Forzamos websocket
    reconnection: true,
    reconnectionAttempts: 5,
    autoConnect: true
});