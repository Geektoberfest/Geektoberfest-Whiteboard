import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Correct pointer-to-canvas coordinate conversion for the Geektoberfest
 * whiteboard.
 *
 * The canvas backing store is scaled by devicePixelRatio and the 2D context
 * is transformed with setTransform(ratio, 0, 0, ratio, 0, 0), so all drawing
 * and hit-testing operates in CSS pixels. Pointer events must therefore be
 * converted to CSS-pixels relative to the canvas's displayed bounds — without
 * any devicePixelRatio multiplication.
 *
 * This module exists as a regression reference for Issue #7:
 * https://github.com/Geektoberfest/Geektoberfest-Whiteboard/issues/7
 *
 * The bug was that toPoint() multiplied by devicePixelRatio, producing
 * backing-store-pixel coordinates that were ratio× too large on Retina
 * displays.
 */

/**
 * Convert a pointer event's client coordinates to logical canvas coordinates.
 *
 * @param {number} clientX - Pointer clientX
 * @param {number} clientY - Pointer clientY
 * @param {DOMRect} rect - canvas.getBoundingClientRect()
 * @param {number} devicePixelRatio - window.devicePixelRatio (unused in correct impl)
 * @returns {{ x: number, y: number }} Logical canvas coordinates in CSS pixels
 */
export function pointerToCanvasCoords(clientX, clientY, rect, devicePixelRatio) {
  // The correct conversion uses CSS pixels only. devicePixelRatio is reported
  // for observability but must NOT be applied to the result.
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * The buggy version that multiplied by devicePixelRatio. Kept here only so
 * regression tests can assert that the buggy formula produces wrong results.
 */
export function pointerToCanvasCoordsBuggy(clientX, clientY, rect, devicePixelRatio) {
  return {
    x: (clientX - rect.left) * devicePixelRatio,
    y: (clientY - rect.top) * devicePixelRatio,
  };
}

describe('pointer coordinate conversion (Issue #7)', () => {
  const dpr1 = 1;
  const dpr2 = 2;

  it('maps a pointer at the canvas origin to (0, 0) on standard-density displays', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, topLeft: {}, topRight: {}, bottomLeft: {}, bottomRight: {}, width: 800, height: 600, x: 100, y: 50 };
    const result = pointerToCanvasCoords(100, 50, rect, dpr1);
    assert.deepStrictEqual(result, { x: 0, y: 0 });
  });

  it('maps a pointer at the canvas center to the logical center on standard-density displays', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50 };
    const result = pointerToCanvasCoords(500, 350, rect, dpr1);
    assert.deepStrictEqual(result, { x: 400, y: 300 });
  });

  it('maps a pointer near each canvas edge correctly on standard-density displays', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50 };
    assert.deepStrictEqual(pointerToCanvasCoords(100, 50, rect, dpr1), { x: 0, y: 0 });
    assert.deepStrictEqual(pointerToCanvasCoords(900, 50, rect, dpr1), { x: 800, y: 0 });
    assert.deepStrictEqual(pointerToCanvasCoords(100, 650, rect, dpr1), { x: 0, y: 600 });
    assert.deepStrictEqual(pointerToCanvasCoords(900, 650, rect, dpr1), { x: 800, y: 600 });
  });

  it('produces the same CSS-pixel result regardless of devicePixelRatio (Retina)', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50 };
    const correctDPR1 = pointerToCanvasCoords(500, 350, rect, dpr1);
    const correctDPR2 = pointerToCanvasCoords(500, 350, rect, dpr2);
    assert.deepStrictEqual(correctDPR1, { x: 400, y: 300 });
    assert.deepStrictEqual(correctDPR2, { x: 400, y: 300 });
    assert.deepStrictEqual(correctDPR1, correctDPR2, 'Result must be identical at DPR 1 and DPR 2');
  });

  it('the buggy version scales incorrectly on Retina displays', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50 };
    const buggyDPR1 = pointerToCanvasCoordsBuggy(500, 350, rect, dpr1);
    const buggyDPR2 = pointerToCanvasCoordsBuggy(500, 350, rect, dpr2);
    assert.deepStrictEqual(buggyDPR1, { x: 400, y: 300 });
    assert.deepStrictEqual(buggyDPR2, { x: 800, y: 600 }, 'Buggy version doubles coordinates at DPR 2');
    assert.notDeepStrictEqual(buggyDPR1, buggyDPR2, 'Buggy version produces different results at different DPR');
  });

  it('the buggy version would displace a center pointer on a DPR-2 display', () => {
    const rect = { left: 100, top: 50, width: 800, height: 600, right: 900, bottom: 650, x: 100, y: 50 };
    const correct = pointerToCanvasCoords(500, 350, rect, dpr2);
    const buggy = pointerToCanvasCoordsBuggy(500, 350, rect, dpr2);
    assert.deepStrictEqual(correct, { x: 400, y: 300 });
    assert.deepStrictEqual(buggy, { x: 800, y: 600 });
    // On a DPR-2 display, the buggy version reports the center pointer as
    // being at (800, 600) — the bottom-right corner — instead of (400, 300).
    assert.notStrictEqual(buggy.x, correct.x);
    assert.notStrictEqual(buggy.y, correct.y);
  });

  it('conversion is independent of canvas backing-store dimensions', () => {
    // Canvas backing store is 1600×1200 at DPR 2, but pointer coords are
    // computed from the CSS display size (800×600) and getBoundingClientRect.
    const rect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0 };
    const result = pointerToCanvasCoords(400, 300, rect, dpr2);
    assert.deepStrictEqual(result, { x: 400, y: 300 });
  });
});
