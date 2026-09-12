import test from 'node:test';
import assert from 'node:assert/strict';
import { createAfferentBus, normalizeGlyphBrushSample } from '../src/afferent-bus.js';

function fakeTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); return true; },
    emit(name, detail) { listeners.get(name)?.({ detail }); },
  };
}

function sample(overrides = {}) {
  return {
    schema: 'arcsweep.glyph-brush-sample/v1',
    phase: 'move',
    stroke_id: 'stroke:7',
    brush_id: 'brush:ink',
    pointer_type: 'pen',
    pressure: 1.7,
    velocity_px_s: 9000,
    tilt_x: 120,
    tilt_y: -120,
    twist: 500,
    timestamp: 1234,
    ...overrides,
  };
}

test('glyph brush samples normalize into bounded afferent signals', () => {
  const signal = normalizeGlyphBrushSample(sample(), () => 99);
  assert.equal(signal.schema, 'arcsweep.afferent-signal/v1');
  assert.equal(signal.source, 'glyph-forge');
  assert.equal(signal.modality, 'pencil');
  assert.equal(signal.intent, 'expression');
  assert.equal(signal.vector.pressure, 1);
  assert.equal(signal.vector.velocity_px_s, 5000);
  assert.equal(signal.vector.tilt_x, 90);
  assert.equal(signal.vector.tilt_y, -90);
  assert.equal(signal.vector.twist, 359);
  assert.equal(signal.context.stroke_id, 'stroke:7');
});

test('touch samples remain distinguishable from pencil samples', () => {
  const signal = normalizeGlyphBrushSample(sample({ pointer_type: 'touch', phase: 'start' }));
  assert.equal(signal.modality, 'touch');
  assert.equal(signal.intent, 'contact');
});

test('afferent bus publishes a sequenced OS signal beside the DOM signal', () => {
  const target = fakeTarget();
  const published = [];
  const bus = { publish(name, payload) { published.push({ name, payload }); } };
  const afferent = createAfferentBus({ eventTarget: target, bus, now: () => 2000 });
  const seen = [];
  const unsubscribe = afferent.subscribe((signal) => seen.push(signal));

  target.emit('arcsweep:glyph-brush-sample', sample({ timestamp: 2000 }));

  assert.equal(seen.length, 1);
  assert.equal(seen[0].sequence, 1);
  assert.equal(published.length, 1);
  assert.equal(published[0].name, 'arcsweep:afferent-signal');
  assert.equal(published[0].payload.schema, 'arcsweep.afferent-signal/v1');
  assert.equal(afferent.status().sequence, 1);

  unsubscribe();
  afferent.destroy();
});
