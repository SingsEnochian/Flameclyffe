'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const {
  appendObserverWitness,
  observerWitnessStatus,
  readObserverWitness,
} = require('../desktop/observer-witness.cjs');

test('desktop Observer witness writes latest + append-only receipt history in the local store', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-observer-witness-'));
  t.after(async () => fsp.rm(root, { recursive: true, force: true }));
  const storePaths = { root };

  const first = {
    schema: 'arcsweep.observer-witness/v1',
    receipt_id: 'observer-witness:first',
    created_at: '2026-09-17T17:00:00.000Z',
    kind: 'manual',
    world_id: 'terra-prime',
    authority: { witness_only: true, grants_authority: false, canon_commit: false, source_mutation: false },
  };
  const second = {
    ...first,
    receipt_id: 'observer-witness:second',
    created_at: '2026-09-17T17:01:00.000Z',
    parent_receipt_id: first.receipt_id,
  };

  const firstWrite = await appendObserverWitness(storePaths, first);
  const secondWrite = await appendObserverWitness(storePaths, second);
  assert.equal(firstWrite.ok, true);
  assert.equal(secondWrite.ok, true);

  const read = await readObserverWitness(storePaths, { limit: 8 });
  assert.equal(read.ok, true);
  assert.equal(read.latest.receipt_id, second.receipt_id);
  assert.deepEqual(read.history.map((item) => item.receipt_id), [first.receipt_id, second.receipt_id]);
  assert.equal(read.history[1].parent_receipt_id, first.receipt_id);
  assert.equal(read.history[1].authority.grants_authority, false);

  const status = await observerWitnessStatus(storePaths);
  assert.equal(status.ok, true);
  assert.equal(status.latest_receipt_id, second.receipt_id);
  assert.equal(status.authority, 'witness-only');
  assert.match(status.latestFile, /observer-witness[\\/]latest\.json$/);
  assert.match(status.logFile, /observer-witness[\\/]receipts\.jsonl$/);
});

test('desktop Observer witness rejects non-witness payloads', async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-observer-witness-invalid-'));
  t.after(async () => fsp.rm(root, { recursive: true, force: true }));
  await assert.rejects(
    appendObserverWitness({ root }, { schema: 'not-a-witness', receipt_id: 'x', created_at: new Date().toISOString() }),
    /arcsweep\.observer-witness\/v1/,
  );
});
