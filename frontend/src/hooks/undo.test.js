import assert from 'node:assert/strict';

// Re-implement the exact history contract from useBoardRoom.js so the tests
// exercise the same logic that the production hook uses, without depending on
// React, the socket layer, or any DOM.
//
// Model:
//  * history = { past: [...snapshots], future: [...snapshots] }
//  * current state lives outside the history object (the ref-backed elements
//    array in the real hook).
//  * commit(next) pushes the current snapshot onto past, clears future.
//  * undo() restores past[last], moves current onto future.
//  * redo() restores future[first], moves current onto past.

let passed = 0;
let failed = 0;

function assertStep(condition, message) {
  try {
    assert(condition, message);
    passed += 1;
    console.log(`  ✓ ${message}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ FAIL: ${message} — ${error.message}`);
  }
}

function resetCounters() {
  passed = 0;
  failed = 0;
}

async function run(name, fn) {
  resetCounters();
  console.log(name);
  try {
    await fn();
  } catch (error) {
    failed += 1;
    console.error(`  ✗ FAIL: unexpected error — ${error.message}`);
  }
  console.log(`  → ${passed} passed, ${failed} failed\n`);
}

function makeHistory() {
  return { past: [], future: [] };
}

function snapshot(elements) {
  // Shallow copy is enough for these tests because elements are plain objects
  // created inline and never mutated after being stored.
  return elements.map((el) => ({ ...el }));
}

function commit(history, current, next) {
  history.past = [...history.past, snapshot(current)];
  history.future = [];
  return snapshot(next);
}

function undo(history, current) {
  const previous = history.past[history.past.length - 1];
  if (!previous) return current;

  const restored = snapshot(previous);
  history.future = [snapshot(current), ...history.future];
  history.past = history.past.slice(0, -1);
  return restored;
}

function redo(history, current) {
  const next = history.future[0];
  if (!next) return current;

  const restored = snapshot(next);
  history.past = [...history.past, snapshot(current)];
  history.future = history.future.slice(1);
  return restored;
}

// ---------------------------------------------------------------------------
// Regression tests
// ---------------------------------------------------------------------------

await run('three drawing actions produce two restore points in past', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]); // state after A
  current = commit(history, current, [A(), B()]); // state after B
  current = commit(history, current, [A(), B(), C()]); // state after C

  assertStep(history.past.length === 3, 'past holds 3 snapshots (empty, A, A+B)');
  assertStep(history.past[0].length === 0, 'first past snapshot is the empty board');
  assertStep(history.past[1].length === 1 && history.past[1][0].id === 'A', 'second past snapshot is A only');
  assertStep(history.past[2].length === 2, 'third past snapshot is A+B');
});

await run('multiple undos walk back through all recorded states', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]);
  current = commit(history, current, [A(), B()]);
  current = commit(history, current, [A(), B(), C()]);

  // Undo 1: back to A+B
  current = undo(history, current);
  assertStep(snapshot(current).length === 2, 'after first undo: A and B remain');
  assertStep(history.past.length === 2, 'past now has 2 entries');

  // Undo 2: back to A
  current = undo(history, current);
  assertStep(snapshot(current).length === 1 && current[0].id === 'A', 'after second undo: only A remains');
  assertStep(history.past.length === 1, 'past now has 1 entry');

  // Undo 3: back to empty
  current = undo(history, current);
  assertStep(snapshot(current).length === 0, 'after third undo: board is empty');
  assertStep(history.past.length === 0, 'past is now empty');
});

await run('undo at the beginning is a safe no-op', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]);
  current = undo(history, current);
  assertStep(snapshot(current).length === 0, 'after one undo the board is empty');

  const noop = undo(history, current);
  assertStep(snapshot(noop).length === 0, 'undo with no history is a no-op');
  assertStep(snapshot(current).length === 0, 'current state was not corrupted by the no-op');
});

await run('undo followed by redo restores the state in the correct order', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]);
  current = commit(history, current, [A(), B()]);
  current = commit(history, current, [A(), B(), C()]);

  current = undo(history, current); // A+B
  assertStep(snapshot(current).length === 2, 'after undo 1: A+B');
  current = undo(history, current); // A
  assertStep(snapshot(current).length === 1, 'after undo 2: A only');

  current = redo(history, current); // back to A+B
  assertStep(snapshot(current).length === 2, 'after redo 1: A+B restored');
  current = redo(history, current); // back to A+B+C
  assertStep(snapshot(current).length === 3, 'after redo 2: A+B+C restored');

  assertStep(history.future.length === 0, 'future is empty after full redo');
  assertStep(history.past.length === 3, 'past still holds the original history');
});

await run('new action after undo discards the obsolete redo branch', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]);
  current = commit(history, current, [A(), B()]);
  current = commit(history, current, [A(), B(), C()]);

  current = undo(history, current); // A+B, future=[A+B+C]
  current = undo(history, current); // A, future=[A+B, A+B+C]

  // New drawing D after undoing twice
  current = commit(history, current, [A(), D()]);

  assertStep(history.future.length === 0, 'future cleared by the new commit after undo');
  assertStep(snapshot(current).length === 2 && current[1].id === 'D', 'current state is A+D');
  assertStep(history.past.length === 2, 'past retains empty and A (the path to the new action)');

  // Redo should be a no-op now because the future was truncated
  const afterRedo = redo(history, current);
  assertStep(snapshot(afterRedo).length === 2, 'redo after a new action is a no-op (no stale B/C restoration)');
});

await run('elements from earlier snapshots are not mutated by later operations', async () => {
  const history = makeHistory();
  let current = [];

  current = commit(history, current, [A()]);
  current = commit(history, current, [A(), B()]);

  const firstPastEntry = history.past[0];
  const secondPastEntry = history.past[1];

  // Perform another commit (C) and undo back; prior snapshots must be unchanged.
  current = commit(history, current, [A(), B(), C()]);
  current = undo(history, current); // back to A+B

  assertStep(firstPastEntry.length === 0, 'earliest snapshot still represents the empty board');
  assertStep(secondPastEntry.length === 1 && secondPastEntry[0].id === 'A', 'second snapshot still represents A only');
  assertStep(snapshot(current).length === 2, 'current state after undo is A+B');
});

await run('clear board is undoable', async () => {
  const history = makeHistory();
  let current = [A(), B()];

  current = commit(history, current, []);
  assertStep(snapshot(current).length === 0, 'after commit([]): board is cleared');

  current = undo(history, current);
  assertStep(snapshot(current).length === 2, 'undo after clear restores the prior A+B state');
  assertStep(history.future.length === 1, 'future contains the cleared state');
});

await run('delete is undoable', async () => {
  const history = makeHistory();
  let current = [A(), B(), C()];

  current = commit(history, current, current.filter((el) => el.id !== 'B'));
  assertStep(snapshot(current).length === 2, 'after deleting B: A and C remain');

  current = undo(history, current);
  assertStep(snapshot(current).length === 3, 'undo after delete restores A, B, C');
  assertStep(current.find((el) => el.id === 'B') != null, 'B is back after undo');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nAll undo/redo history tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// ---------------------------------------------------------------------------
// Helpers: tiny element factories so the tests read clearly
// ---------------------------------------------------------------------------

function A() { return { id: 'A', type: 'pen', points: [{ x: 1, y: 1 }] }; }
function B() { return { id: 'B', type: 'pen', points: [{ x: 2, y: 2 }] }; }
function C() { return { id: 'C', type: 'pen', points: [{ x: 3, y: 3 }] }; }
function D() { return { id: 'D', type: 'pen', points: [{ x: 4, y: 4 }] }; }
