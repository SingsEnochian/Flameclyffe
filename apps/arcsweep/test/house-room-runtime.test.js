import test from 'node:test';
import assert from 'node:assert/strict';

import { createHouseRoomsHandler, BUILTIN_HOUSE_ROOMS } from '../../../netlify/functions/_shared/house-rooms-runtime.mjs';
import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';

function env(values = {}) { return { get(name) { return values[name]; } }; }
function store() {
  const values = new Map();
  return {
    values,
    async list({ prefix = '' } = {}) { return { blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) }; },
    async get(key) { return values.get(key) ?? null; },
    async setJSON(key, value) { values.set(key, structuredClone(value)); },
  };
}
function request(url, body = null) {
  return new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: 'Bearer house', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('House room registry seeds first-class channels and persists read cursors', async () => {
  const backing = store();
  const handler = createHouseRoomsHandler({ env: env({ ARCSWEEP_RUNTIME_TOKEN: 'house' }), store: backing, clock: () => new Date('2026-08-28T06:40:00.000Z') });
  const initial = await (await handler(request('https://example.test/api/v1/house/rooms'))).json();
  assert.equal(initial.rooms.length, BUILTIN_HOUSE_ROOMS.length);
  assert.ok(initial.rooms.some((room) => room.id === 'house-room:constellation'));
  assert.ok(initial.rooms.some((room) => room.id === 'house-room:arcsweep'));
  const read = await (await handler(request('https://example.test/api/v1/house/rooms', { action: 'mark-read', room_id: 'house-room:constellation', last_read_entry_id: 'entry-7', last_read_at: '2026-08-28T06:39:00.000Z' }))).json();
  assert.equal(read.last_read_entry_id, 'entry-7');
  const next = await (await handler(request('https://example.test/api/v1/house/rooms'))).json();
  assert.equal(next.reads[0].room_id, 'house-room:constellation');
});

test('House room registry creates stable direct rooms without changing channel history', async () => {
  const backing = store();
  const handler = createHouseRoomsHandler({ env: env({ ARCSWEEP_RUNTIME_TOKEN: 'house' }), store: backing, clock: () => new Date('2026-08-28T06:41:00.000Z') });
  const response = await handler(request('https://example.test/api/v1/house/rooms', { action: 'upsert-room', room: { id: 'house-room:dm:atlas', slug: 'atlas', title: 'Atlas', kind: 'direct', participants: ['atlas'] } }));
  assert.equal(response.status, 201);
  const room = await response.json();
  assert.equal(room.kind, 'direct');
  assert.deepEqual(room.participants, ['atlas']);
});

test('Commons retry with the same idempotency key returns the original turn instead of duplicating it', async () => {
  const backing = store();
  let nextId = 0;
  const handler = createHouseCommonsHandler({ env: env({ ARCSWEEP_RUNTIME_TOKEN: 'house' }), store: backing, clock: () => new Date('2026-08-28T06:42:00.000Z'), idFactory: () => `entry-${++nextId}` });
  const payload = { idempotency_key: 'commons:turn-1:rowan', kind: 'steward', author: 'Rowan', status: 'sent', thread_id: 'house-room:constellation', turn_id: 'turn-1', text: 'Hello.' };
  const first = await handler(request('https://example.test/api/v1/house/commons', payload));
  const second = await handler(request('https://example.test/api/v1/house/commons', payload));
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).id, (await second.json()).id);
  const log = await (await handler(request('https://example.test/api/v1/house/commons'))).json();
  assert.equal(log.entries.length, 1);
});
