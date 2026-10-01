import test from 'node:test';
import assert from 'node:assert/strict';

import { createGestureSomaticFeedback, gestureCueForState } from '../src/gesture-somatic-feedback.js';
import { createSomaticProfileStore } from '../src/somatic-profile.js';
import { getSomaticCue } from '../src/somatic-runtime.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function eventTarget() {
  const listeners = new Map();
  const emitted = [];
  return {
    emitted,
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    dispatchEvent(event) { emitted.push(event); listeners.get(event.type)?.(event); return true; },
  };
}

function gesture(overrides = {}) {
  return {
    schema: 'arcsweep.gesture-state/v1',
    event_id: 'gesture:test:1',
    source: 'camera-mediapipe',
    gesture: 'pinch',
    state: 'targeted',
    phase: 'target',
    hand: 'right',
    target_id: 'artifact:1',
    confidence: 0.92,
    ...overrides,
  };
}

test('gesture states map to distinct semantic cues without claiming action success', () => {
  for (const [state, cueId] of Object.entries({
    aware: 'gesture_aware',
    targeted: 'gesture_targeted',
    armed: 'gesture_armed',
    captured: 'gesture_captured',
    committing: 'gesture_commit_request',
    cancelled: 'gesture_cancelled',
    'tracking-lost': 'gesture_tracking_lost',
  })) {
    assert.equal(gestureCueForState(state), cueId);
    const cue = getSomaticCue(cueId);
    assert.ok(cue);
    assert.ok(Array.isArray(cue.tones_hz));
    assert.ok(Array.isArray(cue.vibration_ms));
  }
  assert.match(getSomaticCue('gesture_commit_request').meaning, /success is not implied/i);
});

test('gesture feedback is opt-in, confidence gated, and silent during continuous movement', async () => {
  const profile = createSomaticProfileStore({ storage: memoryStorage() });
  const target = eventTarget();
  const emitted = [];
  let clock = 1000;
  const bridge = createGestureSomaticFeedback({
    profile,
    eventTarget: target,
    now: () => clock,
    somatic: {
      emit: async (cue, options) => { emitted.push({ cue, options }); return { status: 'applied' }; },
      stop: async () => ({ status: 'applied' }),
    },
  });

  assert.equal((await bridge.handle(gesture())).reason, 'gesture-feedback-disabled');
  profile.save({ bindings: { gesture_feedback: true }, gesture: { min_confidence: 0.6, feedback_cooldown_ms: 120 } });

  assert.equal((await bridge.handle(gesture({ confidence: 0.4 }))).reason, 'low-confidence');
  assert.equal((await bridge.handle(gesture({ state: 'moving' }))).status, 'silent');

  const applied = await bridge.handle(gesture());
  assert.equal(applied.status, 'applied');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].cue, 'gesture_targeted');
  assert.equal(emitted[0].options.context.gesture, 'pinch');
  assert.equal(emitted[0].options.context.target_id, 'artifact:1');

  clock += 50;
  assert.equal((await bridge.handle(gesture())).reason, 'repeat-cooldown');

  clock += 150;
  const lost = await bridge.handle(gesture({ state: 'tracking-lost', confidence: 0.1 }));
  assert.equal(lost.status, 'applied');
  assert.equal(emitted.at(-1).cue, 'gesture_tracking_lost');
  bridge.destroy();
});

test('Feather gesture stops active somatic output and emits no replacement cue', async () => {
  const profile = createSomaticProfileStore({ storage: memoryStorage() });
  profile.save({ bindings: { gesture_feedback: true } });
  let stopped = 0;
  let emitted = 0;
  const bridge = createGestureSomaticFeedback({
    profile,
    eventTarget: eventTarget(),
    somatic: {
      emit: async () => { emitted += 1; return { status: 'applied' }; },
      stop: async () => { stopped += 1; return { status: 'applied' }; },
    },
  });

  await bridge.handle(gesture({ gesture: 'Feather', state: 'armed' }));
  assert.equal(stopped, 1);
  assert.equal(emitted, 0);
  bridge.destroy();
});
