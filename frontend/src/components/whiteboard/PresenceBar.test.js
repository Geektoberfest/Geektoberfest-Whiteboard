import { overflowCount, AVATAR_LIMIT } from '../../utils/presenceOverflow.js';

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

const participants = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `User${i + 1}` }));

await run('overflow is 0 for 0 through 6 participants', async () => {
  for (const n of [0, 1, 2, 3, 4, 5, 6]) {
    assert(overflowCount(participants(n)) === 0, `${n} participants → overflow 0`);
  }
});

await run('overflow table matches expected values', async () => {
  assert(overflowCount(participants(0)) === 0, '0 participants → 0');
  assert(overflowCount(participants(1)) === 0, '1 participant → 0');
  assert(overflowCount(participants(6)) === 0, '6 participants → 0');
  assert(overflowCount(participants(7)) === 1, '7 participants → 1');
  assert(overflowCount(participants(8)) === 2, '8 participants → 2');
  assert(overflowCount(participants(10)) === 4, '10 participants → 4');
});

await run('overflow never goes negative', async () => {
  for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 20]) {
    assert(overflowCount(participants(n)) >= 0, `${n} participants: overflow non-negative (${overflowCount(participants(n))})`);
  }
});

await run('overflow is 14 for 20 participants', async () => {
  assert(overflowCount(participants(20)) === 14, '20 participants → 14');
});

await run('non-array input returns 0 safely', async () => {
  assert(overflowCount(null) === 0, 'null input → 0');
  assert(overflowCount(undefined) === 0, 'undefined input → 0');
  assert(overflowCount('not an array') === 0, 'string input → 0');
  assert(overflowCount(42) === 0, 'number input → 0');
});

await run('overflow uses AVATAR_LIMIT from the shared constant', async () => {
  for (const n of [7, 10, 20, 50, 100]) {
    const expected = n - AVATAR_LIMIT;
    assert(overflowCount(participants(n)) === expected, `${n} participants → overflow ${expected} (limit=${AVATAR_LIMIT})`);
  }
  assert(AVATAR_LIMIT === 6, 'AVATAR_LIMIT is 6');
});

await run('overflow scales linearly with participant count above 6', async () => {
  for (const n of [7, 10, 20, 50, 100]) {
    const expected = n - 6;
    assert(overflowCount(participants(n)) === expected, `${n} participants → overflow ${expected}`);
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\nAll presence overflow tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
