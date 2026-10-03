import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  DEFAULT_RESONANCE_ROOM_STATE,
  RESONANCE_ROOM_FIELD_SCHEMA,
  RESONANCE_ROOM_RECEIPT_SCHEMA,
  deriveResonanceRoomField,
  normaliseResonanceRoomState,
  patchResonanceRoomState,
  createResonanceRoomReceipt,
} from '../src/resonance-room-model.js';

test('resonance chamber normalises bounded field state', () => {
  const state = normaliseResonanceRoomState({
    frequency_hz: 9999,
    amplitude: -1,
    damping: 2,
    coupling: 2,
    mode_order: 42,
    source_x: -3,
    source_y: 9,
  });
  assert.equal(state.frequency_hz, 880);
  assert.equal(state.amplitude, 0.05);
  assert.equal(state.damping, 0.85);
  assert.equal(state.coupling, 1);
  assert.equal(state.mode_order, 9);
  assert.equal(state.source_x, -1);
  assert.equal(state.source_y, 0.7);
});

test('one resonance field drives mode geometry, glass and somatic mapping', () => {
  const field = deriveResonanceRoomField(DEFAULT_RESONANCE_ROOM_STATE);
  assert.equal(field.schema, RESONANCE_ROOM_FIELD_SCHEMA);
  assert.equal(field.nodes.length, DEFAULT_RESONANCE_ROOM_STATE.mode_order + 1);
  assert.equal(field.antinodes.length, DEFAULT_RESONANCE_ROOM_STATE.mode_order);
  assert.equal(field.wave.length, 96);
  assert.equal(field.field.medium, 'resonance-chamber');
  assert.ok(field.glass.transmission >= 0.72 && field.glass.transmission <= 0.98);
  assert.ok(field.glass.ior >= 1.22 && field.glass.ior <= 1.64);
  assert.ok(field.somatic.frequency_scale >= 0.9 && field.somatic.frequency_scale <= 1.1);
  assert.ok(field.somatic.haptic_scale >= 0.72 && field.somatic.haptic_scale <= 1.34);
  assert.match(field.rule, /one field state drives geometry/);
});

test('changing amplitude and coupling thickens the glass embodiment', () => {
  const quiet = deriveResonanceRoomField({ ...DEFAULT_RESONANCE_ROOM_STATE, amplitude: 0.1, coupling: 0.1 });
  const strong = deriveResonanceRoomField({ ...DEFAULT_RESONANCE_ROOM_STATE, amplitude: 0.95, coupling: 0.95 });
  assert.ok(strong.glass.thickness > quiet.glass.thickness);
  assert.ok(strong.glass.ior > quiet.glass.ior);
  assert.ok(strong.glass.transmission > quiet.glass.transmission);
});

test('source motion perturbs the same standing-wave field rather than creating a second state', () => {
  const left = deriveResonanceRoomField({ ...DEFAULT_RESONANCE_ROOM_STATE, source_x: -0.8, coupling: 0.9 });
  const right = deriveResonanceRoomField({ ...DEFAULT_RESONANCE_ROOM_STATE, source_x: 0.8, coupling: 0.9 });
  assert.notDeepEqual(left.wave.map((sample) => sample.y), right.wave.map((sample) => sample.y));
  assert.equal(left.state.schema, right.state.schema);
});

test('receipts preserve before, after and derived transduction state', () => {
  const before = DEFAULT_RESONANCE_ROOM_STATE;
  const after = patchResonanceRoomState(before, { frequency_hz: 432, mode_order: 6, amplitude: 0.72 });
  const receipt = createResonanceRoomReceipt({
    kind: 'field-tune',
    before,
    after,
    createdAt: '2026-10-02T16:20:00.000Z',
  });
  assert.equal(receipt.schema, RESONANCE_ROOM_RECEIPT_SCHEMA);
  assert.equal(receipt.before.frequency_hz, 174);
  assert.equal(receipt.after.frequency_hz, 432);
  assert.equal(receipt.after.mode_order, 6);
  assert.equal(receipt.derived.node_count, 7);
  assert.ok(receipt.derived.glass.thickness > 0);
});

test('Resonance Chamber is a permanent room with a lazy Three.js sidecar', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const selected = await readFile(new URL('../src/selected-applet-navigation.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/resonance-room-sidecar.js', import.meta.url), 'utf8');

  assert.match(main, /\['resonance-chamber', 'Resonance', '◎'\]/);
  assert.match(main, /data-resonance-room/);
  assert.match(main, /data-resonance-canvas/);
  assert.match(main, /renderResonanceChamber/);
  assert.match(selected, /'resonance-chamber'/);
  assert.match(bootstrap, /resonance-room-sidecar\.js/);
  assert.match(bootstrap, /'resonance-chamber':\['resonance'\]/);
  assert.match(sidecar, /await import\('three'\)/);
  assert.match(sidecar, /MeshPhysicalMaterial/);
  assert.match(sidecar, /transmission/);
  assert.match(sidecar, /thickness/);
  assert.match(sidecar, /__arcsweepSomatic/);
  assert.match(sidecar, /arcsweep:resonance-room-receipt/);
});

test('reduced motion keeps a static Three renderer instead of removing the room', async () => {
  const sidecar = await readFile(new URL('../src/resonance-room-sidecar.js', import.meta.url), 'utf8');
  assert.match(sidecar, /const motionAllowed = !reducedMotion\(\)/);
  assert.match(sidecar, /if \(motionAllowed\) tick\(\); else renderer\.render/);
});
