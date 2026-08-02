import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BIFROST_BRIDGE_STORAGE_KEY,
  BIFROST_STATE_STORAGE_KEY,
  createArcsweepBifrostRuntime,
} from '../src/arcsweep-temporal-quantum/runtime.js';

class MemoryStorage {
  #items = new Map();
  getItem(key) { return this.#items.get(key) ?? null; }
  setItem(key, value) { this.#items.set(key, String(value)); }
  removeItem(key) { this.#items.delete(key); }
}

function component(value, derivative = 0) {
  return { value, derivative, uncertainty: 0.05, confidence: 0.9, contributors: [] };
}

function premaq() {
  return {
    schema_version: '2.0.0',
    id: 'premaq-runtime',
    observed_at: '2026-08-02T04:37:00.000Z',
    registry_version: 'premaq-registry/2.0',
    state: {
      P: component(0.89, 0.01), C: component(0.92, 0.02), R: component(0.88, -0.01),
      E: component(0.34, 0.03), M: component(0.76, 0.01), A: component(0.85, 0.02),
      Q: component(0.84, 0.01),
    },
    receipt_id: 'receipt-runtime',
    sequence: 43,
    prior_state_ref: null,
    model_version: 'observer-test/1.0',
    provenance_refs: [],
  };
}

test('persists separate Hearthside and Targetside states plus the bridge packet', () => {
  const storage = new MemoryStorage();
  const runtime = createArcsweepBifrostRuntime({ storage });
  runtime.initialise(premaq(), { idFactory: () => 'initial' });
  runtime.evolve({ delta: 0.5, idFactory: () => 'evolved' });
  runtime.cycle({ focus: 'Q', idFactory: () => 'cycle' });

  assert.ok(storage.getItem(BIFROST_STATE_STORAGE_KEY));
  assert.equal(runtime.getHearthside().spiral.cycle, 0);
  assert.equal(runtime.getTargetside().spiral.cycle, 1);

  const bridge = runtime.bridge({
    premaq: premaq(),
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-transfer/0.1',
    anchors: {
      hearthside: 'current-reality://hearthside',
      targetside: 'terra-aeterna://hearthweave',
    },
    idFactory: () => 'bridge',
  });

  assert.equal(bridge.world_id, 'terra-aeterna');
  assert.notEqual(bridge.hearthside.state_id, bridge.targetside.state_id);
  assert.ok(storage.getItem(BIFROST_BRIDGE_STORAGE_KEY));

  const restored = createArcsweepBifrostRuntime({ storage });
  assert.equal(restored.getHearthside().spiral.cycle, 0);
  assert.equal(restored.getTargetside().spiral.cycle, 1);
  assert.equal(restored.getBridge().bridge_packet_id, bridge.bridge_packet_id);
});

test('clears both persisted shores without touching PREMAQ source data', () => {
  const storage = new MemoryStorage();
  const runtime = createArcsweepBifrostRuntime({ storage });
  const source = premaq();
  runtime.initialise(source);
  runtime.clear();

  assert.equal(runtime.getState(), null);
  assert.equal(runtime.getHearthside(), null);
  assert.equal(runtime.getTargetside(), null);
  assert.equal(runtime.getBridge(), null);
  assert.equal(storage.getItem(BIFROST_STATE_STORAGE_KEY), null);
  assert.equal(source.id, 'premaq-runtime');
});
