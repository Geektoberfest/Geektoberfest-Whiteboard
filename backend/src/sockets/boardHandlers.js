import * as boardService from '../services/boardService.js';
import {
  addMemberToRoom,
  assertRoomIsJoinable,
  findRoomByCode,
} from '../services/roomService.js';
import { ApiError } from '../utils/ApiError.js';
import { sanitizeElement, sanitizeElementId } from '../utils/elements.js';
import { broadcastPresence, getParticipants } from './presence.js';

// Anything the server did not expect is reported to the offending socket only,
// so one bad client cannot spam everybody else in the room.
function rejectSocket(socket, error) {
  const message = error.statusCode ? error.message : 'That change could not be applied.';
  socket.emit('app:error', { message });
}

function releaseBoardIfEmpty(io, socket) {
  const roomCode = socket.data.roomCode;
  const roomId = socket.data.roomId;
  if (!roomCode) return;

  if (!io.sockets.adapter.rooms.get(roomCode)?.size) {
    boardService.releaseBoard(roomId).catch((error) => {
      console.error('[board] Could not release room snapshot:', error.message);
    });
  }
}

export function registerBoardHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:join', async (payload = {}, ack) => {
      try {
        const room = await findRoomByCode(payload.roomCode);
        assertRoomIsJoinable(room, socket.data.user.id);

        if (addMemberToRoom(room, socket.data.user.id)) {
          await room.save();
        }

        if (socket.data.roomCode && socket.data.roomCode !== room.code) {
          const previousRoomCode = socket.data.roomCode;
          const previousRoomId = socket.data.roomId;
          await socket.leave(previousRoomCode);
          socket.data.roomCode = null;
          socket.data.roomId = null;
          socket.to(previousRoomCode).emit('presence:left', { participantId: socket.data.user.id });
          broadcastPresence(io, previousRoomCode);
          if (!io.sockets.adapter.rooms.get(previousRoomCode)?.size) {
            await boardService.releaseBoard(previousRoomId);
          }
        }

        await socket.join(room.code);
        socket.data.roomCode = room.code;
        socket.data.roomId = room._id.toString();

        const { elements, source } = await boardService.readBoard(socket.data.roomId);
        ack?.({
          ok: true,
          room: room.toPublicJSON(),
          elements,
          source,
          participants: getParticipants(io, room.code),
        });

        socket.to(room.code).emit('presence:joined', { participant: socket.data.user });
        broadcastPresence(io, room.code);
      } catch (error) {
        ack?.({ ok: false, message: error.statusCode ? error.message : 'Could not join that room.' });
      }
    });

    socket.on('room:leave', async () => {
      try {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      await socket.leave(roomCode);

      socket.to(roomCode).emit('presence:left', { participantId: socket.data.user.id });
      broadcastPresence(io, roomCode);
      releaseBoardIfEmpty(io, socket);
      socket.data.roomCode = null;
      } catch (error) { rejectSocket(socket, error); }
    });

    socket.on('board:sync', async (ack) => {
      try {
      if (!socket.data.roomCode) {
        ack?.({ ok: false, message: 'Join a room before syncing.' });
        return;
      }

      const { elements } = await boardService.readBoard(socket.data.roomId);
      ack?.({ ok: true, elements });
      } catch (error) { ack?.({ ok: false, message: 'Could not load the board.' }); rejectSocket(socket, error); }
    });

    socket.on('board:element:upsert', (payload = {}) => {
      if (!socket.data.roomCode) {
        rejectSocket(socket, ApiError.badRequest('Join a room before drawing.'));
        return;
      }

      const cleanElement = sanitizeElement({ ...(payload?.element || {}), updatedBy: socket.data.user.id });
      if (!cleanElement) {
        rejectSocket(socket, ApiError.badRequest('That element is not valid.'));
        return;
      }

      boardService.upsertElement(socket.data.roomId, cleanElement);
      io.to(socket.data.roomCode).emit('board:element:upsert', { element: cleanElement });
    });

    socket.on('board:element:delete', (payload = {}) => {
      if (!socket.data.roomCode) {
        rejectSocket(socket, ApiError.badRequest('Join a room before deleting.'));
        return;
      }

      const elementId = payload?.elementId;
      if (!sanitizeElementId(elementId)) {
        rejectSocket(socket, ApiError.badRequest('That element id is not valid.'));
        return;
      }

      if (boardService.removeElement(socket.data.roomId, elementId)) {
        io.to(socket.data.roomCode).emit('board:element:delete', { elementId });
      }
    });

    socket.on('board:clear', () => {
      if (!socket.data.roomCode) {
        rejectSocket(socket, ApiError.badRequest('Join a room before clearing.'));
        return;
      }

      boardService.clearBoard(socket.data.roomId);
      io.to(socket.data.roomCode).emit('board:clear');
    });

    socket.on('chat:send', (payload = {}, ack) => {
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!socket.data.roomCode) {
        ack?.({ ok: false, message: 'Join a room before chatting.' });
        return;
      }
      if (!text || text.length > 1000) {
        ack?.({ ok: false, message: 'Messages must contain 1 to 1000 characters.' });
        return;
      }
      const message = {
        id: `${socket.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        user: socket.data.user,
        text,
        createdAt: new Date().toISOString(),
      };
      io.to(socket.data.roomCode).emit('chat:message', message);
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      socket.to(roomCode).emit('presence:left', { participantId: socket.data.user.id });
      broadcastPresence(io, roomCode);
      releaseBoardIfEmpty(io, socket);
      socket.data.roomCode = null;
    });

    socket.on('error', (error) => {
      console.error('[socket] Client socket error:', error.message);
    });
  });
}
