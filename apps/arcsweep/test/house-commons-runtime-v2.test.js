import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function harness() {
  const rows = new Map();
  const store = {
    async list() { return { blobs: [...rows.keys()].map((key) => ({ key })) }; },
    async get(key) { return rows.get(key) || null; },
    async setJSON(key, value) { rows.set(key, structuredClone(value)); },
  };
  const env = { get(name) { return name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'house-test-token' : null; } };
  const handler = createHouseCommonsHandler({ env, store, clock: () => new Date('2026-08-21T12:00:00.000Z'), idFactory: () => 'entry-1' });
  return { handler, rows };
}

test('House Commons legacy v2 fields survive promotion into the current v4 entry schema', async () => {
  const { handler } = harness();
  const request = new Request('https://example.test/api/v1/house/commons', {
    method: 'POST', headers: { authorization: 'Bearer house-test-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'voice', author: 'Atlas', voice_id: 'atlas', status: 'replied', text: 'A visible reply.',
      thread_id: 'thread-1', reply_to: 'steward-1', turn_id: 'turn-1',
      runtime: { provider: 'huggingface', model: 'atlas-model', route: 'atlas', profile_id: 'house:atlas:huggingface:atlas-model', latency_ms: 144, runtime_world_context_id: 'runtime-world:terra-prime:abc' },
    }),
  });
  const response = await handler(request);
  assert.equal(response.status, 201);
  const entry = await response.json();
  assert.equal(entry.schema, 'hearthgate.house-commons-entry/v4');
  assert.equal(entry.thread_id, 'thread-1');
  assert.equal(entry.reply_to, 'steward-1');
  assert.equal(entry.turn_id, 'turn-1');
  assert.equal(entry.runtime.model, 'atlas-model');
  assert.equal(entry.runtime.latency_ms, 144);
  assert.deepEqual(entry.attachments, []);
});

test('House Commons live read promotes legacy-compatible entries into the current v4 log schema', async () => {
  const { handler } = harness();
  await handler(new Request('https://example.test/api/v1/house/commons', { method: 'POST', headers: { authorization: 'Bearer house-test-token', 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'steward', author: 'Rowan', text: 'Hello', thread_id: 'thread-1' }) }));
  const response = await handler(new Request('https://example.test/api/v1/house/commons', { headers: { authorization: 'Bearer house-test-token' } }));
  assert.equal(response.status, 200);
  const log = await response.json();
  assert.equal(log.schema, 'hearthgate.house-commons-log/v4');
  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0].schema, 'hearthgate.house-commons-entry/v4');
  assert.equal(log.entries[0].thread_id, 'thread-1');
  assert.deepEqual(log.entries[0].attachments, []);
});
