import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '../src/utils/roomCode.js';

describe('room codes', () => {
  it('generates six characters from the unambiguous alphabet', () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const code = generateRoomCode();

      assert.equal(code.length, 6);
      assert.ok(isValidRoomCode(code), `${code} should be valid`);
      assert.ok(!/[01O]/.test(code), `${code} should avoid ambiguous characters`);
    }
  });

  it('does not repeat itself over a small sample', () => {
    const codes = new Set(Array.from({ length: 500 }, generateRoomCode));

    assert.equal(codes.size, 500);
  });

  it('normalises the casing and surrounding spaces a user might type', () => {
    assert.equal(normalizeRoomCode('  k7p2qx '), 'K7P2QX');
  });

  it('rejects malformed codes', () => {
    assert.equal(isValidRoomCode('ABC'), false);
    assert.equal(isValidRoomCode('ABCDEFG'), false);
    assert.equal(isValidRoomCode('ABC-12'), false);
    assert.equal(isValidRoomCode(123456), false);
  });
});
