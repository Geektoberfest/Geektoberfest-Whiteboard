# Frontend

React 19 single-page application built with Vite. Run `npm install`, copy `.env.example` to `.env`,
set `VITE_API_URL` (REST base URL including `/api`) and `VITE_SOCKET_URL` (backend origin), then run
`npm run dev`. Run `npm run build` for the production bundle and `npm run preview` to serve it locally.

The frontend is deployed independently from the backend; both Vite variables are embedded at build
time and must point to the deployed backend.
