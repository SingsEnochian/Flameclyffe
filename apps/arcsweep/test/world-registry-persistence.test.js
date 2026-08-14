import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultState, loadState, saveState } from '../src/storage.js';
import { createWorldRegistryEntry, updateWorldRegistryEntry } from '../src/world-registry-operations.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

function withStorage() {
  const storage = new MemoryStorage();
  globalThis.localStorage = storage;
  return storage;
}

function cleanup() {
  delete globalThis.localStorage;
}

test('new World Registry entry survives a full save and reload round trip', async () => {
  withStorage();
  try {
    const initial = createDefaultState();
    const originalIds = initial.worlds.map((world) => world.id);
    const created = createWorldRegistryEntry(initial, {
      id: 'world-test-flight',
      now: '2026-08-14T06:08:00.000Z',
    });

    assert.equal(created.world.name, 'Untitled World');
    assert.equal(created.state.activeWorldId, 'world-test-flight');
    assert.equal(created.state.worlds[0].id, 'world-test-flight');
    assert.deepEqual(initial.worlds.map((world) => world.id), originalIds);

    await saveState(created.state, { reason: 'test-new-world-round-trip' });
    const reloaded = await loadState();

    assert.equal(reloaded.activeWorldId, 'world-test-flight');
    assert.equal(reloaded.worlds[0].id, 'world-test-flight');
    assert.equal(reloaded.worlds[0].name, 'Untitled World');
  } finally {
    cleanup();
  }
});

test('World Registry save survives reload and preserves authored fields', async () => {
  withStorage();
  try {
    const initial = createDefaultState();
    const created = createWorldRegistryEntry(initial, {
      id: 'world-authored',
      now: '2026-08-14T06:09:00.000Z',
    });
    const updated = updateWorldRegistryEntry(created.state, {
      id: 'world-authored',
      name: 'Age of Restoration',
      kind: 'Turning',
      description: 'A living world registry persistence test.',
      now: '2026-08-14T06:10:00.000Z',
    });

    await saveState(updated.state, { reason: 'test-world-save-round-trip' });
    const reloaded = await loadState();
    const world = reloaded.worlds.find((item) => item.id === 'world-authored');

    assert.ok(world);
    assert.equal(world.name, 'Age of Restoration');
    assert.equal(world.kind, 'Turning');
    assert.equal(world.description, 'A living world registry persistence test.');
  } finally {
    cleanup();
  }
});
