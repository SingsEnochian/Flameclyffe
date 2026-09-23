import test from 'node:test';
import assert from 'node:assert/strict';
import { readRunaManifestationContext } from '../src/runa-manifestation-context.js';
import { contextualOrganLaunchHref } from '../src/organ-launch-route.js';
import { soundOrgan } from '../src/sound-organ-registry.js';

test('direct Codex entry gets world identity and sound configuration from workspace with empty or stale session', async () => {
  for (const active_world_id of [null, 'stale-world']) {
    const context = await readRunaManifestationContext({
      readWorkspace: async () => ({ activeWorldId: 'custom-world', worlds: [{ id: 'custom-world', name: 'Custom', soundscape: { rootHz: 287, waveform: 'square', overtones: 5 }, description: 'private narrative' }] }),
      readBinding: () => ({ active_world_id: 'old-book-world' }),
      readSession: () => ({ active_world_id, active_world_name: 'Stale name' }),
    });
    assert.equal(context.worldId, 'custom-world');
    assert.equal(context.worldName, 'Custom');
    assert.equal(context.world.soundscape.rootHz, 287);
    assert.equal(context.world.description, undefined);
    const link = new URL(contextualOrganLaunchHref(soundOrgan('tone-lab'), context, { hostname: 'flameclyffe.vercel.app', origin: 'https://flameclyffe.vercel.app' }), 'https://flameclyffe.vercel.app');
    assert.equal(link.searchParams.get('worldId'), 'custom-world');
    assert.equal(link.searchParams.get('worldName'), 'Custom');
  }
});

test('workspace changes are read afresh for the next invocation', async () => {
  let activeWorldId = 'first';
  const options = { readWorkspace: async () => ({ activeWorldId }), readBinding: () => ({}), readSession: () => ({ active_world_id: 'stale', active_world_name: 'Stale' }) };
  assert.equal((await readRunaManifestationContext(options)).worldId, 'first');
  activeWorldId = 'second';
  const context = await readRunaManifestationContext(options);
  assert.equal(context.worldId, 'second');
  assert.equal(context.worldName, null);
});

test('Codex binding precedes stale session when workspace is unavailable; session remains a last fallback', async () => {
  const options = { readWorkspace: async () => { throw new Error('unavailable'); }, readBinding: () => ({ active_world_id: 'bound-world' }), readSession: () => ({ active_world_id: 'stale-world', active_world_name: 'Stale' }) };
  assert.equal((await readRunaManifestationContext(options)).worldId, 'bound-world');
  assert.equal((await readRunaManifestationContext(options)).worldName, null);
  options.readBinding = () => null;
  assert.equal((await readRunaManifestationContext(options)).worldId, 'stale-world');
  options.readSession = () => { throw new Error('unavailable'); };
  assert.equal((await readRunaManifestationContext(options)).worldId, null);
});
