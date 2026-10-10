import http from 'node:http';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { Server } from 'socket.io';
import { io as createSocketClient } from 'socket.io-client';

// These suites need a real MongoDB. They are skipped unless a dedicated test
// database is provided, so a normal `npm test` never touches development data.
const TEST_DATABASE_NAME = process.env.TEST_DATABASE_NAME || 'geekstober-whiteboard-test';
const testMongoUri = process.env.TEST_MONGODB_URI;
const describeWithDatabase = testMongoUri ? describe : describe.skip;

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-the-geekstober-suite';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const PASSWORD = 'a-long-enough-password';

// Imported lazily inside the hooks so the test secret is in place first.
let createApp;
let registerSocketHandlers;

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function expectConnectError(socket) {
  return new Promise((resolve) => socket.once('connect_error', resolve));
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`"${event}" was never acknowledged`)), 5000);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

/** Resolves with the event payload, or with null when nothing arrives in time. */
function nextEvent(socket, event, timeout = 600) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      resolve(null);
    }, timeout);

    function listener(payload) {
      clearTimeout(timer);
      resolve(payload);
    }

    socket.on(event, listener);
  });
}

describeWithDatabase('auth and rooms over HTTP', () => {
  let app;

  before(async () => {
    await mongoose.connect(testMongoUri, { dbName: TEST_DATABASE_NAME });
    ({ createApp } = await import('../src/app.js'));
    app = createApp();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function registerUser(name, email) {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name, email, password: PASSWORD });

    assert.equal(response.status, 201);
    return response.body;
  }

  it('registers a user and returns a usable token', async () => {
    const session = await registerUser('Asha', 'asha@example.com');

    assert.ok(session.token);
    assert.equal(session.user.email, 'asha@example.com');
    assert.match(session.user.color, /^#[0-9a-f]{6}$/);
    assert.equal(session.user.passwordHash, undefined);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.token}`);

    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, 'Asha');
  });

  it('never stores the password in plain text', async () => {
    const { User } = await import('../src/models/User.js');
    const stored = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');

    assert.notEqual(stored.passwordHash, PASSWORD);
    assert.ok(stored.passwordHash.startsWith('$2'));
  });

  it('rejects a duplicate email and a short password', async () => {
    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@example.com', password: PASSWORD });

    assert.equal(duplicate.status, 409);

    const tooShort = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ravi', email: 'ravi@example.com', password: 'short' });

    assert.equal(tooShort.status, 400);
  });

  it('refuses a wrong password but signs in with the right one', async () => {
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'not-the-password' });

    assert.equal(wrong.status, 401);

    const correct = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: PASSWORD });

    assert.equal(correct.status, 200);
    assert.equal(correct.body.user.email, 'asha@example.com');
  });

  it('requires a token for the room endpoints', async () => {
    const response = await request(app).get('/api/rooms');

    assert.equal(response.status, 401);
  });

  it('creates a room, lists it and lets another member join it', async () => {
    const owner = await registerUser('Kabir', 'kabir@example.com');
    const guest = await registerUser('Meera', 'meera@example.com');

    const created = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Design sync' });

    assert.equal(created.status, 201);
    const { code } = created.body.room;
    assert.match(code, /^[A-Z0-9]{6}$/);

    const joined = await request(app)
      .post(`/api/rooms/${code}/join`)
      .set('Authorization', `Bearer ${guest.token}`);

    assert.equal(joined.status, 200);
    assert.equal(joined.body.room.members.length, 2);

    const guestRooms = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${guest.token}`);

    assert.equal(guestRooms.body.rooms.length, 1);
    assert.equal(guestRooms.body.rooms[0].code, code);
  });

  it('keeps a private room closed to everyone but its owner', async () => {
    const owner = await registerUser('Nila', 'nila@example.com');
    const stranger = await registerUser('Omar', 'omar@example.com');

    const created = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Secret plan', visibility: 'private' });

    const { code } = created.body.room;

    const rejected = await request(app)
      .post(`/api/rooms/${code}/join`)
      .set('Authorization', `Bearer ${stranger.token}`);

    assert.equal(rejected.status, 403);

    const ownerCanOpen = await request(app)
      .get(`/api/rooms/${code}`)
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(ownerCanOpen.status, 200);
  });

  it('answers with a 404 for a room that does not exist', async () => {
    const owner = await registerUser('Tara', 'tara@example.com');

    const response = await request(app)
      .get('/api/rooms/ZZZZZZ')
      .set('Authorization', `Bearer ${owner.token}`);

    assert.equal(response.status, 404);
  });
});

