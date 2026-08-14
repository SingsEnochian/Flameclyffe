import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultState,
  importState,
  normaliseState,
  saveState,
} from '../src/storage.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const PRIMARY_KEY = 'hearthgate.arcsweep.local.v0.1';
const REGISTRY_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
const HELM_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';

function withStorage() {
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  return storage;
}

function cleanupStorage() {
  delete globalThis.localStorage;
}

test('default and normalised Arcsweep state carry versioned React-ion and Glyph Continuity persistence slots', () => {
  const state = createDefaultState();
  assert.equal(state.reaction.registry.version, 1);
  assert.deepEqual(state.reaction.registry.destinations, []);
  assert.deepEqual(state.reaction.registry.corridors, []);
  assert.equal(state.reaction.helm.version, 1);
  assert.deepEqual(state.reaction.helm.receipts, []);
  assert.equal(state.glyphContinuity.schema, 'glyph.continuity-ledger/v1');
  assert.equal(state.glyphContinuity.version, 1);
  assert.deepEqual(state.glyphContinuity.heartbeats, []);
  assert.deepEqual(state.glyphContinuity.blindPairs, []);

  state.reaction.registry.destinations.push({ registration_id: 'dest-1' });
  state.reaction.helm.receipts.push({ schema: 'reaction.helm-receipt/v1', world_id: state.worlds[0].id });
  state.glyphContinuity.heartbeats.push({ schema: 'glyph.continuity-entry/v1', world_id: state.worlds[0].id });
  state.glyphContinuity.blindPairs.push({ schema: 'glyph.blind-pair/v1', world_id: state.worlds[0].id });
  const normalised = normaliseState(state);
  assert.equal(normalised.reaction.registry.destinations[0].registration_id, 'dest-1');
  assert.equal(normalised.reaction.helm.receipts.length, 1);
  assert.equal(normalised.glyphContinuity.heartbeats.length, 1);
  assert.equal(normalised.glyphContinuity.blindPairs.length, 1);
});

test('saveState merges current registry and Helm sidecar stores into the primary snapshot and preserves Glyph Continuity', async () => {
  const storage = withStorage();
  try {
    const state = createDefaultState();
    storage.setItem(REGISTRY_KEY, JSON.stringify({
      version: 1,
      destinations: [{ registration_id: 'dest-live', state: 'approved' }],
      corridors: [{ corridor_id: 'corridor-live', state: 'approved' }],
    }));
    storage.setItem(HELM_KEY, JSON.stringify({
      version: 1,
      receipts: [{ schema: 'reaction.helm-receipt/v1', world_id: state.worlds[0].id }],
    }));
    state.glyphContinuity.heartbeats.push({
      schema: 'glyph.continuity-entry/v1',
      world_id: state.worlds[0].id,
      heartbeat: { heartbeat_id: 'glyph-heartbeat-live' },
    });

    await saveState(state, { reason: 'test-reaction-merge' });
    const saved = JSON.parse(storage.getItem(PRIMARY_KEY));
    assert.equal(saved.reaction.registry.destinations[0].registration_id, 'dest-live');
    assert.equal(saved.reaction.registry.corridors[0].corridor_id, 'corridor-live');
    assert.equal(saved.reaction.helm.receipts.length, 1);
    assert.equal(saved.glyphContinuity.heartbeats[0].heartbeat.heartbeat_id, 'glyph-heartbeat-live');
  } finally {
    cleanupStorage();
  }
});

test('importing Arcsweep state seeds the sidecar stores from the imported React-ion ledger and retains Glyph Continuity', async () => {
  const storage = withStorage();
  try {
    const state = createDefaultState();
    state.reaction.registry.destinations = [{ registration_id: 'dest-imported', state: 'approved' }];
    state.reaction.registry.corridors = [{ corridor_id: 'corridor-imported', state: 'approved' }];
    state.reaction.helm.receipts = [{ schema: 'reaction.helm-receipt/v1', world_id: state.worlds[0].id }];
    state.glyphContinuity.blindPairs = [{
      schema: 'glyph.blind-pair/v1',
      pair_id: 'pair-imported',
      world_id: state.worlds[0].id,
    }];
    const file = { text: async () => JSON.stringify(state) };

    const imported = await importState(file);
    const registry = JSON.parse(storage.getItem(REGISTRY_KEY));
    const helm = JSON.parse(storage.getItem(HELM_KEY));
    assert.equal(imported.reaction.registry.destinations[0].registration_id, 'dest-imported');
    assert.equal(registry.destinations[0].registration_id, 'dest-imported');
    assert.equal(registry.corridors[0].corridor_id, 'corridor-imported');
    assert.equal(helm.receipts.length, 1);
    assert.equal(imported.glyphContinuity.blindPairs[0].pair_id, 'pair-imported');
  } finally {
    cleanupStorage();
  }
});
