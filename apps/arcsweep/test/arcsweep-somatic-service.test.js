import test from 'node:test';
import assert from 'node:assert/strict';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { createEventBus } from '../src/os/kernel.js';
import { registerGlyphForgeService } from '../src/os/glyphforge-service.js';
import { registerRunaService } from '../src/os/runa-service.js';
import { createSomaticState, createSomaticTarget } from '../src/os/somatic-cartography.js';

function fakeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, handler) {
      const bucket = listeners.get(name) || new Set();
      bucket.add(handler);
      listeners.set(name, bucket);
    },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
    emit(name, detail) {
      for (const handler of listeners.get(name) || []) handler({ type: name, detail });
    },
  };
}

const fixedNow = () => new Date('2026-09-14T01:30:00.000Z');

test('Helm executes through Runa and Glyph Forge then waits for real stroke evidence', async () => {
  const bus = createEventBus({ now: fixedNow });
  const registry = createCapabilityRegistry({ bus, now: fixedNow });
  const events = fakeEventTarget();
  const vibrations = [];
  const spoken = [];

  const glyph = registerGlyphForgeService(registry, {
    bus,
    eventTarget: events,
    dispatchGestureCue: () => true,
    now: fixedNow,
  });
  const runa = registerRunaService(registry, {
    bus,
    vibrate: (pattern) => { vibrations.push(pattern); return true; },
    speak: (text) => { spoken.push(text); return true; },
    now: fixedNow,
  });

  const state = createSomaticState({
    world_id: 'kelyran',
    continuity_packet_id: 'braid:test',
    channels: {
      posture: { mode: 'resting-seated' },
      haptic: { bpm: 0 },
      movement: { hands: 'available' },
    },
    provenance: { posture: 'user', haptic: 'device', movement: 'device' },
  }, { now: fixedNow });
  const target = createSomaticTarget({
    target_id: 'kelyran:meda:embodied',
    desired: { posture: 'writing', rhythm_bpm: 55, gesture_id: 'glyph.meda' },
    arrival_conditions: ['cadence-established', 'posture-ready', 'gesture-ready', 'embodied-glyph'],
  });

  const planned = await registry.invoke('somatic.plan', { state, target }, { authority: 'read', actor_id: 'rowan' });
  assert.equal(planned.status, 'applied');
  assert.equal(planned.output.steps.at(-1).capabilities[0], 'glyphforge.trace.arm');

  const executed = await registry.invoke('somatic.execute-course', { course: planned.output }, {
    authority: 'operate', actor_id: 'rowan', source: 'test',
  });
  assert.equal(executed.status, 'applied');
  assert.equal(executed.output.status, 'awaiting-body-observation');
  assert.ok(vibrations.length >= 2);
  assert.deepEqual(spoken, ['me-da']);
  assert.equal(glyph.armedTraces().length, 1);
  assert.equal(runa.somatic.pending().length, 1);

  events.emit('starwell:glyph-stroke-committed', {
    glyph_id: 'glyph.meda',
    pointer_type: 'pen',
    point_count: 18,
  });

  assert.equal(glyph.armedTraces().length, 0);
  assert.equal(runa.somatic.pending().length, 0);
  const receipts = runa.somatic.store.receipts();
  assert.equal(receipts.at(-1).status, 'observed');
  assert.equal(receipts.at(-1).transition, 'tracing-ready → embodied-glyph');

  glyph.destroy();
  runa.destroy();
});

test('Runa somatic output reports unsupported hardware without inventing success', async () => {
  const bus = createEventBus({ now: fixedNow });
  const registry = createCapabilityRegistry({ bus, now: fixedNow });
  registerRunaService(registry, {
    bus,
    vibrate: () => false,
    speak: () => false,
    now: fixedNow,
  });

  const haptic = await registry.invoke('runa.haptic.start', { bpm: 55 }, { authority: 'operate' });
  const audio = await registry.invoke('runa.audio.play', { phoneme: 'me-da' }, { authority: 'operate' });

  assert.equal(haptic.status, 'applied');
  assert.equal(haptic.output.applied, false);
  assert.equal(haptic.output.supported, false);
  assert.equal(audio.output.applied, false);
  assert.equal(audio.output.supported, false);
});
