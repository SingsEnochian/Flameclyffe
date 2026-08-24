import assert from 'node:assert/strict';
import test from 'node:test';

import { createHouseBraidStreamHandler } from '../../../netlify/functions/_shared/house-braid-stream-runtime.mjs';

const runtime = (values) => ({ get: (name) => values[name] });
const ENV = runtime({
  ARCSWEEP_RUNTIME_TOKEN: 'secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
});

test('Runtime Braid stream refuses unauthorised listeners', async () => {
  const handler = createHouseBraidStreamHandler({ env: ENV, subscribe: async () => async () => {} });
  const response = await handler(new Request('https://house.example/api/v1/house/braid/stream'));
  assert.equal(response.status, 401);
});

test('Runtime Braid stream replays a cursor then deduplicates buffered Realtime events', async () => {
  let cleaned = false;
  const event2 = { event_sequence: 2, event_id: 'event-2', event_type: 'review-accepted', world_id: 'terra-aeterna' };
  const handler = createHouseBraidStreamHandler({
    env: ENV,
    subscribe: async ({ onEvent }) => {
      onEvent(event2);
      onEvent({ event_sequence: 3, event_id: 'event-other-world', event_type: 'review-accepted', world_id: 'luna' });
      return async () => { cleaned = true; };
    },
    fetchImpl: async (url) => {
      assert.match(url, /event_sequence=gt\.0/);
      assert.match(url, /world_id=eq\.terra-aeterna/);
      return new Response(JSON.stringify([
        { event_sequence: 1, event_id: 'event-1', event_type: 'observation-receipted', world_id: 'terra-aeterna' },
        event2,
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    },
    clock: () => new Date('2026-08-14T18:10:00.000Z'),
    streamLifetimeMs: 12,
    heartbeatMs: 1_000,
  });
  const response = await handler(new Request('https://house.example/api/v1/house/braid/stream?world_id=terra-aeterna&cursor=0', { headers: { authorization: 'Bearer secret' } }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.equal(response.headers.get('cache-control'), 'no-store, no-transform');
  const text = await response.text();
  assert.match(text, /event: ready/);
  assert.match(text, /id: 1/);
  assert.match(text, /id: 2/);
  assert.equal((text.match(/id: 2/g) || []).length, 1);
  assert.doesNotMatch(text, /event-other-world/);
  assert.match(text, /event: reconnect/);
  assert.equal(cleaned, true);
});

test('Runtime Braid stream resumes from Last-Event-ID', async () => {
  const handler = createHouseBraidStreamHandler({
    env: ENV,
    subscribe: async () => async () => {},
    fetchImpl: async (url) => {
      assert.match(url, /event_sequence=gt\.17/);
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    },
    streamLifetimeMs: 8,
    heartbeatMs: 1_000,
  });
  const response = await handler(new Request('https://house.example/api/v1/house/braid/stream', {
    headers: { authorization: 'Bearer secret', 'last-event-id': '17' },
  }));
  const text = await response.text();
  assert.match(text, /"cursor":17/);
});
