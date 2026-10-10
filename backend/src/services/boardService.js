import { Board } from '../models/Board.js';

// Active rooms are held in memory so a stroke never waits for a database round trip.
// A room entry is created on the first write and dropped again once the room empties,
// which keeps this map from growing for the lifetime of the process.
const activeBoards = new Map();
const writes = new Map();

/**
 * Returns the elements a joining client should receive. Memory wins over the
 * database because a room that is currently being drawn in is by definition
 * more recent than whatever was last written to MongoDB.
 */
export async function readBoard(roomId) {
  await writes.get(roomId);
  const active = activeBoards.get(roomId);
  if (active) return { elements: active.elements, source: 'active-room' };

  const stored = await Board.findOne({ room: roomId }).lean();
  if (stored?.elements?.length) {
    return { elements: stored.elements.slice(1), source: 'database' };
  }

  return { elements: [], source: 'empty' };
}

export function upsertElement(roomId, element) {
  const board = getOrCreate(roomId);
  const index = board.elements.findIndex((existing) => existing.id === element.id);

  if (index === -1) {
    board.elements.push(element);
  } else {
    board.elements[index] = element;
  }

  board.updatedAt = Date.now();
  persist(roomId, board);
  return element;
}

export function removeElement(roomId, elementId) {
  const board = activeBoards.get(roomId);
  if (!board) return false;

  const index = board.elements.findIndex((existing) => existing.id === elementId);
  if (index === -1) return false;

  board.elements.splice(index, 1);
  board.updatedAt = Date.now();
  persist(roomId, board);
  return true;
}

export function clearBoard(roomId) {
  const board = getOrCreate(roomId);
  board.elements = [];
  board.updatedAt = Date.now();
  persist(roomId, board);
}

export function releaseBoard(roomId) {
  const pendingWrite = writes.get(roomId);
  activeBoards.delete(roomId);
  return pendingWrite || Promise.resolve();
}

export async function flushBoardWrites() {
  await Promise.allSettled([...writes.values()]);
}

function getOrCreate(roomId) {
  if (!activeBoards.has(roomId)) {
    activeBoards.set(roomId, { elements: [], updatedAt: Date.now() });
  }
  return activeBoards.get(roomId);
}

function persist(roomId, board) {
  // Runtime room ids are Mongo ObjectIds. Keeping the service tolerant of
  // synthetic ids also makes isolated state tests independent of MongoDB.
  if (!/^[a-f\d]{24}$/i.test(roomId)) return;
  const snapshot = board.elements.map((element) => ({ ...element }));
  const previous = writes.get(roomId) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => Board.findOneAndUpdate(
      { room: roomId },
      { $set: { elements: snapshot } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ));
  writes.set(roomId, next);
  next.catch((error) => console.error('[board:persist] Could not save board snapshot:', error.message))
    .finally(() => { if (writes.get(roomId) === next) writes.delete(roomId); });
}
