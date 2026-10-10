# Multi-User Collaborative Whiteboard

A room-based whiteboard for authenticated collaborators. Users create or join rooms and draw together in real time. The project is part of the Geekstober open-source contribution event and includes deliberately seeded, documented issues for contributors; see [CONTRIBUTING.md](CONTRIBUTING.md).

This repository is a learning and contribution project. Its features and deployment have not been represented as production-ready.

## Features

- Email/password registration and login; passwords are stored as bcrypt hashes and sessions use signed JWTs.
- Public and private rooms with six-character room codes. Public rooms can be joined by signed-in users; private rooms are limited to their owner and members.
- Collaborative freehand pen, line, arrow, rectangle, ellipse, text, and sticky-note objects; color and stroke-width controls; selection, moving, resizing, and erasing.
- Shared undo/redo actions, board clear, PNG export, and a room chat for connected users.
- Socket.IO drawing updates, a participant roster, and room-scoped live messages.
- Board snapshots saved to MongoDB and loaded for later room visits. Chat messages and active participant state are not persisted.
- Account dashboard listing rooms the user owns or has joined.

No admin portal or separate durable chat history is implemented. Undo/redo is maintained in each browser tab and broadcasts the resulting board changes; it is not a server-managed per-user history.

## Technology

- Frontend: React 19, Vite, React Router, Tailwind CSS, Axios, Socket.IO Client.
- Backend: Node.js (18.17 or newer), Express 4, Socket.IO 4, Mongoose 8, MongoDB.
- Authentication and validation: JSON Web Tokens, bcryptjs, express-validator, Helmet, and express-rate-limit.
- Tests: Node's built-in test runner, Supertest, and Socket.IO Client.

## Repository layout

```text
backend/
  src/
    config/       Environment parsing and MongoDB connection
    controllers/  Registration, login, and room HTTP handlers
    middleware/   JWT authentication, request validation, and errors
    models/       User, Room, and Board schemas
    routes/       /api health, auth, and room routes
    services/     Room membership, token, and board snapshot logic
    sockets/      Authenticated Socket.IO room, board, chat, and presence handlers
    utils/        Element validation, room codes, colors, and helpers
  tests/          API, auth, room, socket, persistence, and utility tests
frontend/
  src/
    components/   Shared UI and whiteboard controls/canvas
    constants/    Tool definitions
    context/      Authentication state
    hooks/        Collaborative room state and local history
    pages/        Landing, auth, dashboard, and room screens
    services/     REST and Socket.IO clients
    utils/        Canvas drawing, element, geometry, and clipboard helpers
```

## Requirements and setup

Install Node.js 18.17+ and npm, plus a reachable MongoDB database (local MongoDB or Atlas). The frontend and backend are separate npm projects and each has its own lockfile. There is no root `package.json` or root start script.

```bash
git clone https://github.com/Vansh-Maindiratta/MultiUser-board.git
cd MultiUser-board

# Backend terminal
cd backend
npm ci
cp .env.example .env
# Edit .env with a local MongoDB URI and a private JWT secret.
npm run dev
```

In a second terminal from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env.local
# For local use the sample URLs can be kept as-is.
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Register two accounts in separate browser profiles, create a public room in one, and join it with the other using its six-character code. Both clients should see the same room's drawing and presence updates. Private rooms require the owner or a previously authorized member.

### Environment variables

