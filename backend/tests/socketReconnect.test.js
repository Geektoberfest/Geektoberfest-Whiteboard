import http from 'node:http';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Server } from 'socket.io';
import { io as createSocketClient } from 'socket.io-client';
import {
  createSocketOptions,
  SOCKET_RECONNECTION_OPTIONS,
} from '../../frontend/src/services/socketOptions.js';

function waitFor(predicate, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - startedAt >= timeout) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for Socket.IO recovery.'));
      }
    }, 10);
  });
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe('Socket.IO reconnection policy', () => {
  let httpServer;
  let io;
  let baseUrl;
  let connectionCount = 0;
  let boardEventCount = 0;
  let receivedToken;
  const joinedRooms = [];

  before(async () => {
    httpServer = http.createServer();
    io = new Server(httpServer, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      connectionCount += 1;
      receivedToken = socket.handshake.auth.token;

      socket.on('room:join', ({ roomCode }, ack) => {
        joinedRooms.push(roomCode);
        socket.join(roomCode);
        ack({ ok: true, roomCode });

        // Close the transport twice to emulate temporary network interruptions.
        // The third connection stays available for the collaboration assertion.
        if (joinedRooms.length < 3) setTimeout(() => socket.conn.close(), 10);
      });

      socket.on('board:element:upsert', () => {
        boardEventCount += 1;
      });
    });

    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
  });

  it('retries with bounded backoff, reconnects, and rejoins the active room exactly once per connection', async () => {
    assert.deepEqual(SOCKET_RECONNECTION_OPTIONS, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    const socket = createSocketClient(baseUrl, {
      ...createSocketOptions('reconnect-test-token'),
      reconnectionAttempts: 3,
      reconnectionDelay: 10,
      reconnectionDelayMax: 20,
      randomizationFactor: 0,
    });
    const roomCode = 'RETRY6';
    const joinResponses = [];

    const rejoin = () => {
      socket.emit('room:join', { roomCode }, (response) => joinResponses.push(response));
    };
    socket.on('connect', rejoin);

    try {
      await waitFor(() => joinedRooms.length === 3 && joinResponses.length === 3);

      assert.equal(receivedToken, 'reconnect-test-token');
      assert.equal(connectionCount, 3);
      assert.deepEqual(joinedRooms, [roomCode, roomCode, roomCode]);
      assert.equal(joinResponses.length, 3);
      assert.ok(joinResponses.every((response) => response.ok));

      socket.emit('board:element:upsert', { element: { id: 'one' } });
      await waitFor(() => boardEventCount === 1);
      assert.equal(boardEventCount, 1);

      socket.disconnect();
      await pause(100);
      assert.equal(connectionCount, 3, 'an intentional disconnect must not schedule another reconnect');
    } finally {
      socket.off('connect', rejoin);
      socket.disconnect();
    }
  });
});
