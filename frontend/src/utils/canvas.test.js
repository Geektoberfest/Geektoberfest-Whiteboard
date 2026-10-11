import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { drawElement } from './canvas.js';

// Lightweight mock Canvas 2D context that records drawing commands
function createMockContext() {
  const commands = [];

  return {
    commands,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    strokeStyle: '#000',
    fillStyle: '#000',
    textBaseline: 'alphabetic',
    font: '',

    save() { commands.push({ type: 'save' }); },
    restore() { commands.push({ type: 'restore' }); },

    beginPath() { commands.push({ type: 'beginPath' }); },
    moveTo(x, y) { commands.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { commands.push({ type: 'lineTo', x, y }); },
    stroke() { commands.push({ type: 'stroke' }); },
    fill() { commands.push({ type: 'fill' }); },

    fillRect() {},
    strokeRect() {},

    measureText() { return { width: 0 }; },
    setLineDash() {},
  };
}

// Group commands into paths, each starting with beginPath
function groupPaths(commands) {
  const paths = [];
  let currentPath = null;

  for (const cmd of commands) {
    if (cmd.type === 'beginPath') {
      currentPath = [];
      paths.push(currentPath);
    } else if (currentPath !== null && (cmd.type === 'moveTo' || cmd.type === 'lineTo')) {
      currentPath.push(cmd);
    }
  }

  return paths;
}

function epsilonEquals(a, b, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

function assertPointEquals(actual, expected, msg) {
  assert.ok(
    epsilonEquals(actual.x, expected.x) && epsilonEquals(actual.y, expected.y),
    `${msg}: expected (${expected.x}, ${expected.y}), got (${actual.x}, ${actual.y})`,
  );
}

function findShaftPath(paths, x1, y1, x2, y2) {
  for (const path of paths) {
    const first = path[0];
    const last = path[path.length - 1];
    if (
      first && first.type === 'moveTo' &&
      epsilonEquals(first.x, x1) && epsilonEquals(first.y, y1) &&
      last && last.type === 'lineTo' &&
      epsilonEquals(last.x, x2) && epsilonEquals(last.y, y2)
    ) {
      return path;
    }
  }
  return null;
}

function findArrowheadPath(paths, tipX, tipY) {
  for (const path of paths) {
    const first = path[0];
    if (
      first && first.type === 'moveTo' &&
      epsilonEquals(first.x, tipX) && epsilonEquals(first.y, tipY)
    ) {
      // Collect only lineTo segments after the first moveTo
      const lines = path.filter((c) => c.type === 'lineTo');
      if (lines.length === 2) {
        return path;
      }
    }
  }
  return null;
}

function drawArrowAndGetPaths(ctx, x1, y1, x2, y2) {
  const element = {
    type: 'arrow',
    x: x1, y: y1, x2, y2,
    strokeWidth: 2,
    color: '#000',
    fill: 'transparent',
  };
  ctx.commands.length = 0;
  drawElement(ctx, element);
  return groupPaths(ctx.commands);
}

function drawLineAndGetPaths(ctx, x1, y1, x2, y2) {
  const element = {
    type: 'line',
    x: x1, y: y1, x2, y2,
    strokeWidth: 2,
    color: '#000',
    fill: 'transparent',
  };
  ctx.commands.length = 0;
  drawElement(ctx, element);
  return groupPaths(ctx.commands);
}

function assertArrowheadPointsForward(shaftPath, arrowheadPath, tipX, tipY) {
  // Arrowhead tip should be at the shaft endpoint
  const shaftEnd = shaftPath[shaftPath.length - 1];
  assertPointEquals(arrowheadPath[0], { x: shaftEnd.x, y: shaftEnd.y }, 'Arrowhead tip');

  // The two base points of the arrowhead (extract lineTo segments)
  const lineTos = arrowheadPath.filter((c) => c.type === 'lineTo');
  assert.ok(lineTos.length === 2, `Expected 2 lineTo segments in arrowhead, got ${lineTos.length}`);
  const base1 = lineTos[0];
  const base2 = lineTos[1];
  assert.ok(base1 && base2, 'Arrowhead must have two base points');

  // Midpoint of base points
  const midX = (base1.x + base2.x) / 2;
  const midY = (base1.y + base2.y) / 2;

  // Forward direction from shaft start to tip
  const start = shaftPath[0];
  const dx = tipX - start.x;
  const dy = tipY - start.y;
  const len = Math.hypot(dx, dy);
  assert.ok(len > 0.01, 'Shaft must have non-zero length');

  const fx = dx / len;
  const fy = dy / len;

  // Vector from tip to midpoint — should point opposite to forward (i.e., behind tip)
  const mx = midX - tipX;
  const my = midY - tipY;
  const dot = mx * fx + my * fy;

  assert.ok(
    dot < -0.01,
    `Arrowhead midpoint should be behind tip. dot=${dot.toFixed(4)}, ` +
    `tip=(${tipX},${tipY}), mid=(${midX.toFixed(2)},${midY.toFixed(2)}), ` +
    `forward=(${fx.toFixed(3)},${fy.toFixed(3)})`,
  );

  // Non-degenerate: base points should be a meaningful distance from tip
  const d1 = Math.hypot(base1.x - tipX, base1.y - tipY);
  const d2 = Math.hypot(base2.x - tipX, base2.y - tipY);
  assert.ok(d1 > 1 && d2 > 1, `Arrowhead sides non-degenerate: d1=${d1.toFixed(2)}, d2=${d2.toFixed(2)}`);
}

const cases = [
  { name: 'horizontal left-to-right', x1: 50, y1: 100, x2: 200, y2: 100 },
  { name: 'horizontal right-to-left', x1: 200, y1: 100, x2: 50, y2: 100 },
  { name: 'vertical top-to-bottom', x1: 100, y1: 20, x2: 100, y2: 150 },
  { name: 'vertical bottom-to-top', x1: 100, y1: 150, x2: 100, y2: 20 },
  { name: 'diagonal positive-slope (upper-left to lower-right)', x1: 50, y1: 50, x2: 200, y2: 200 },
  { name: 'diagonal positive-slope (lower-right to upper-left)', x1: 200, y1: 200, x2: 50, y2: 50 },
  { name: 'diagonal negative-slope (lower-left to upper-right)', x1: 50, y1: 200, x2: 200, y2: 50 },
  { name: 'diagonal negative-slope (upper-right to lower-left)', x1: 200, y1: 50, x2: 50, y2: 200 },
];

describe('strokeArrow regression tests', () => {
  for (const c of cases) {
    it(`arrowhead points forward for ${c.name}`, () => {
      const ctx = createMockContext();
      const paths = drawArrowAndGetPaths(ctx, c.x1, c.y1, c.x2, c.y2);

      assert.ok(paths.length >= 2, `Expected at least 2 paths (shaft + arrowhead), got ${paths.length}`);
      const shaftPath = findShaftPath(paths, c.x1, c.y1, c.x2, c.y2);
      assert.ok(shaftPath, `Expected shaft from (${c.x1},${c.y1}) to (${c.x2},${c.y2})`);
      const arrowheadPath = findArrowheadPath(paths, c.x2, c.y2);
      assert.ok(arrowheadPath, `Expected arrowhead at tip (${c.x2},${c.y2})`);

      assertArrowheadPointsForward(shaftPath, arrowheadPath, c.x2, c.y2);
    });
  }

  it('ordinary line element draws only the shaft (no arrowhead)', () => {
    const ctx = createMockContext();
    const paths = drawLineAndGetPaths(ctx, 50, 50, 200, 100);

    assert.ok(paths.length === 1, `Line element should produce exactly 1 path, got ${paths.length}`);
    const shaftPath = findShaftPath(paths, 50, 50, 200, 100);
    assert.ok(shaftPath, 'Expected shaft from (50,50) to (200,100)');

    // No arrowhead path should exist
    const arrowheadPath = findArrowheadPath(paths, 200, 100);
    assert.ok(!arrowheadPath, 'Line element should not draw an arrowhead');
  });
});
