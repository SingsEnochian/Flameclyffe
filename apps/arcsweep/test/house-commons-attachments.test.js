import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseCommonsAttachmentHandler } from '../../../netlify/functions/_shared/house-commons-attachments-runtime.mjs';

function store() {
  const values = new Map();
  return {
    async set(key, value) { values.set(key, value instanceof Uint8Array ? value.slice() : value); },
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
    async get(key, options = {}) {
      const value = values.get(key); if (value == null) return null;
      if (options.type === 'json') return structuredClone(value);
      if (options.type === 'arrayBuffer') { const bytes = value instanceof Uint8Array ? value : new Uint8Array(value); return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
      return value;
    },
  };
}
const env = { get: (name) => name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'test-token' : null };
const auth = { authorization: 'Bearer test-token', 'content-type': 'application/json' };

test('Commons attachments round-trip bytes behind House Runtime auth', async () => {
  const handler = createHouseCommonsAttachmentHandler({ env, store: store(), idFactory: () => 'att-1', clock: () => new Date('2026-08-22T00:00:00Z') });
  const bytes = Buffer.from('feather-and-flame');
  const created = await handler(new Request('https://example.test/api/v1/house/commons/attachments', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'note.txt', type: 'text/plain', size: bytes.length, data_base64: bytes.toString('base64') }) }));
  assert.equal(created.status, 201);
  const meta = await created.json(); assert.equal(meta.id, 'att-1'); assert.equal(meta.name, 'note.txt');
  const fetched = await handler(new Request('https://example.test/api/v1/house/commons/attachments?id=att-1', { headers: { authorization: 'Bearer test-token' } }));
  assert.equal(fetched.status, 200); assert.equal(fetched.headers.get('content-type'), 'text/plain'); assert.equal(Buffer.from(await fetched.arrayBuffer()).toString(), 'feather-and-flame');
});

test('Commons attachments reject oversized payload declarations', async () => {
  const handler = createHouseCommonsAttachmentHandler({ env, store: store() });
  const response = await handler(new Request('https://example.test/api/v1/house/commons/attachments', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'huge.bin', size: 5 * 1024 * 1024 + 1, data_base64: 'AA==' }) }));
  assert.equal(response.status, 413);
});
