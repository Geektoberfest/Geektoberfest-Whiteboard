# Backend

Express REST API and Socket.IO server. Run `npm install`, copy `.env.example` to `.env`, configure
MongoDB and JWT settings, then run `npm run dev`. `npm start` starts the production server and
`npm test` runs Node's built-in test runner. The server connects to MongoDB before listening and
serves `/api/health` with the current database state.

Set `CLIENT_URL` to the allowed frontend origin(s). Board updates are persisted as MongoDB
snapshots. Socket.IO requires a deployment host that supports long-lived WebSocket connections.
