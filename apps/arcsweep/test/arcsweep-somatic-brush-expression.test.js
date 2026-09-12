import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSomaticProfileStore } from '../src/somatic-profile.js';
import { createSomaticEventBridge } from '../src/somatic-event-bridge.js';

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
  return {
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    dispatch(name, detail) { listeners.get(name)?.({ detail }); },
  };
}

function bus() {
  const listeners = new Map();
  return {
    subscribe(name, handler) {
      listeners.set(name, handler);
      return () => listeners.delete(name);
    },
    publish(name, payload) { listeners.get(name)?.({ payload }); },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function sample(overrides = {}) {
  return {
    schema: 'arcsweep.glyph-brush-sample/v1',
    phase: 'start',
    stroke_id: 'stroke:test',
    brush_id: 'brush:test',
    pointer_type: 'pen',
    pressure: 0.5,
    velocity_px_s: 450,
    tilt_x: 0,
    tilt_y: 0,
    twist: 0,
    ...overrides,
  };
}

test('Glyph Forge brush somatics are opt-in and pressure threshold gated', async () => {
  const storage = memoryStorage();
  const profile = createSomaticProfileStore({ storage });
  const target = eventTarget();
  const emitted = [];
  let clock = 1000;
  const bridge = createSomaticEventBridge({
    bus: bus(),
    eventTarget: target,
    profile,
    now: () => clock,
    somatic: { emit: async (cue, options) => { emitted.push({ cue, options }); return { status: 'applied' }; } },
  });

  target.dispatch('arcsweep:glyph-brush-sample', sample());
  await flush();
  assert.equal(emitted.length, 0);

  profile.save({ bindings: { brush_contact: true }, brush: { min_pressure: 0.2 } });
  target.dispatch('arcsweep:glyph-brush-sample', sample({ pressure: 0.1 }));
  await flush();
  assert.equal(emitted.length, 0);

  clock += 300;
  target.dispatch('arcsweep:glyph-brush-sample', sample({ pressure: 0.6 }));
  await flush();
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].cue, 'brush_contact');
  assert.equal(emitted[0].options.context.phase, 'start');
  assert.ok(emitted[0].options.gain_ceiling > 0);
  bridge.destroy();
});

test('brush expression maps pressure, velocity, and tilt inside bounded semantic modulation', async () => {
  const storage = memoryStorage();
  const profile = createSomaticProfileStore({ storage });
  profile.save({
    bindings: { brush_contact: true, brush_expression: true },
    gain_ceiling: 0.025,
    brush: { expression_cooldown_ms: 120, velocity_reference_px_s: 900, min_pressure: 0.05 },
  });
  const target = eventTarget();
  const emitted = [];
  let clock = 1000;
  const bridge = createSomaticEventBridge({
    bus: bus(),
    eventTarget: target,
    profile,
    now: () => clock,
    somatic: { emit: async (cue, options) => { emitted.push({ cue, options }); return { status: 'applied' }; } },
  });

  target.dispatch('arcsweep:glyph-brush-sample', sample({ phase: 'start', pressure: 0.25, velocity_px_s: 100, tilt_x: 0, tilt_y: 0 }));
  await flush();
  assert.equal(emitted.length, 1);
  const low = emitted[0].options;

  clock += 160;
  target.dispatch('arcsweep:glyph-brush-sample', sample({ phase: 'move', pressure: 0.9, velocity_px_s: 900, tilt_x: 64, tilt_y: 40 }));
  await flush();
  assert.equal(emitted.length, 2);
  const high = emitted[1].options;

  assert.ok(high.gain_ceiling > low.gain_ceiling, 'pressure should increase bounded cue gain');
  assert.ok(high.modulation.haptic_scale > low.modulation.haptic_scale, 'pressure should increase bounded haptic scale');
  assert.ok(high.modulation.frequency_scale > low.modulation.frequency_scale, 'velocity should increase bounded pitch scale');
  assert.ok(high.modulation.duration_scale > low.modulation.duration_scale, 'tilt magnitude should increase bounded duration scale');
  assert.ok(high.modulation.frequency_scale >= 0.85 && high.modulation.frequency_scale <= 1.15);
  assert.ok(high.modulation.duration_scale >= 0.65 && high.modulation.duration_scale <= 1.35);
  assert.ok(high.modulation.haptic_scale >= 0.5 && high.modulation.haptic_scale <= 1.5);
  bridge.destroy();
});

test('GlyphCanvas publishes pressure, velocity, tilt, and stroke phases without replacing drawing state', () => {
  const source = readFileSync(new URL('../../starwell/src/components/glyph-studio/GlyphCanvas.jsx', import.meta.url), 'utf8');
  for (const token of [
    'arcsweep:glyph-brush-sample',
    "phase: 'start'",
    "'move'",
    "'end'",
    'pressure:',
    'velocity_px_s:',
    'tilt_x:',
    'tilt_y:',
    'onCommitStroke(stroke)',
  ]) assert.ok(source.includes(token), `missing GlyphCanvas telemetry contract token: ${token}`);
});
