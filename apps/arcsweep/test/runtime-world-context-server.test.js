import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bindMessageToRuntimeWorld,
  normaliseRuntimeWorldContext,
  RUNTIME_WORLD_CONTEXT_MARKER,
} from '../../../netlify/functions/_shared/runtime-world-context.mjs';

const context = {
  schema: 'arcsweep.runtime-world-context/v1',
  version: 1,
  active_world_id: 'terra-prime',
  context_id: 'runtime-world:terra-prime:abc123',
  context_fingerprint: 'a'.repeat(64),
  identity_anchor: { world_id: 'terra-prime', world_birth_receipt_id: 'world-born:terra-prime:origin', worldseed_fingerprint: 'seed-prime' },
  world: { id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World' },
  authored_context: { description: 'Current lived reality.', history: '', rules: 'Use receipted state.', arrival: {}, identity: {} },
  waking_world: {
    schema: 'arcsweep.waking-world/v1',
    canonical_name: 'Terra Prime',
    stable_anchor: { title: 'Current Reality Anchor', source_url: 'https://app.notion.com/p/3a870290d9c481c5b8f2cdfb2cab70fc', source_revised_at: '2026-07-25T19:11:27.741Z' },
    live_state: { source: 'arcsweep:waking-thread', entry_count: 1, latest_observed_at: '2026-08-20T20:20:00.000Z', entries: [{ id: 'wake-1', title: 'Current state', source: 'Self-entered', details: 'Live now.', observed_at: '2026-08-20T20:20:00.000Z' }] },
  },
};

test('normalises the client World context and keeps Terra Prime live state', () => {
  const normalised = normaliseRuntimeWorldContext({ metadata: { world_id: 'terra-prime', world_context: context } });
  assert.equal(normalised.identity_anchor.world_id, 'terra-prime');
  assert.equal(normalised.waking_world.live_state.entries[0].details, 'Live now.');
  assert.equal(normalised.waking_world.stable_anchor.source_revised_at, '2026-07-25T19:11:27.741Z');
});

test('rejects a metadata world id that disagrees with the context identity anchor', () => {
  assert.throws(() => normaliseRuntimeWorldContext({ metadata: { world_id: 'starsong', world_context: context } }), /does not match/);
});

test('binds stable and live Terra Prime layers into the model-visible prompt', () => {
  const normalised = normaliseRuntimeWorldContext({ metadata: { world_id: 'terra-prime', world_context: context } });
  const message = bindMessageToRuntimeWorld('What is current?', normalised);
  assert.match(message, new RegExp(`^${RUNTIME_WORLD_CONTEXT_MARKER}`));
  assert.match(message, /World: Terra Prime/);
  assert.match(message, /Stable Current Reality Anchor/);
  assert.match(message, /Latest Waking Thread observation: 2026-08-20T20:20:00.000Z/);
  assert.match(message, /Current state: Live now\./);
});

test('World binding is idempotent when the browser already bound the local prompt', () => {
  const normalised = normaliseRuntimeWorldContext({ metadata: { world_id: 'terra-prime', world_context: context } });
  const once = bindMessageToRuntimeWorld('What is current?', normalised);
  const twice = bindMessageToRuntimeWorld(once, normalised);
  assert.equal(twice, once);
});
