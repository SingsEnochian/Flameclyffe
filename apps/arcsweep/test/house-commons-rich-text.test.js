import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function store() {
  const map = new Map();
  return {
    async list() { return { blobs: [...map.keys()].map((key) => ({ key })) }; },
    async setJSON(key, value) { map.set(key, structuredClone(value)); },
    async get(key) { return structuredClone(map.get(key) || null); },
  };
}
const env = { get: (name) => name === 'ARCSWEEP_RUNTIME_TOKEN' ? 'test-token' : null };

test('House Commons v4 persists native rich text beside clean plain text', async () => {
  const handler = createHouseCommonsHandler({ env, store: store(), idFactory: () => 'entry-rich', clock: () => new Date('2026-08-28T02:00:00Z') });
  const response = await handler(new Request('https://example.test/api/v1/house/commons', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify({
      kind: 'steward',
      author: 'Rowan',
      status: 'sent',
      thread_id: 'room-1',
      text: 'Native bold, no asterisks.',
      rich_text_html: '<p>Native <strong>bold</strong>, no asterisks.</p>',
    }),
  }));
  assert.equal(response.status, 201);
  const entry = await response.json();
  assert.equal(entry.text, 'Native bold, no asterisks.');
  assert.equal(entry.rich_text_html, '<p>Native <strong>bold</strong>, no asterisks.</p>');
  assert.equal(entry.thread_id, 'room-1');
});