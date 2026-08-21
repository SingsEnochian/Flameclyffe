import test from 'node:test';
import assert from 'node:assert/strict';

import { bootstrapRuntimeIntegration } from '../src/runtime-integration-bootstrap.js';
import { loadRuntimeIntegrationEnvelope, runtimeIntegrationStorageKey } from '../src/runtime-integration-store.js';
import { CONSTELLATION_LENS_EVENTS } from '../src/constellation-lens.js';
import { diagnoseModelPresence } from '../src/runtime-presence-diagnostics.js';
import { renderRuntimeFeedbackLiveRead } from '../src/runtime-envelope-live-ui.js';
import { buildRuntimeReplayReceipt, restoreEnvelopeFromReplay, runtimeReplayEquivalent } from '../src/runtime-integration-replay.js';

function memoryStorage() {
  const values = new Map();
  return {
    values,
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

function world(id, name, contextId) {
  return {
    schema: 'arcsweep.runtime-world-context/v1',
    context_id: contextId,
    identity_anchor: { world_id: id },
    world: { id, name, kind: id === 'terra-prime' ? 'waking-world' : 'authored-world' },
  };
}

test('ARCSWEEP_RUNTIME_INTEGRATION_ACCEPTANCE: World, presence, Commons feedback, persistence, isolation, diagnostics, and replay remain one coherent braid', async () => {
  const storage = memoryStorage();
  const terra = world('terra-prime', 'Terra Prime', 'runtime-world:terra-prime:acceptance');
  const luna = world('luna', 'Luna', 'runtime-world:luna:acceptance');
  const terraTarget = new EventTarget();

  const terraBoot = await bootstrapRuntimeIntegration({
    storage,
    target: terraTarget,
    readWorld: async () => terra,
    readPresence: () => [{ voice_id: 'atlas', state: 'ready' }],
  });
  assert.equal(terraBoot.world.identity_anchor.world_id, 'terra-prime');
  assert.equal(terraBoot.presence.atlas, 'ready');

  terraTarget.dispatchEvent(detailEvent(CONSTELLATION_LENS_EVENTS.response, {
    requestId: 'acceptance-terra-1',
    voiceId: 'atlas',
    kind: 'observation',
    text: 'Terra Prime braid receipt.',
    runtimeWorldContextId: terra.context_id,
    citedSources: ['commons:terra-steward-1', 'commons:terra-atlas-1'],
    createdAt: '2026-08-21T19:00:00.000Z',
  }));

  const terraPersisted = loadRuntimeIntegrationEnvelope(storage, 'terra-prime');
  assert.equal(terraPersisted.feedback.length, 1);
  assert.ok(terraPersisted.feedback[0].supporting_receipts.includes('commons:terra-atlas-1'));
  assert.ok(storage.values.has(runtimeIntegrationStorageKey('terra-prime')));

  const lunaBoot = await bootstrapRuntimeIntegration({
    storage,
    target: new EventTarget(),
    readWorld: async () => luna,
    readPresence: () => [{ voice_id: 'atlas', state: 'ready' }],
  });
  assert.equal(lunaBoot.world.identity_anchor.world_id, 'luna');
  assert.equal(lunaBoot.feedback.length, 0, 'Terra Prime feedback must not leak into Luna');
  assert.notEqual(lunaBoot.session_id, terraPersisted.session_id, 'A new World begins with its own runtime session');
  assert.ok(storage.values.has(runtimeIntegrationStorageKey('luna')));

  const terraReturn = await bootstrapRuntimeIntegration({
    storage,
    target: new EventTarget(),
    readWorld: async () => terra,
    readPresence: () => [],
  });
  assert.equal(terraReturn.session_id, terraPersisted.session_id, 'Returning to Terra Prime restores its own runtime session');
  assert.equal(terraReturn.feedback.length, 1, 'Returning to Terra Prime restores its feedback ledger');
  assert.equal(terraReturn.feedback[0].text, 'Terra Prime braid receipt.');

  const rendered = renderRuntimeFeedbackLiveRead(terraReturn);
  assert.match(rendered, /data-runtime-receipt-ref="commons:terra-atlas-1"/);
  assert.match(rendered, /Commons turn/);

  const freshDiagnostic = diagnoseModelPresence({
    voice_id: 'atlas', state: 'ready', provider: 'huggingface', model: 'atlas-model', route: 'atlas', observed_at: '2026-08-21T19:00:00.000Z',
  }, Date.parse('2026-08-21T19:00:30.000Z'));
  assert.equal(freshDiagnostic.severity, 'ok');
  assert.equal(freshDiagnostic.stale, false);

  const staleMismatch = diagnoseModelPresence({
    voice_id: 'atlas', state: 'ready', provider: '', model: '', route: 'wrong-route', observed_at: '2026-08-21T18:55:00.000Z',
  }, Date.parse('2026-08-21T19:00:30.000Z'));
  assert.equal(staleMismatch.stale, true);
  assert.equal(staleMismatch.routeMismatch, true);
  assert.equal(staleMismatch.providerMissing, true);
  assert.equal(staleMismatch.modelMissing, true);
  assert.equal(staleMismatch.severity, 'degraded');

  const replay = buildRuntimeReplayReceipt(terraReturn, {
    replayId: 'runtime-integration-acceptance-terra-replay',
    reason: 'runtime-integration-acceptance',
    createdAt: '2026-08-21T19:01:00.000Z',
  });
  assert.equal(runtimeReplayEquivalent(terraReturn, restoreEnvelopeFromReplay(replay)), true);
});