| Variable | Used by | Required | Purpose / example |
| --- | --- | --- | --- |
| `PORT` | Backend | Optional | HTTP and Socket.IO listen port; defaults to `5000`. Render supplies this in deployment. |
| `MONGODB_URI` | Backend | Yes | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/geekstober-whiteboard`. For Atlas, use the URI from the database deployment. |
| `JWT_SECRET` | Backend | Yes | Private signing key. Generate a long random value; never use the example placeholder in a deployed environment. |
| `JWT_EXPIRES_IN` | Backend | Optional | `jsonwebtoken` expiry, default `7d` (for example `1d`). |
| `CLIENT_URL` | Backend | Yes | Comma-separated allowed browser origins without paths, e.g. `http://localhost:5173` or `https://your-app.vercel.app`. Set exact production frontend origins. |
| `NODE_ENV` | Backend | Optional | Defaults to `development`; set `production` in deployment. Development mode additionally permits HTTP localhost/loopback origins. |
| `TEST_MONGODB_URI` | Backend tests | Optional | Enables MongoDB-backed API and Socket.IO integration suites. Use a dedicated test database URI; the suites drop that database after running. |
| `TEST_DATABASE_NAME` | Backend tests | Optional | Database name used by integration suites; defaults to `geekstober-whiteboard-test`. Keep it isolated and disposable. |
| `VITE_API_URL` | Frontend | Yes | REST base URL including `/api`, e.g. `http://localhost:5000/api`. Set the deployed Render URL plus `/api` for the production build. |
| `VITE_SOCKET_URL` | Frontend | Yes | Backend origin for Socket.IO, e.g. `http://localhost:5000`; set the deployed Render origin for production. |

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env.local`. Vite variables are embedded at build time. A production Vite build fails unless both `VITE_API_URL` and `VITE_SOCKET_URL` are configured. `.env` files are ignored by Git; do not commit real secrets.

## Architecture and data flow

The React room page obtains a Socket.IO connection using the stored JWT. The backend verifies the token on the socket handshake. For `room:join`, the server loads the room by code, checks `Room.canBeJoinedBy`, joins the socket to that room, returns the current board and participants in the acknowledgement, then broadcasts presence. When a socket switches rooms, the server removes it from its prior room before joining the next one.

Drawing operations are created and previewed in the browser. The client sends complete elements to the authenticated server; the server sanitizes supported fields and values, records the element in that room's in-memory board, persists a MongoDB snapshot asynchronously, then emits the sanitized operation only to the socket's authorized room. Deletes and clear follow the same room-scoped pattern. New joiners receive the active in-memory state, or a saved MongoDB snapshot when no active board exists. Room membership, authorization, sanitization, persistence, and broadcasts are server-side; canvas previews and undo/redo stacks are client-side.

MongoDB models:

- `User`: name, normalized email, bcrypt password hash (excluded from normal selection), and display color.
- `Room`: name, unique code, owner, member IDs, and `public`/`private` visibility.
- `Board`: unique room reference and an array of sanitized drawing elements.

## HTTP API

All routes are mounted below `/api`. Protected routes require `Authorization: Bearer <JWT>`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Reports process uptime and whether MongoDB is connected; responds `503` when the database is unavailable. |
| `POST /auth/register` | Public, rate limited | Body: `{ "name", "email", "password" }`; creates an account and returns `{ token, user }`. Password minimum is eight characters. |
| `POST /auth/login` | Public, rate limited | Body: `{ "email", "password" }`; returns `{ token, user }` or a generic `401`. |
| `GET /auth/me` | JWT | Returns the current public user. |
| `GET /rooms` | JWT | Lists rooms owned by or joined by the current user. |
| `POST /rooms` | JWT | Body: `{ "name", "visibility?" }`; creates a room (visibility defaults to public) and returns its public summary. |
| `GET /rooms/:roomId` | JWT | Reads a room by its six-character code after checking the caller may join it. |
| `POST /rooms/:roomId/join` | JWT | Checks access and adds the caller to room membership if needed. |

Validation failures use a JSON error response with `success: false` and a message. Missing/invalid credentials return `401`; a non-member requesting a private room returns `403`; unknown rooms return `404`; duplicate email returns `409`.

## Socket.IO events

The client connects to `VITE_SOCKET_URL` with handshake auth `{ "token": "<JWT>" }`. Socket authentication is required. Events are scoped to the room established by a successful `room:join`.

| Direction and event | Payload / acknowledgement | Behavior |
| --- | --- | --- |
| Client → `room:join` | `{ roomCode }`; ack `{ ok, room, elements, source, participants }` or `{ ok: false, message }` | Authenticates room membership, joins it, and loads board state. `source` is `active-room`, `database`, or `empty`. |
| Client → `room:leave` | No payload or ack | Leaves current room and refreshes its presence roster. |
| Client → `board:sync` | Ack `{ ok, elements }` or `{ ok: false, message }` | Reads the current room board; requires prior room join. |
| Client → `board:element:upsert` | `{ element }` | Server sanitizes and stores an element, then broadcasts `{ element }` as `board:element:upsert` to that room. Invalid elements produce `app:error` to sender. |
| Client → `board:element:delete` | `{ elementId }` | Removes an element if it exists; successful removal broadcasts the same event and `{ elementId }` to the room. |
| Client → `board:clear` | No payload | Clears the current room and broadcasts `board:clear`. |
| Client → `chat:send` | `{ text }`; ack `{ ok: true }` or `{ ok: false, message }` | Trims and validates 1–1000 characters; sends a live `chat:message` to room participants. Messages are not saved. |
| Server → `presence:list` | `{ participants: [{ id, name, color }] }` | Full current connected participant list, deduplicated by user. |
| Server → `presence:joined` | `{ participant: { id, name, color } }` | Announces a join to existing room participants. |
| Server → `presence:left` | `{ participantId }` | Announces a leave or disconnect. |
| Server → `app:error` | `{ message }` | Reports a recoverable rejected socket action to its sender. |

## Tests and build checks

There is no frontend test or lint script. Backend tests use Node's test runner; the collaboration suites that exercise MongoDB require a reachable database and use an isolated test database.

```bash
cd backend
npm test

