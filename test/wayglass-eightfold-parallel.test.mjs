import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LANES, WITHNESS, EIGHTFOLD_SCHEMA,
  makeLaneReceipt, aggregateEightfold, executeLane, assertCanonicalSpine,
} from '../scripts/wayglass-eightfold-parallel.mjs';

const revision = 'a'.repeat(40), runId = '424242', attempt = '1';
function receiptFor(lane) {
  return makeLaneReceipt({
    id: lane.id, revision, runId, attempt,
    source: readFileSync(lane.test),
    result: { status: 0, stdout: 'TAP version 13\n# pass 1', stderr: '' },
    startedAt: '2026-11-05T00:00:00Z',
    finishedAt: '2026-11-05T00:00:01Z',
  });
}
test('Eightfold is eight distinct execution workers and Withness is the ninth center', () => {
  assert.equal(LANES.length, 8);
  assert.equal(new Set(LANES.map(l => l.id)).size, 8);
  assert.equal(new Set(LANES.map(l => l.test)).size, 8);
  assert.equal(WITHNESS, 'withness');
  assert.equal(assertCanonicalSpine(), true);
  assert.ok(LANES.every(l => l.test.startsWith('apps/') || l.test.startsWith('test/')));
});
test('all eight real checked-out source receipts integrate once, no pretend model agents', () => {
  const receipts = LANES.map(receiptFor);
  const gate = aggregateEightfold(receipts, { revision, runId, attempt });
  assert.equal(gate.status, 'passed');
  assert.equal(gate.withness_center, 'withness');
  assert.equal(gate.verified_lanes.length, 8);
  assert.ok(receipts.every(r => r.schema === EIGHTFOLD_SCHEMA
    && r.participant_id === null && r.model_inference === false));
  assert.ok(gate.not_claimed.includes('eight independent AI model agents'));
});
test('missing, duplicated and failed jobs block the whole ship', () => {
  const complete = LANES.map(receiptFor);
  assert.equal(aggregateEightfold(complete.slice(1), { revision, runId, attempt }).status, 'blocked');
  assert.equal(aggregateEightfold([...complete, complete[0]], { revision, runId, attempt }).status, 'blocked');
  assert.equal(aggregateEightfold(complete.map((r,i) =>
    i === 3 ? {...r, status:'failed', exit_code:1} : r),
    { revision, runId, attempt }).status, 'blocked');
});
test('stale commit, forged model inference and altered tested source all block', () => {
  const complete = LANES.map(receiptFor);
  for (const variation of [
    {source_sha: 'b'.repeat(40)},
    {model_inference: true},
    {test_source_sha256: '0'.repeat(64)},
    {participant_id: 'wayglass'},
    {worker_id: 'another-worker'},
  ]) {
    const altered = complete.map((r,i)=> i===2 ? {...r, ...variation} : r);
    assert.equal(aggregateEightfold(altered,{revision,runId,attempt}).status, 'blocked');
  }
});
test('fixed worker command ignores any untrusted suggested command', () => {
  const lane = LANES[0];
  let args;
  const result = executeLane(lane.id, {
    revision, runId, attempt,
    run: (...params) => { args = params; return {status:0,stdout:'ok',stderr:''}; },
  });
  assert.equal(args[0], process.execPath);
  assert.deepEqual(args[1], ['--test', lane.test]);
  assert.equal(args[2].timeout, 120000);
  assert.equal(result.status, 'passed');
  assert.equal(result.worker_kind, 'isolated-ci-test-process');
});
