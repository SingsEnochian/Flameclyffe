import assert from 'node:assert/strict';
import test from 'node:test';
import { compileNavigationRequest, chooseProjectionRoute } from '../src/react-ion-engine.js';
import { compileReactionRegistry } from '../src/react-ion-registry.js';
import {
  REACTION_REGISTRY_STORAGE_KEY,
  createFirstFlightAtlasStore,
  isVirginReactionRegistry,
  seedFirstFlightAtlasStorage,
} from '../src/react-ion-first-flight-atlas.js';

function memoryStorage(initial = null) {
  const entries = new Map();
  if (initial != null) entries.set(REACTION_REGISTRY_STORAGE_KEY, JSON.stringify(initial));
  return {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { entries.set(key, String(value)); },
  };
}

test('First Flight Atlas seeds a virgin browser registry with three approved destinations', () => {
  const storage = memoryStorage();
  const result = seedFirstFlightAtlasStorage(storage);
  assert.equal(result.seeded, true);
  assert.equal(result.store.destinations.length, 3);
  assert.equal(result.store.corridors.length, 3);
  const persisted = JSON.parse(storage.getItem(REACTION_REGISTRY_STORAGE_KEY));
  assert.equal(persisted.destinations.every((item) => item.state === 'approved'), true);
});

test('First Flight Atlas never overwrites a non-virgin operator registry', () => {
  const existing = { schema: 'reaction.destination-registry-store/v1', version: 1, destinations: [{ state: 'draft', registration_id: 'mine' }], corridors: [] };
  const storage = memoryStorage(existing);
  const result = seedFirstFlightAtlasStorage(storage);
  assert.equal(result.seeded, false);
  assert.equal(JSON.parse(storage.getItem(REACTION_REGISTRY_STORAGE_KEY)).destinations[0].registration_id, 'mine');
  assert.equal(isVirginReactionRegistry(existing), false);
});

test('First Flight Atlas compiles the intended vetoed direct path and admitted Starsong route', async () => {
  const runtime = compileReactionRegistry(createFirstFlightAtlasStore());
  assert.equal(runtime.destinations.length, 3);
  assert.equal(runtime.corridors.length, 5);
  const source = runtime.registry.resolve('waking.home').endpoint.address_text;
  const target = runtime.registry.resolve('templehouse.hearthweave.terra').endpoint.address_text;
  const bridge = runtime.registry.resolve('bridge.starsong').endpoint.address_text;
  const direct = runtime.graph[source].find((edge) => edge.to === target);
  assert.equal(direct.blocked, true);

  const request = await compileNavigationRequest({
    source,
    target,
    intention: 'First operator flight should use the admitted atlas.',
    requestedAt: '2026-08-13T06:00:00.000Z',
  });
  const route = await chooseProjectionRoute({ request, graph: runtime.graph });
  assert.deepEqual(route.path, [source, bridge, target]);
});
