/** Every connected participant of a room, deduplicated by user id. */
export function getParticipants(io, roomCode) {
  const socketIds = io.sockets.adapter.rooms.get(roomCode);
  if (!socketIds) return [];

  const participants = new Map();
  for (const socketId of socketIds) {
    const participant = io.sockets.sockets.get(socketId)?.data?.user;
    if (participant) participants.set(participant.id, participant);
  }

  return [...participants.values()];
}

export function broadcastPresence(io, roomCode) {
  io.to(roomCode).emit('presence:list', { participants: getParticipants(io, roomCode) });
}
