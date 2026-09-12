import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createSomaticProfileStore, detectSomaticChannels } from '../src/somatic-profile.js';
import { createSomaticEventBridge } from '../src/somatic-event-bridge.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test('somatic profile persists bounded user calibration and feedback', () => {
  const storage = memoryStorage();
  const store = createSomaticProfileStore({ storage, now: () => '2026-09-12T16:00:00.000Z' });
  const saved = store.save({ gain_ceiling: 0.5, cooldown_ms: 12, bindings: { navigation: true } });
  assert.equal(saved.gain_ceiling, 0.08);
  assert.equal(saved.cooldown_ms, 150);
  assert.equal(saved.bindings.navigation, true);
  const rated = store.rateCue('threshold', 'clear', 'Distinct in bone-conduction route');
  assert.equal(rated.cue_feedback.threshold.rating, 'clear');
  assert.equal(store.load().cue_feedback.threshold.note, 'Distinct in bone-conduction route');
});

test('somatic channel detection reports capabilities without enumerating devices', () => {
  function AudioContext() {}
  function PointerEvent() {}
  function DeviceMotionEvent() {}
  const result = detectSomaticChannels({
    AudioContext,
    PointerEvent,
    DeviceMotionEvent,
    navigator: { maxTouchPoints: 2, vibrate() {}, mediaDevices: { getUserMedia() {} }, getGamepads() {} },
  });
  assert.equal(result.web_audio, true);
  assert.equal(result.vibration, true);
  assert.equal(result.touch, true);
  assert.equal(result.microphone_api, true);
  assert.equal(result.bone_conduction_compatible, true);
  assert.equal(result.selected_audio_route, 'system-selected-output');
});

test('navigation somatic cue is opt-in and cooldown-limited', async () => {
  const storage = memoryStorage();
  const profile = createSomaticProfileStore({ storage });
  const bus = createEventBus();
  const emitted = [];
  let clock = 1000;
  const somatic = { emit: async (cue) => { emitted.push(cue); return { status: 'applied' }; } };
  const bridge = createSomaticEventBridge({ bus, somatic, profile, now: () => clock });

  bus.publish('arcsweep:navigation-changed', { current_room: 'forge' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(emitted, []);

  profile.save({ bindings: { navigation: true, brush_contact: false }, cooldown_ms: 450 });
  clock = 2000;
  bus.publish('arcsweep:navigation-changed', { current_room: 'records' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(emitted, ['navigation']);

  clock = 2200;
  bus.publish('arcsweep:navigation-changed', { current_room: 'worlds' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(emitted, ['navigation']);

  clock = 2600;
  bus.publish('arcsweep:navigation-changed', { current_room: 'portal' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(emitted, ['navigation', 'navigation']);
  bridge.destroy();
});
