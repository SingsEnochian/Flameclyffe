import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { bootstrapRuntimeIntegration } from '../src/runtime-integration-bootstrap.js';
import { loadRuntimeIntegrationEnvelope } from '../src/runtime-integration-store.js';
import { publishModelPresence } from '../src/model-presence-bus.js';
import { CONSTELLATION_LENS_EVENTS } from '../src/constellation-lens.js';
import {
  buildRuntimeReplayReceipt,
  restoreEnvelopeFromReplay,
  runtimeReplayEquivalent,
} from '../src/runtime-integration-replay.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function detailEvent(type, detail) {
  if (typeof CustomEvent !== 'undefined') return new CustomEvent(type, { detail });
  const event = new Event(type);
  Object.defineProperty(event, 'detail', { value: detail });
  return event;
}

test('runtime integration heartbeat carries presence and feedback through persistence, reload, and replay', async () => {
  const storage = memoryStorage();
  const world = {
    schema: 'arcsweep.runtime-world-context/v1',
    context_id: 'runtime-world:terra-prime:test',
    identity_anchor: { world_id: 'terra-prime' },
    world: { id: 'terra-prime', name: 'Terra Prime', kind: 'waking-world' },
  };
  const target = new EventTarget();

  const booted = await bootstrapRuntimeIntegration({
    storage,
    target,
    readWorld: async () => world,
    readPresence: () => [{ voice_id: 'atlas', state: 'ready' }],
  });
  assert.equal(booted.world.identity_anchor.world_id, 'terra-prime');
  assert.equal(booted.presence.atlas, 'ready');

  publishModelPresence({ voiceId: 'atlas', state: 'thinking', task: 'heartbeat-test' }, target);
  let persisted = loadRuntimeIntegrationEnvelope(storage);
  assert.equal(persisted.presence.atlas, 'thinking');

  target.dispatchEvent(detailEvent(CONSTELLATION_LENS_EVENTS.response, {
    requestId: 'heartbeat-1',
    voiceId: 'atlas',
    kind: 'continuity',
    text: 'The runtime braid is intact.',
    runtimeWorldContextId: world.context_id,
    citedSources: ['receipt-heartbeat'],
    createdAt: '2026-08-21T18:40:00.000Z',
  }));
  persisted = loadRuntimeIntegrationEnvelope(storage);
  assert.equal(persisted.presence.atlas, 'speaking');
  assert.equal(persisted.feedback.length, 1);
  assert.equal(persisted.feedback[0].voice_id, 'atlas');
  assert.deepEqual(persisted.feedback[0].supporting_receipts, [world.context_id, 'receipt-heartbeat']);

  const reloaded = await bootstrapRuntimeIntegration({
    storage,
    target: new EventTarget(),
    readWorld: async () => world,
    readPresence: () => [],
  });
  assert.equal(reloaded.session_id, persisted.session_id);
  assert.equal(reloaded.feedback.length, 1);
  assert.equal(reloaded.presence.atlas, 'speaking');

  const receipt = buildRuntimeReplayReceipt(reloaded, {
    replayId: 'heartbeat-replay-1',
    createdAt: '2026-08-21T18:41:00.000Z',
  });
  const restored = restoreEnvelopeFromReplay(receipt);
  assert.equal(runtimeReplayEquivalent(reloaded, restored), true);
});

test('Arcsweep startup mounts the runtime integration bootstrap after the model presence bus', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const bus = html.indexOf('./src/model-presence-bus.js');
  const bootstrap = html.indexOf('./src/runtime-integration-bootstrap.js');
  const commons = html.indexOf('./src/house-commons-chat-v3.js');
  assert.ok(bus >= 0, 'Model Presence Bus must be mounted');
  assert.ok(bootstrap > bus, 'Runtime integration bootstrap must mount after Model Presence Bus');
  assert.ok(commons > bootstrap, 'House Commons v3 must mount after the runtime integration bootstrap');
});
