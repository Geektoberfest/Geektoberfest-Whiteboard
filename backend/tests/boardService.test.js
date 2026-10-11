import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { Board } from '../src/models/Board.js';
import {
  clearBoard,
  readBoard,
  releaseBoard,
  removeElement,
  upsertElement,
} from '../src/services/boardService.js';

const ROOM_ID = 'room-for-tests';
const MONGO_ID = '507f1f77bcf86cd799439011';

function penStroke(id, updatedAt) {
  return { id, type: 'pen', points: [{ x: 0, y: 0 }], color: '#111827', strokeWidth: 3, updatedAt };
}

function mockQuery(elements) {
  return {
    lean: async () =>
      Promise.resolve({
        _id: MONGO_ID,
        room: MONGO_ID,
        elements,
      }),
  };
}

describe('persisted board state', () => {
  let originalFindOne;

  before(() => {
    originalFindOne = Board.findOne;
  });

  after(() => {
    Board.findOne = originalFindOne;
  });

  it('returns every element from a MongoDB snapshot, including the first', async () => {
    Board.findOne = () => mockQuery([
      penStroke('first', 1),
      penStroke('second', 2),
      penStroke('third', 3),
    ]);

    const { elements, source } = await readBoard(MONGO_ID);

    assert.equal(source, 'database');
    assert.equal(elements.length, 3);
    assert.equal(elements[0].id, 'first');
    assert.equal(elements[1].id, 'second');
    assert.equal(elements[2].id, 'third');
  });

  it('returns an empty array when the snapshot has no elements', async () => {
    Board.findOne = () => mockQuery([]);

    const { elements, source } = await readBoard(MONGO_ID);

    assert.equal(source, 'empty');
    assert.equal(elements.length, 0);
  });

  it('returns an empty array when no board snapshot exists in the database', async () => {
    Board.findOne = () => ({
      lean: async () => Promise.resolve(null),
    });

    const { elements, source } = await readBoard(MONGO_ID);

    assert.equal(source, 'empty');
    assert.equal(elements.length, 0);
  });
});

describe('in-memory board state', () => {
  it('adds an element and then replaces it in place', async () => {
    releaseBoard(ROOM_ID);
    upsertElement(ROOM_ID, penStroke('a', 1));
    upsertElement(ROOM_ID, penStroke('a', 2));
    upsertElement(ROOM_ID, penStroke('b', 3));

    const { elements } = await readBoard(ROOM_ID);

    assert.equal(elements.length, 2);
    assert.equal(elements.find((element) => element.id === 'a').updatedAt, 2);
  });

  it('reports whether a delete actually removed something', () => {
    releaseBoard(ROOM_ID);
    upsertElement(ROOM_ID, penStroke('a', 1));

    assert.equal(removeElement(ROOM_ID, 'a'), true);
    assert.equal(removeElement(ROOM_ID, 'a'), false);
  });

  it('clears every element but keeps the room available for new strokes', () => {
    releaseBoard(ROOM_ID);
    upsertElement(ROOM_ID, penStroke('a', 1));
    upsertElement(ROOM_ID, penStroke('b', 2));

    clearBoard(ROOM_ID);
    assert.equal(removeElement(ROOM_ID, 'a'), false);

    upsertElement(ROOM_ID, penStroke('c', 3));
    assert.equal(removeElement(ROOM_ID, 'c'), true);
  });

  it('drops the room once the last collaborator leaves', () => {
    releaseBoard(ROOM_ID);
    upsertElement(ROOM_ID, penStroke('a', 1));
    releaseBoard(ROOM_ID);

    // A fresh entry starts empty, which is what a rejoining collaborator gets.
    assert.equal(removeElement(ROOM_ID, 'a'), false);
  });
});
