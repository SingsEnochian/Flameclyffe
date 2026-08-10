'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDeepTheoryStore } = require('../lib/deep-theory-store');

async function tmpStore() {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'deeptheory-'));
  return createDeepTheoryStore({ dataDir: dir });
}

test('DEEPTheory record has th- prefix and correct schema', async () => {
  const store = await tmpStore();
  const record = await store.save({
    envelope_id: 'env-t01',
    source_kind: 'pattern_analysis',
    source_id: 'analyst:p1',
    content_kind: 'analysis',
    confidence: 0.78,
    payload: { finding: 'R-axis drift detected' },
  });
  assert.match(record.id, /^th-/);
  assert.equal(record.schema_version, '0.1.0');
  assert.equal(record.dataset_kind, 'deep_theory');
  assert.equal(record.envelope_id, 'env-t01');
  assert.equal(record.source_kind, 'pattern_analysis');
  assert.equal(record.source_integrity.raw_sources_immutable, true);
  assert.equal(record.source_integrity.interpretations_append_only, true);
});

test('DEEPTheory catalog starts empty', async () => {
  const store = await tmpStore();
  const cat = await store.list();
  assert.deepEqual(cat.records, []);
  assert.equal(cat.schema, 'hearthgate.deep-theory-catalog/v1');
});

test('DEEPTheory save and get by id', async () => {
  const store = await tmpStore();
  const record = await store.save({
    envelope_id: 'env-fetch',
    content_kind: 'discovery',
    payload: { pattern: 'cyclical' },
  });
  const fetched = await store.get(record.id);
  assert.equal(fetched.id, record.id);
  assert.equal(fetched.content_kind, 'discovery');
});

test('DEEPTheory get returns null for unknown id', async () => {
  const store = await tmpStore();
  const result = await store.get('th-nobody');
  assert.equal(result, null);
});

test('DEEPTheory update appends revision', async () => {
  const store = await tmpStore();
  const first = await store.save({
    envelope_id: 'env-rev',
    source_kind: 'theory_update',
    payload: { v: 1 },
  });
  assert.equal(first.append_only_revisions.length, 0);
  const second = await store.save(
    { ...first, payload: { v: 2 }, revision_note: 'Theory refined.' },
    first.id,
  );
  assert.equal(second.id, first.id);
  assert.equal(second.append_only_revisions.length, 1);
  assert.match(second.append_only_revisions[0].note, /refined/);
});

test('DEEPTheory remove works correctly', async () => {
  const store = await tmpStore();
  const record = await store.save({ envelope_id: 'env-del', payload: { x: 1 } });
  assert.equal(await store.remove(record.id), true);
  assert.equal(await store.get(record.id), null);
  assert.equal(await store.remove('th-nobody'), false);
});

test('DEEPTheory preserves payload intact', async () => {
  const store = await tmpStore();
  const payload = { axes: { R: 0.6, E: 0.4 }, hypothesis: 'coupled oscillation' };
  const record = await store.save({ envelope_id: 'env-pay', payload });
  assert.deepEqual(record.payload, payload);
});

test('DEEPTheory defaults privacy_scope to private_local', async () => {
  const store = await tmpStore();
  const record = await store.save({ envelope_id: 'env-priv', payload: { k: 1 } });
  assert.equal(record.privacy_scope, 'private_local');
});

test('DEEPTheory stores source_refs array', async () => {
  const store = await tmpStore();
  const record = await store.save({
    envelope_id: 'env-refs',
    payload: { note: 'test' },
    source_refs: [{ ref: 'obs:001', dataset: 'deep_story' }],
  });
  assert.equal(record.source_refs.length, 1);
  assert.equal(record.source_refs[0].ref, 'obs:001');
});

test('DEEPTheory multiple records accumulate in catalog', async () => {
  const store = await tmpStore();
  for (let i = 0; i < 4; i++) {
    await store.save({ envelope_id: `env-${i}`, payload: { i } });
  }
  const cat = await store.list();
  assert.equal(cat.records.length, 4);
});
