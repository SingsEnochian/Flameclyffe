import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_COOKIE_SESSION, startHouseBraidLiveUpdates } from '../src/house-runtime.js';

test('ready and reconnect hints do not repeatedly churn the visible Runtime Braid state', async () => {
  const states = [];
  const events = [];
  const stream = [
    'event: ready\ndata: {"cursor":0}\n\n',
    'event: reconnect\ndata: {"cursor":0}\n\n',
    'event: reconnect\ndata: {"cursor":0}\n\n',
    'id: 1\nevent: braid\ndata: {"event":{"event_sequence":1,"event_id":"event-1","world_id":"earth_prime"}}\n\n',
  ].join('');

  const live = startHouseBraidLiveUpdates(HOUSE_COOKIE_SESSION, {
    worldId: 'earth_prime',
    reconnect: false,
    fetchImpl: async () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    onEvent: (event) => events.push(event.event_id),
    onState: ({ state }) => states.push(state),
  });

  await live.done;
  assert.deepEqual(events, ['event-1']);
  assert.deepEqual(states, ['connecting', 'live', 'closed']);
});
