import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_PRESENCE_SCHEMA,
  createModelPresence,
  normalisePresenceState,
  publishModelPresence,
} from '../src/model-presence-bus.js';

test('normalises runtime health into the shared lifecycle vocabulary', () => {
  assert.equal(normalisePresenceState('house-offline'), 'offline');
  assert.equal(normalisePresenceState('house-route-defined'), 'waking');
  assert.equal(normalisePresenceState('ready'), 'ready');
  assert.equal(normalisePresenceState('model-unavailable'), 'degraded');
  assert.equal(normalisePresenceState('runtime-mismatch'), 'degraded');
  assert.equal(normalisePresenceState('voice-error'), 'error');
});

test('presence records keep provider, model, world, task, and context attribution', () => {
  const presence = createModelPresence({
    voiceId: 'lioreal',
    displayName: 'Lioreal',
    state: 'thinking',
    provider: 'openai',
    model: 'gpt-4o',
    route: 'lioreal',
    latencyMs: 24,
    worldId: 'terra-prime',
    runtimeWorldContextId: 'runtime-world:terra-prime:abc123',
    task: 'canon-studio:continuity-check',
    observedAt: '2026-08-21T17:50:00.000Z',
  });

  assert.equal(presence.schema, MODEL_PRESENCE_SCHEMA);
  assert.equal(presence.voice_id, 'lioreal');
  assert.equal(presence.state, 'thinking');
  assert.equal(presence.provider, 'openai');
  assert.equal(presence.model, 'gpt-4o');
  assert.equal(presence.world_id, 'terra-prime');
  assert.equal(presence.runtime_world_context_id, 'runtime-world:terra-prime:abc123');
  assert.equal(presence.task, 'canon-studio:continuity-check');
  assert.equal(Object.isFrozen(presence), true);
});

test('unknown runtime states degrade instead of pretending to be ready', () => {
  const presence = createModelPresence({ voiceId: 'atlas', state: 'mystery-state' });
  assert.equal(presence.state, 'degraded');
});

// Astra 6.1 Presence Fabric invariants

test('Astra 6.1 — createModelPresence includes presence_id, identity_id, surface, participation_mode, session_id', () => {
  const presence = createModelPresence({
    voiceId: 'vesper',
    surface: 'web',
    participationMode: 'active',
    sessionId: 'sess-001',
  });
  assert.ok(typeof presence.presence_id === 'string' && presence.presence_id.length > 0, 'presence_id must be a non-empty string');
  assert.ok(typeof presence.identity_id === 'string' && presence.identity_id.length > 0, 'identity_id must be a non-empty string');
  assert.equal(presence.surface, 'web');
  assert.equal(presence.participation_mode, 'active');
  assert.equal(presence.session_id, 'sess-001');
});

test('Astra 6.1 — identity_id defaults to voice_id when not provided', () => {
  const presence = createModelPresence({ voiceId: 'solara' });
  assert.equal(presence.identity_id, 'solara');
  assert.equal(presence.voice_id, 'solara');
});

test('Astra 6.1 — identity_id is NOT overwritten when model/provider is rebound via publishModelPresence', () => {
  const voiceId = `rebind-test-${Date.now()}`;
  const first = publishModelPresence({
    voiceId,
    identityId: 'fixed-identity-anchor',
    provider: 'openai',
    model: 'gpt-4o',
    state: 'ready',
  });
  assert.equal(first.identity_id, 'fixed-identity-anchor', 'initial identity_id should be set');

  const second = publishModelPresence({
    voiceId,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    state: 'thinking',
  });
  assert.equal(second.identity_id, 'fixed-identity-anchor', 'identity_id must survive provider/model rebind');
  assert.equal(second.provider, 'anthropic', 'provider should update');
  assert.equal(second.model, 'claude-3-5-sonnet', 'model should update');
});

test('Astra 6.1 — unknown surface value normalises to "unknown" not silently dropped', () => {
  const presence = createModelPresence({ voiceId: 'atlas', surface: 'holodeck' });
  assert.equal(presence.surface, 'unknown');
});

test('Astra 6.1 — unknown participation_mode normalises to null', () => {
  const presence = createModelPresence({ voiceId: 'atlas', participationMode: 'overlord' });
  assert.equal(presence.participation_mode, null);
});

test('Astra 6.1 — presence_id is auto-generated and stable across publishModelPresence updates', () => {
  const voiceId = `stable-presence-${Date.now()}`;
  const first = publishModelPresence({ voiceId, state: 'ready' });
  assert.ok(typeof first.presence_id === 'string' && first.presence_id.length > 0, 'presence_id must be generated');

  const second = publishModelPresence({ voiceId, state: 'thinking' });
  assert.equal(second.presence_id, first.presence_id, 'presence_id must be stable across state updates');
});

test('Astra 6.1 — participation_mode "active" adds no authority field and grants no escalated privilege', () => {
  const presence = createModelPresence({ voiceId: 'cosmo', participationMode: 'active' });
  assert.equal(presence.participation_mode, 'active');
  assert.equal(Object.hasOwn(presence, 'authority'), false, 'no authority field must exist');
  assert.equal(Object.hasOwn(presence, 'elevated'), false, 'no elevated field must exist');
  assert.equal(Object.hasOwn(presence, 'privileges'), false, 'no privileges field must exist');
  // The object contains exactly the known fields — confirm key count stays bounded
  const keys = Object.keys(presence);
  const knownFields = new Set([
    'schema', 'voice_id', 'display_name', 'state', 'provider', 'model', 'route',
    'latency_ms', 'world_id', 'runtime_world_context_id', 'task', 'reason', 'observed_at',
    'presence_id', 'identity_id', 'surface', 'participation_mode', 'session_id', 'presence',
  ]);
  for (const key of keys) {
    assert.ok(knownFields.has(key), `unexpected field on presence object: ${key}`);
  }
});
