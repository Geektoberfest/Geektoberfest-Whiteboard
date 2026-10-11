import { io } from 'socket.io-client';
import { createSocketOptions } from './socketOptions.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  throw new Error('VITE_SOCKET_URL is required. Set it in the frontend environment before starting or building the app.');
}

let socket = null;

/** One connection per browser tab, reused for the lifetime of the room page. */
export function getSocket(token) {
  if (socket && socket.auth?.token !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, createSocketOptions(token));
  }

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
