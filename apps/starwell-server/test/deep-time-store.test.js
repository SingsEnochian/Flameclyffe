'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDeepTimeStore } = require('../lib/deep-time-store');

async function tmpStore() {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'deeptime-'));
  return createDeepTimeStore({ dataDir: dir });
}

test('DEEPTime record has dt- prefix and correct schema', async () => {
  const store = await tmpStore();
  const record = await store.save({
    envelope_id: 'env-001',
    source_kind: 'temporal_reading',
    source_id: 'observer:r1',
    utc: '2026-08-09T10:00:00Z',
    confidence: 0.85,
    evidence_class: 'measured',
  });
  assert.match(record.id, /^dt-/);
  assert.equal(record.schema_version, '0.1.0');
  assert.equal(record.dataset_kind, 'deep_time');
  assert.equal(record.envelope_id, 'env-001');
  assert.equal(record.time.utc, '2026-08-09T10:00:00Z');
  assert.equal(record.confidence, 0.85);
  assert.equal(record.source_integrity.append_only, true);
});

test('DEEPTime catalog starts empty', async () => {
  const store = await tmpStore();
  const cat = await store.list();
  assert.deepEqual(cat.records, []);
  assert.equal(cat.schema, 'hearthgate.deep-time-catalog/v1');
});

test('DEEPTime save and get by id', async () => {
  const store = await tmpStore();
  const record = await store.save({
    envelope_id: 'env-abc',
    source_kind: 'arcsweep_temporal',
    utc: '2026-08-09T12:00:00Z',
    confidence: 0.72,
  });
  const fetched = await store.get(record.id);
  assert.equal(fetched.id, record.id);
  assert.equal(fetched.source_kind, 'arcsweep_temporal');
});

test('DEEPTime get returns null for unknown id', async () => {
  const store = await tmpStore();
  const result = await store.get('dt-nonexistent');
  assert.equal(result, null);
});

test('DEEPTime update appends revision', async () => {
  const store = await tmpStore();
  const first = await store.save({
    envelope_id: 'env-1',
    source_kind: 'temporal_reading',
    utc: '2026-08-09T10:00:00Z',
  });
  assert.equal(first.append_only_revisions.length, 0);
  const second = await store.save(
    { ...first, confidence: 0.91, revision_note: 'Confidence updated.' },
    first.id,
  );
  assert.equal(second.id, first.id);
  assert.equal(second.append_only_revisions.length, 1);
  assert.match(second.append_only_revisions[0].note, /Confidence updated/);
});

test('DEEPTime remove returns true for existing record', async () => {
  const store = await tmpStore();
  const record = await store.save({ envelope_id: 'env-del', utc: '2026-08-09T10:00:00Z' });
  const removed = await store.remove(record.id);
  assert.equal(removed, true);
  assert.equal(await store.get(record.id), null);
});

test('DEEPTime remove returns false for unknown id', async () => {
  const store = await tmpStore();
  const removed = await store.remove('dt-nobody');
  assert.equal(removed, false);
});

test('DEEPTime provenance carries observation_run_id from envelope_id', async () => {
  const store = await tmpStore();
  const record = await store.save({ envelope_id: 'env-prov-01', utc: '2026-08-09T08:00:00Z' });
  assert.equal(record.provenance.observation_run_id, 'env-prov-01');
  assert.deepEqual(record.provenance.source_receipt_hashes, []);
});

test('DEEPTime defaults consent_scope to private_local', async () => {
  const store = await tmpStore();
  const record = await store.save({ envelope_id: 'env-cs', utc: '2026-08-09T08:00:00Z' });
  assert.equal(record.consent_scope, 'private_local');
});

test('DEEPTime multiple records accumulate in catalog', async () => {
  const store = await tmpStore();
  await store.save({ envelope_id: 'a', utc: '2026-08-09T01:00:00Z' });
  await store.save({ envelope_id: 'b', utc: '2026-08-09T02:00:00Z' });
  await store.save({ envelope_id: 'c', utc: '2026-08-09T03:00:00Z' });
  const cat = await store.list();
  assert.equal(cat.records.length, 3);
});
