import assert from 'node:assert/strict';
import test from 'node:test';

import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function memoryStore() {
  const values = new Map();
  return {
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
    async get(key) { return structuredClone(values.get(key) || null); },
    async list({ prefix }) { return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key, etag: key })) }; },
  };
}

test('House Commons is protected, append-only, and immediately readable', async () => {
  const store = memoryStore();
  const handler = createHouseCommonsHandler({ env: { get: () => 'house-key' }, store, clock: () => new Date('2026-08-14T08:00:00.000Z'), idFactory: () => 'entry-1' });
  const denied = await handler(new Request('https://house.test/api/v1/house/commons'));
  assert.equal(denied.status, 401);
  const headers = { authorization: 'Bearer house-key', 'content-type': 'application/json' };
  const written = await handler(new Request('https://house.test/api/v1/house/commons', { method: 'POST', headers, body: JSON.stringify({ kind: 'steward', author: 'Rowan', status: 'sent', text: 'Is everyone here?' }) }));
  assert.equal(written.status, 201);
  const read = await handler(new Request('https://house.test/api/v1/house/commons', { headers }));
  const log = await read.json();
  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0].author, 'Rowan');
  assert.equal(log.entries[0].text, 'Is everyone here?');
});
