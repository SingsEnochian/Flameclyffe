import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function store() { const map = new Map(); return { async list() { return { blobs: [...map.keys()].map((key) => ({ key })) }; }, async setJSON(key, value) { map.set(key, structuredClone(value)); }, async get(key) { return structuredClone(map.get(key) || null); } }; }
const env = { get: (name) => name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'test-token' : null };

test('House Commons v4 persists attachment metadata with thread provenance', async () => {
  const handler = createHouseCommonsHandler({ env, store: store(), idFactory: () => 'entry-1', clock: () => new Date('2026-08-22T00:00:00Z') });
  const response = await handler(new Request('https://example.test/api/v1/house/commons', { method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'system', author: 'House Commons', status: 'attachment', thread_id: 'thread-1', reply_to: 'turn-1', attachments: [{ id: 'att-1', name: 'map.png', type: 'image/png', size: 2048 }], text: 'Attached map.png.' }) }));
  assert.equal(response.status, 201); const entry = await response.json();
  assert.equal(entry.schema, 'hearthgate.house-commons-entry/v4');
  assert.equal(entry.thread_id, 'thread-1'); assert.equal(entry.reply_to, 'turn-1');
  assert.deepEqual(entry.attachments, [{ id: 'att-1', name: 'map.png', type: 'image/png', size: 2048 }]);
});
