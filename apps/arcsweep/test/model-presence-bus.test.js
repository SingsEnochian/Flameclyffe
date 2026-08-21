import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_PRESENCE_SCHEMA,
  createModelPresence,
  normalisePresenceState,
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
