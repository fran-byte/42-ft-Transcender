import http from 'http';
import app from './app.js';
import { initSocket } from './socket/index.js';
import env from './config/env.js';

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, '0.0.0.0', () => {
  console.log(`🚀 SERVIDOR LISTO EN PUERTO ${env.port}`);
});
