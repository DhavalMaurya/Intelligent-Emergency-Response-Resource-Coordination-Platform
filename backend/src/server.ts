import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initRedis } from './config/redis.js';
import { ServerToClientEvents, ClientToServerEvents } from './types/socket-events.js';

const app = createApp();
const server = http.createServer(app);

export const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('subscribe.zone', (zone: string) => {
    socket.join(`zone:${zone}`);
    console.log(`[Socket.IO] Client ${socket.id} subscribed to zone: ${zone}`);
  });

  socket.on('unsubscribe.zone', (zone: string) => {
    socket.leave(`zone:${zone}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  console.log('====================================================');
  console.log(' PS-9 Emergency Coordination Platform - Backend EOC ');
  console.log('====================================================');

  await connectDB();
  await initRedis();

  server.listen(env.PORT, () => {
    console.log(`[Server] Live and listening on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`[Server] Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`[Server] System overview: http://localhost:${env.PORT}/api/v1/system/health`);
  });
};

startServer().catch((err) => {
  console.error('[Server Error] Startup failed:', err);
  process.exit(1);
});