describeWithDatabase('socket collaboration', () => {
  let app;
  let server;
  let io;
  let baseUrl;

  before(async () => {
    await mongoose.connect(testMongoUri, { dbName: TEST_DATABASE_NAME });
    ({ createApp } = await import('../src/app.js'));
    ({ registerSocketHandlers } = await import('../src/sockets/index.js'));

    app = createApp();
    server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });
    registerSocketHandlers(io);

    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
    const { flushBoardWrites } = await import('../src/services/boardService.js');
    await flushBoardWrites();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function createSession(name, email) {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name, email, password: PASSWORD });
    return response.body;
  }

  async function createRoom(token, name) {
    const response = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name });
    return response.body.room;
  }

  async function openSocket(token) {
    const socket = createSocketClient(baseUrl, { auth: { token }, transports: ['websocket'] });
    await waitForConnect(socket);
    return socket;
  }

  it('refuses a connection that carries no token', async () => {
    const socket = createSocketClient(baseUrl, { auth: {}, transports: ['websocket'] });
    const error = await expectConnectError(socket);

    assert.match(error.message, /Not authorized/);
    socket.close();
  });

  it('rejects a malformed room code during the join handshake', async () => {
    const session = await createSession('Ishan', 'ishan@example.com');
    const socket = await openSocket(session.token);

    const response = await emitWithAck(socket, 'room:join', { roomCode: 'nope' });

    assert.equal(response.ok, false);
    socket.close();
  });

  it('keeps two different rooms completely isolated', async () => {
    const asha = await createSession('Asha', 'asha.socket@example.com');
    const kabir = await createSession('Kabir', 'kabir.socket@example.com');

    const firstRoom = await createRoom(asha.token, 'Room one');
    const secondRoom = await createRoom(kabir.token, 'Room two');

    const ashaSocket = await openSocket(asha.token);
    const kabirSocket = await openSocket(kabir.token);

    assert.equal((await emitWithAck(ashaSocket, 'room:join', { roomCode: firstRoom.code })).ok, true);
    assert.equal((await emitWithAck(kabirSocket, 'room:join', { roomCode: secondRoom.code })).ok, true);

    const foreignEvent = nextEvent(kabirSocket, 'board:element:upsert', 250);
    const ownEvent = nextEvent(ashaSocket, 'board:element:upsert');
    const ownChat = nextEvent(ashaSocket, 'chat:message', 3000);

    try {
      ashaSocket.emit('board:element:upsert', {
        element: { id: 'stroke-1', type: 'pen', points: [{ x: 5, y: 5 }] },
      });

      const received = await ownEvent;
      assert.equal(received.element.id, 'stroke-1');
      assert.equal(received.element.updatedBy, asha.user.id);
      assert.equal(await foreignEvent, null);

      const foreignChat = nextEvent(kabirSocket, 'chat:message', 250);
      const chatAck = await emitWithAck(ashaSocket, 'chat:send', { text: 'hello room one' });
      assert.equal(chatAck.ok, true);
      assert.equal((await ownChat).text, 'hello room one');
      assert.equal(await foreignChat, null);
    } finally {
      ashaSocket.close();
      kabirSocket.close();
    }
  });

  it('leaves the previous room when one socket switches rooms', async () => {
    const asha = await createSession('Asha', 'asha.switch@example.com');
    const kabir = await createSession('Kabir', 'kabir.switch@example.com');
    const firstRoom = await createRoom(asha.token, 'First room');
    const secondRoom = await createRoom(asha.token, 'Second room');

    const ashaSocket = await openSocket(asha.token);
    const kabirSocket = await openSocket(kabir.token);
    assert.equal((await emitWithAck(ashaSocket, 'room:join', { roomCode: firstRoom.code })).ok, true);
    assert.equal((await emitWithAck(kabirSocket, 'room:join', { roomCode: firstRoom.code })).ok, true);

    const leftPresence = nextEvent(kabirSocket, 'presence:list');
    const secondJoin = await emitWithAck(ashaSocket, 'room:join', { roomCode: secondRoom.code });
    assert.equal(secondJoin.ok, true);
    assert.deepEqual((await leftPresence).participants.map((participant) => participant.id), [kabir.user.id]);

    const leakedEvent = nextEvent(ashaSocket, 'board:element:upsert', 300);
    kabirSocket.emit('board:element:upsert', {
      element: { id: 'first-room-only', type: 'pen', points: [{ x: 2, y: 2 }] },
    });
    assert.equal(await leakedEvent, null);

    ashaSocket.close();
    kabirSocket.close();
  });

  it('lets every member of a room see the shared board and the presence list', async () => {
    const asha = await createSession('Asha', 'asha.presence@example.com');
    const kabir = await createSession('Kabir', 'kabir.presence@example.com');
    const room = await createRoom(asha.token, 'Shared room');

    const ashaSocket = await openSocket(asha.token);
    const joinResponse = await emitWithAck(ashaSocket, 'room:join', { roomCode: room.code });
    assert.equal(joinResponse.participants.length, 1);

    const kabirSocket = await openSocket(kabir.token);
    const presenceUpdate = nextEvent(ashaSocket, 'presence:list', 3000);

    await emitWithAck(kabirSocket, 'room:join', { roomCode: room.code });

    const { participants } = await presenceUpdate;
    assert.equal(participants.length, 2);
    assert.deepEqual(
      participants.map((participant) => participant.name).sort(),
      ['Asha', 'Kabir'],
    );

    const broadcast = nextEvent(ashaSocket, 'board:element:upsert');
    kabirSocket.emit('board:element:upsert', {
      element: { id: 'shared-note', type: 'sticky', x: 0, y: 0, width: 100, height: 100, text: 'hello' },
    });

    const { element } = await broadcast;
    assert.equal(element.id, 'shared-note');
    assert.equal(element.text, 'hello');

    ashaSocket.close();
    kabirSocket.close();
  });

  it('tells the sender when an element is not valid', async () => {
    const session = await createSession('Rhea', 'rhea@example.com');
    const room = await createRoom(session.token, 'Validation room');
    const socket = await openSocket(session.token);

    await emitWithAck(socket, 'room:join', { roomCode: room.code });

    const rejection = nextEvent(socket, 'app:error');
    socket.emit('board:element:upsert', { element: { id: 'x', type: 'not-a-tool' } });

    const { message } = await rejection;
    assert.match(message, /not valid/i);

    socket.close();
  });

  it('serves the same board state to a collaborator who joins later', async () => {
    const asha = await createSession('Asha', 'asha.late@example.com');
    const kabir = await createSession('Kabir', 'kabir.late@example.com');
    const room = await createRoom(asha.token, 'Late join');

    const ashaSocket = await openSocket(asha.token);
    await emitWithAck(ashaSocket, 'room:join', { roomCode: room.code });
    ashaSocket.emit('board:element:upsert', {
      element: { id: 'first-stroke', type: 'pen', points: [{ x: 1, y: 1 }] },
    });
    await nextEvent(ashaSocket, 'board:element:upsert');

    const kabirSocket = await openSocket(kabir.token);
    const joinResponse = await emitWithAck(kabirSocket, 'room:join', { roomCode: room.code });

    assert.equal(joinResponse.elements.length, 1);
    assert.equal(joinResponse.elements[0].id, 'first-stroke');

    ashaSocket.close();
    kabirSocket.close();
  });

  it('restores persisted board data after active memory is released', async () => {
    const asha = await createSession('Asha', 'asha.persisted@example.com');
    const kabir = await createSession('Kabir', 'kabir.persisted@example.com');
    const room = await createRoom(asha.token, 'Persisted board');
    const ashaSocket = await openSocket(asha.token);
    await emitWithAck(ashaSocket, 'room:join', { roomCode: room.code });

    const saved = nextEvent(ashaSocket, 'board:element:upsert');
    ashaSocket.emit('board:element:upsert', {
      element: { id: 'persisted-stroke', type: 'pen', points: [{ x: 8, y: 9 }] },
    });
    await saved;

    const { releaseBoard } = await import('../src/services/boardService.js');
    await releaseBoard(room.id);

    const kabirSocket = await openSocket(kabir.token);
    const joinResponse = await emitWithAck(kabirSocket, 'room:join', { roomCode: room.code });
    assert.equal(joinResponse.source, 'database');
    assert.equal(joinResponse.elements[0].id, 'persisted-stroke');

    ashaSocket.close();
    kabirSocket.close();
  });
});
