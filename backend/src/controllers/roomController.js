import { Room } from '../models/Room.js';
import {
  addMemberToRoom,
  assertRoomIsJoinable,
  findRoomByCode,
  listRoomsForUser,
} from '../services/roomService.js';
import { ApiError } from '../utils/ApiError.js';
import { generateRoomCode } from '../utils/roomCode.js';

const CODE_GENERATION_ATTEMPTS = 5;

export async function createRoom(req, res) {
  const { name, visibility } = req.body;
  const owner = req.user._id;

  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateRoomCode();
    if (await Room.exists({ code })) continue;

    const room = await Room.create({ name, code, visibility, owner, members: [owner] });
    return res.status(201).json({ room: room.toPublicJSON() });
  }

  throw ApiError.conflict('Could not allocate a free room code. Please try again.');
}

export async function listRooms(req, res) {
  const rooms = await listRoomsForUser(req.user._id);
  res.json({ rooms: rooms.map((room) => room.toPublicJSON()) });
}

export async function getRoom(req, res) {
  const room = await findRoomByCode(req.params.roomId);
  assertRoomIsJoinable(room, req.user._id);
  res.json({ room: room.toPublicJSON() });
}

export async function joinRoom(req, res) {
  const room = await findRoomByCode(req.params.roomId);
  assertRoomIsJoinable(room, req.user._id);

  if (addMemberToRoom(room, req.user._id)) {
    await room.save();
  }

  res.json({ room: room.toPublicJSON() });
}