cd ../frontend
npm run build
```

Run each command in its own project directory. See [CONTRIBUTING.md](CONTRIBUTING.md) for issue-specific scenarios and browser testing guidance.

## Deployment

The repository contains `frontend/vercel.json` for SPA route rewriting. It has no Render service manifest, and deployment has not been performed or verified.

**Vercel frontend:** Set the project root to `frontend`, build with `npm run build`, and use `dist` as the output directory. Configure `VITE_API_URL=https://<your-render-service>/api` and `VITE_SOCKET_URL=https://<your-render-service>` before building. The current production Vite config requires both values.

**Render backend:** Set the service root to `backend`, install with `npm ci`, and start with `npm start`. Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (the exact Vercel origin), and `NODE_ENV=production`; Render supplies `PORT`. The server accepts the configured origin for both Express CORS and Socket.IO and uses Socket.IO's standard transports. The selected Render service must support long-lived Socket.IO connections.

**MongoDB Atlas:** Create a database user with only the privileges needed for the application, allow the Render service's outbound network according to Atlas network-access policy, and set `MONGODB_URI` in Render. Never put credentials in this repository. Check `/api/health` for database connectivity, then sign in from the deployed frontend, join the same test room in two sessions, and verify drawing, presence, and room isolation.

## Troubleshooting

- **Backend exits before listening:** Check that `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` are set in `backend/.env`. Review the backend's startup message without sharing secret values.
- **MongoDB auth or network errors:** Verify the Atlas database username/password encoded in the URI, database user permissions, IP/network access, and the URI's database name. `/api/health` reports `503` if MongoDB is unavailable.
- **Socket connection fails:** Check `VITE_SOCKET_URL`, that the backend is listening, and that `CLIENT_URL` contains the frontend origin. Socket handshake authentication requires a valid JWT.
- **CORS errors:** Set `CLIENT_URL` to the exact origin (scheme and host, no path); multiple origins are comma-separated. Development permits localhost loopback HTTP origins; production does not.
- **Production calls localhost:** Vite variables are compiled into the bundle. Set the Render URL in Vercel's build environment and redeploy.
- **Room join denied:** Confirm the code has six letters/digits, the user is signed in, and the caller is the owner or a member for a private room.
- **Reconnect does not recover:** The socket reconnect behavior is an intentionally seeded contribution issue (WB-06); see the catalogue. The current seeded client currently does not retry after a transport disconnect.
- **Vercel build fails:** Configure bot

## Contributing and license

Start with the [contributor handbook](CONTRIBUTING.md), which documents the eight intentional issues, setup, test commands, and pull request checklist. Check the repository's issue tracker and event claiming process before taking work; the catalogue itself does not mean GitHub issues have been published or assigned.

The repository includes an MIT license; see [LICENSE](LICENSE).
