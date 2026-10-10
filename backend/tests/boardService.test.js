import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearBoard, readBoard, releaseBoard, removeElement, upsertElement } from '../src/services/boardService.js';

const ROOM_ID = 'room-for-tests';

function penStroke(id, updatedAt) {
  return { id, type: 'pen', points: [{ x: 0, y: 0 }], color: '#111827', strokeWidth: 3, updatedAt };
}

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
