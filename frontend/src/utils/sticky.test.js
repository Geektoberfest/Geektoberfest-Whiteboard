import { STICKY_COLORS, STROKE_COLORS } from '../constants/tools.js';
import { createElement, upsertElement } from './elements.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ FAIL: ${message}`);
}

function reset() {
  passed = 0;
  failed = 0;
}

async function run(name, fn) {
  reset();
  console.log(name);
  try {
    await fn();
  } catch (error) {
    failed += 1;
    console.error(`  ✗ FAIL: unexpected error — ${error.message}`);
  }
  console.log(`  → ${passed} passed, ${failed} failed\n`);
}

// ---------------------------------------------------------------------------
// Issue #3 fix: sticky notes now store stickyColor on the element and use it
// as the fill, instead of ignoring it and copying the stroke color.  The tests
// below assert the corrected behavior.
// ---------------------------------------------------------------------------

await run('createElement now uses stickyColor as fill when present', async () => {
  const stickyNote = createElement('sticky', { x: 0, y: 0 }, {
    color: STROKE_COLORS[1],     // '#ef4444' (stroke)
    stickyColor: STICKY_COLORS[2], // '#bfdbfe' (sticky fill)
    strokeWidth: 4,
  });

  assert(stickyNote.type === 'sticky', 'element.type is sticky');
  assert(stickyNote.fill === STICKY_COLORS[2],
    'fill is set from stickyColor, not the stroke color');
  assert(stickyNote.fill !== STROKE_COLORS[1],
    'fill does NOT equal the stroke color');
});

await run('sticky notes with different stickyColors now keep distinct fills', async () => {
  const a = createElement('sticky', { x: 0, y: 0 }, {
    color: STROKE_COLORS[0],
    stickyColor: STICKY_COLORS[0],
    strokeWidth: 4,
  });
  const b = createElement('sticky', { x: 1, y: 1 }, {
    color: STROKE_COLORS[0],
    stickyColor: STICKY_COLORS[4],
    strokeWidth: 4,
  });

  assert(a.fill === STICKY_COLORS[0], 'note A fill is its stickyColor');
  assert(b.fill === STICKY_COLORS[4], 'note B fill is its stickyColor');
  assert(a.fill !== b.fill,
    'notes with different stickyColor choices keep different fills');
});

await run('upsertElement preserves the corrected stickyColor-based fill on update', async () => {
  const initial = createElement('sticky', { x: 0, y: 0 }, {
    color: STROKE_COLORS[2],
    stickyColor: STICKY_COLORS[1],
    strokeWidth: 4,
  });

  // A user edits the note but also changes the stickyColor; the new fill must
  // reflect the new stickyColor.
  const updated = { ...initial, stickyColor: STICKY_COLORS[3], fill: STICKY_COLORS[3], text: 'Edited' };
  const list = upsertElement([initial], updated);
  const stored = list.find((el) => el.id === updated.id);

  assert(stored.stickyColor === STICKY_COLORS[3],
    'updated sticky note retains its new stickyColor');
  assert(stored.fill === STICKY_COLORS[3],
    'updated sticky note retains the new fill (stickyColor-based)');
  assert(stored.text === 'Edited', 'other properties (text) are also updated');
});

await run('sticky notes without an explicit stickyColor fall back to the stroke color', async () => {
  const fallbackNote = createElement('sticky', { x: 0, y: 0 }, {
    color: STROKE_COLORS[2],
    strokeWidth: 4,
  });

  assert(fallbackNote.fill === STROKE_COLORS[2],
    'when stickyColor is absent, fill falls back to the stroke color (backward compat)');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nAll sticky-color (fix) tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
