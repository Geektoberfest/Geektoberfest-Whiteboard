import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeElement, sanitizeElementId } from '../src/utils/elements.js';

describe('sanitizeElement', () => {
  it('keeps a valid pen stroke and stamps the author', () => {
    const element = sanitizeElement({
      id: 'pen-1',
      type: 'pen',
      color: '#ff0000',
      strokeWidth: 5,
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    });

    assert.equal(element.id, 'pen-1');
    assert.equal(element.type, 'pen');
    assert.equal(element.color, '#ff0000');
    assert.equal(element.updatedBy, null);
    assert.ok(typeof element.updatedAt === 'number');
    assert.deepEqual(element.points, [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it('drops fields the client is not allowed to set', () => {
    const element = sanitizeElement({
      id: 'rect-1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      secret: 'do not store me',
    });

    assert.equal(element.secret, undefined);
    assert.equal(element.width, 10);
  });

  it('rejects an unknown element type', () => {
    assert.equal(sanitizeElement({ id: 'a', type: 'hacked' }), null);
  });

  it('rejects a pen stroke without points', () => {
    assert.equal(sanitizeElement({ id: 'a', type: 'pen', points: [] }), null);
  });

  it('preserves the points of a long pen stroke (WB-01)', () => {
    const points = Array.from({ length: 2000 }, (_, i) => ({ x: i, y: i }));
    const element = sanitizeElement({ id: 'long-pen', type: 'pen', points });

    assert.equal(element.points.length, 2000);
    assert.deepEqual(element.points.at(-1), { x: 1999, y: 1999 });
  });

  it('rejects a non numeric coordinate', () => {
    assert.equal(sanitizeElement({ id: 'a', type: 'rectangle', x: 'left', y: 0 }), null);
  });

  it('clamps coordinates that would move a stroke off the board', () => {
    const element = sanitizeElement({ id: 'a', type: 'line', x: -9e9, y: 0, x2: 9e9, y2: 0 });

    assert.equal(element.x, -100000);
    assert.equal(element.x2, 100000);
  });

  it('falls back to a default colour when the hex value is unusable', () => {
    const element = sanitizeElement({
      id: 'a',
      type: 'rectangle',
      x: 0,
      y: 0,
      color: 'javascript:alert(1)',
    });

    assert.match(element.color, /^#[0-9a-f]{6}$/);
  });

  it('normalizes box elements drawn toward the upper-left', () => {
    const element = sanitizeElement({ id: 'a', type: 'sticky', x: 80, y: 60, width: -50, height: -30 });

    assert.equal(element.x, 30);
    assert.equal(element.y, 30);
    assert.equal(element.width, 50);
    assert.equal(element.height, 30);
  });

  it('keeps zero-sized box elements above the minimum', () => {
    const element = sanitizeElement({ id: 'a', type: 'sticky', x: 0, y: 0, width: 0, height: 0 });

    assert.equal(element.width, 1);
    assert.equal(element.height, 1);
  });
});

describe('sanitizeElementId', () => {
  it('accepts a normal id and rejects anything else', () => {
    assert.equal(sanitizeElementId('element-42'), 'element-42');
    assert.equal(sanitizeElementId(42), null);
    assert.equal(sanitizeElementId(''), null);
    assert.equal(sanitizeElementId('x'.repeat(65)), null);
  });
});
