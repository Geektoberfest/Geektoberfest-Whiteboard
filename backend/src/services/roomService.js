import { Room } from '../models/Room.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidRoomCode, normalizeRoomCode } from '../utils/roomCode.js';

export async function findRoomByCode(code) {
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCode(normalized)) {
    throw ApiError.badRequest('Room codes are made of six letters and numbers.');
  }

  const room = await Room.findOne({ code: normalized });
  if (!room) throw ApiError.notFound('That room does not exist or has been deleted.');

  return room;
}

export function assertRoomIsJoinable(room, userId) {
  if (!room.canBeJoinedBy(userId)) {
    throw ApiError.forbidden('This room is private. Ask the owner for an invitation.');
  }
}

/** Public rooms collect everyone who joins, so the dashboard can list them later. */
export function addMemberToRoom(room, userId) {
  const isAlreadyMember = room.members.some((member) => member._id.toString() === userId.toString());
  if (isAlreadyMember) return false;

  room.members.push(userId);
  return true;
}

export function listRoomsForUser(userId) {
  return Room.find({ $or: [{ owner: userId }, { members: userId }] }).sort({ updatedAt: -1 });
}
