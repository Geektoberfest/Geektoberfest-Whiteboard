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

  it('preserves every point in a 501-point pen stroke', () => {
    const points = Array.from({ length: 501 }, (_, index) => ({ x: index, y: index * 2 }));
    const element = sanitizeElement({ id: 'pen-501', type: 'pen', points });

    assert.equal(element.points.length, 501);
    assert.deepEqual(element.points.at(-1), { x: 500, y: 1_000 });
  });

  it('preserves a 2,000-point pen stroke in order with its metadata', () => {
    const points = Array.from({ length: 2_000 }, (_, index) => ({ x: index, y: index * 3 }));
    const stroke = { id: 'long-pen', type: 'pen', color: '#2563eb', strokeWidth: 5, points };

    const element = sanitizeElement(stroke);

    assert.equal(element.points.length, points.length);
    assert.deepEqual(element.points[0], points[0]);
    assert.deepEqual(element.points[1_000], points[1_000]);
    assert.deepEqual(element.points.at(-1), points.at(-1));
    assert.equal(element.id, stroke.id);
    assert.equal(element.color, stroke.color);
    assert.equal(element.strokeWidth, stroke.strokeWidth);
  });

  it('preserves a pen stroke at the configured point cap', () => {
    const points = Array.from({ length: 10_000 }, (_, index) => ({ x: index, y: index }));
    const element = sanitizeElement({ id: 'pen-at-cap', type: 'pen', points });

    assert.equal(element.points.length, 10_000);
    assert.deepEqual(element.points.at(-1), { x: 9_999, y: 9_999 });
  });

  it('keeps the configured finite cap for oversized pen strokes', () => {
    const points = Array.from({ length: 10_001 }, (_, index) => ({ x: index, y: index }));
    const element = sanitizeElement({ id: 'oversized-pen', type: 'pen', points });

    assert.equal(element.points.length, 10_000);
    assert.deepEqual(element.points.at(-1), { x: 9_999, y: 9_999 });
  });

  it('filters invalid pen points and clamps valid out-of-range coordinates', () => {
    const element = sanitizeElement({
      id: 'mixed-pen',
      type: 'pen',
      points: [
        { x: 1, y: 2 },
        { x: Number.NaN, y: 3 },
        { x: 4, y: Infinity },
        { x: 'not-a-coordinate', y: 5 },
        { x: 200_000, y: -200_000 },
      ],
    });

    assert.deepEqual(element.points, [
      { x: 1, y: 2 },
      { x: 100_000, y: -100_000 },
    ]);
  });

  it('rejects a pen stroke when every point is invalid', () => {
    const element = sanitizeElement({
      id: 'broken-pen',
      type: 'pen',
      points: [
        { x: Number.NaN, y: 0 },
        { x: 0, y: Infinity },
        { x: 'nope', y: 'nope' },
        null,
      ],
    });

    assert.equal(element, null);
  });

  it('continues to sanitize non-pen element types', () => {
    const elements = [
      { id: 'line', type: 'line', x: 1, y: 2, x2: 3, y2: 4 },
      { id: 'arrow', type: 'arrow', x: 1, y: 2, x2: 3, y2: 4 },
      { id: 'rectangle', type: 'rectangle', x: 1, y: 2, width: 3, height: 4 },
      { id: 'circle', type: 'circle', x: 1, y: 2, width: 3, height: 4 },
      { id: 'text', type: 'text', x: 1, y: 2, width: 3, height: 4, text: 'Hello' },
      { id: 'sticky', type: 'sticky', x: 1, y: 2, width: 3, height: 4, text: 'Note' },
    ];

    for (const input of elements) {
      const element = sanitizeElement(input);
      assert.equal(element.type, input.type);
      assert.equal(element.id, input.id);
    }
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
