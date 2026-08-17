import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { configureSocket } from './socket/configureSocket.js';
import { config } from './config.js';

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.clientOrigin, credentials: true },
});

configureSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[bidwhist-server] listening on http://localhost:${config.port}`);
});
