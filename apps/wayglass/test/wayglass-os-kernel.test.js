import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassOSKernel, WAYGLASS_OS_SYSTEMS } from '../src/os-kernel.js';

const organIds = [
  'world-continuity-core','presence-nervous-system','voice-consent-gate',
  'gateway-double-mobius','quad-eightfold-gestalt','sensorium',
  'living-observer','memory-flight-recorder',
];
const surfaceIds = [
  'systems','world-continuity','writing-room','native-voice','sound-composition',
  'universal-codex','quad-gestalt','living-watercolor','acoustic-room','spectral-field',
  'living-observer','library','commons','mythience-crossing','journey-before-destination',
  'altered-timeline',
];
const fixture = () => ({
  organs: organIds.map(id => ({ organ_id: 'wayglass.organ.' + id, maturity: 'FUNCTIONAL' })),
  surfaces: surfaceIds.map(id => ({ surface_id: 'wayglass:' + id, label: id, mount() {} })),
  clock: () => '2026-11-22T00:00:00.000Z',
  idFactory: () => 'wg-os-test-receipt',
});

test('Wayglass OS boots as one eight-system vessel over the native organ and surface registries', () => {
  const kernel = createWayglassOSKernel(fixture());
  const receipt = kernel.boot();
  const state = kernel.inspect();
  assert.equal(receipt.schema, 'wayglass.os-boot-receipt/v1');
  assert.equal(receipt.state, 'ASSEMBLED');
  assert.equal(receipt.systems_assembled, 8);
  assert.equal(state.system_count, 8);
  assert.equal(state.assembled_systems, 8);
  assert.equal(state.building_systems, 0);
  assert.equal(state.entryway, 'wayglass:living-watercolor');
  assert.equal(state.vessel, 'Wayglass');
  assert.deepEqual(state.systems.map(x => x.id), WAYGLASS_OS_SYSTEMS.map(x => x.id));
});

test('the eight systems bind the full native Wyrdrune and inherited deck', () => {
  const kernel = createWayglassOSKernel(fixture());
  const state = kernel.inspect();
  const byId = Object.fromEntries(state.systems.map(item => [item.id, item]));
  assert.ok(byId['wyrdrune-language'].surfaces.some(x => x.id === 'wayglass:writing-room' && x.present));
  assert.ok(byId['wyrdrune-language'].surfaces.some(x => x.id === 'wayglass:sound-composition' && x.present));
  assert.ok(byId['sensory-body'].surfaces.some(x => x.id === 'wayglass:living-watercolor' && x.present));
  assert.ok(byId['return-universe'].organs.some(x => x.id === 'wayglass.organ.memory-flight-recorder' && x.present));
  assert.ok(byId['cloud-host-install'].interfaces.includes('MCP'));
});

test('missing organs and surfaces become explicit build entries in their owning system', () => {
  const kernel = createWayglassOSKernel({ organs: [], surfaces: [] });
  const receipt = kernel.boot();
  const state = kernel.inspect();
  assert.equal(receipt.state, 'BUILDING');
  assert.equal(state.assembled_systems, 0);
  assert.equal(state.building_systems, 8);
  assert.ok(state.systems.every(item => item.missing.length > 0));
});

test('Feather holds the vessel sensory and active-work lanes until explicit release', () => {
  const kernel = createWayglassOSKernel(fixture());
  kernel.boot();
  const events = [];
  kernel.subscribe(event => events.push(event));
  const held = kernel.feather('owner-stop');
  assert.equal(held.state, 'HELD');
  assert.equal(held.feather_held, true);
  assert.throws(() => kernel.releaseFeather({ actor: 'owner', explicit: false }), /explicit actor/);
  const released = kernel.releaseFeather({ actor: 'owner', explicit: true });
  assert.equal(released.state, 'ASSEMBLED');
  assert.equal(released.feather_held, false);
  assert.deepEqual(events.map(event => event.type), ['os:feather', 'os:feather-released']);
});

test('boot is idempotent and emits one durable-shaped receipt', () => {
  const kernel = createWayglassOSKernel(fixture());
  const first = kernel.boot();
  const second = kernel.boot();
  assert.equal(first.receipt_id, second.receipt_id);
  assert.equal(first, second);
});

test('system inspection names an exact lane and rejects invented lanes', () => {
  const kernel = createWayglassOSKernel(fixture());
  assert.equal(kernel.system('wyrdrune-language').state, 'ASSEMBLED');
  assert.throws(() => kernel.system('imaginary-engine'), /Unknown Wayglass OS system/);
});

test('duplicate organ and surface identities cannot silently overwrite the vessel map', () => {
  assert.throws(() => createWayglassOSKernel({ organs: [
    { organ_id: 'wayglass.organ.presence' }, { organ_id: 'wayglass.organ.presence' },
  ], surfaces: [] }), /duplicate organ/);
  assert.throws(() => createWayglassOSKernel({ organs: [], surfaces: [
    { surface_id: 'wayglass:room' }, { surface_id: 'wayglass:room' },
  ] }), /duplicate surface/);
});
