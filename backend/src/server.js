import http from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectToDatabase, disconnectFromDatabase } from './config/db.js';
import { env, findMissingEnvKeys, isAllowedOrigin } from './config/env.js';
import { registerSocketHandlers } from './sockets/index.js';

const missingKeys = findMissingEnvKeys();
if (missingKeys.length > 0) {
  console.error(`Missing required environment variables: ${missingKeys.join(', ')}. Copy backend/.env.example to backend/.env and configure them.`);
  process.exitCode = 1;
} else {
  try {
    await connectToDatabase(env.mongoUri);
    console.log('Connected to MongoDB');

    const httpServer = http.createServer(createApp());
    const io = new Server(httpServer, {
      cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) },
      allowRequest: (request, callback) => {
        const origin = request.headers.origin;
        callback(isAllowedOrigin(origin) ? null : 'Origin is not allowed', isAllowedOrigin(origin));
      },
    });
    registerSocketHandlers(io);

    httpServer.on('error', (error) => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${env.port} is already in use. Change PORT in backend/.env and start again.`
        : `HTTP server error: ${error.message}`);
      process.exitCode = 1;
    });

    httpServer.listen(env.port, () => console.log(`Geekstober whiteboard API listening on port ${env.port}`));

    let shuttingDown = false;
    async function shutdown(signal) {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`${signal} received, shutting down`);
      await new Promise((resolve) => io.close(resolve));
      await disconnectFromDatabase();
    }
    process.on('SIGINT', () => shutdown('SIGINT').catch((error) => { console.error('Shutdown error:', error.message); process.exitCode = 1; }));
    process.on('SIGTERM', () => shutdown('SIGTERM').catch((error) => { console.error('Shutdown error:', error.message); process.exitCode = 1; }));
  } catch (error) {
    console.error(`Backend startup failed: ${error.message}. Check MONGODB_URI and database network access.`);
    process.exitCode = 1;
  }
}
