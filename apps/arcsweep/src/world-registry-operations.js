import { createWorld } from './worlds.js';

export const WORLD_BIRTH_RECEIPT_SCHEMA = 'arcsweep.world-birth-receipt/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`WORLD_REGISTRY: ${message}`);
}

function cloneState(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function text(value) {
  return String(value ?? '').trim();
}

export function recordWorldBirth(state, world, {
  bornAt = new Date().toISOString(),
  source = 'world-registry',
  sourceRef = '',
  seedFingerprint = '',
} = {}) {
  invariant(state && typeof state === 'object', 'state is required');
  invariant(world && typeof world === 'object', 'world is required');
  invariant(text(world.id), 'world id is required');

  state.worldBirthReceipts = Array.isArray(state.worldBirthReceipts) ? state.worldBirthReceipts : [];
  const existing = state.worldBirthReceipts.find((receipt) => (
    receipt?.event === 'WORLD_BORN' && receipt?.worldId === world.id
  ));
  if (existing) return existing;

  const receipt = {
    schema: WORLD_BIRTH_RECEIPT_SCHEMA,
    version: 1,
    event: 'WORLD_BORN',
    id: `world-born:${world.id}:${bornAt}`,
    bornAt,
    worldId: world.id,
    worldName: text(world.name) || world.id,
    worldKind: text(world.kind),
    parentWorldId: text(world.parentWorldId) || null,
    source: text(source) || 'world-registry',
    sourceRef: text(sourceRef),
    seedFingerprint: text(seedFingerprint) || text(world.worldseedFingerprint),
  };
  state.worldBirthReceipts.unshift(receipt);
  return receipt;
}

export function createWorldRegistryEntry(stateInput, {
  id,
  now = new Date().toISOString(),
  name = 'Untitled World',
} = {}) {
  invariant(stateInput && typeof stateInput === 'object', 'state is required');
  invariant(Array.isArray(stateInput.worlds), 'state.worlds must be an array');
  invariant(text(id), 'world id is required');
  invariant(!stateInput.worlds.some((world) => world?.id === id), `world id ${id} already exists`);

  const state = cloneState(stateInput);
  const world = createWorld(text(id), now);
  world.name = text(name) || 'Untitled World';
  world.createdAt = now;
  world.updatedAt = now;
  state.worlds.unshift(world);
  state.activeWorldId = world.id;
  const receipt = recordWorldBirth(state, world, {
    bornAt: now,
    source: 'world-registry',
    sourceRef: 'registry:create',
  });
  return { state, world, receipt };
}

export function updateWorldRegistryEntry(stateInput, {
  id,
  name,
  kind = '',
  description = '',
  now = new Date().toISOString(),
} = {}) {
  invariant(stateInput && typeof stateInput === 'object', 'state is required');
  invariant(Array.isArray(stateInput.worlds), 'state.worlds must be an array');
  invariant(text(id), 'world id is required');

  const state = cloneState(stateInput);
  const world = state.worlds.find((item) => item?.id === id);
  invariant(world, `world ${id} was not found`);
  world.name = text(name) || 'Untitled World';
  world.kind = text(kind);
  world.description = text(description);
  world.updatedAt = now;
  return { state, world };
}

export function deleteWorldRegistryEntry(stateInput, {
  id,
  now = new Date().toISOString(),
} = {}) {
  invariant(stateInput && typeof stateInput === 'object', 'state is required');
  invariant(Array.isArray(stateInput.worlds), 'state.worlds must be an array');
  invariant(text(id), 'world id is required');
  invariant(stateInput.worlds.length > 1, 'Arcsweep keeps one world portal in the registry');
  invariant(stateInput.worlds.some((world) => world?.id === id), `world ${id} was not found`);

  const state = cloneState(stateInput);
  const world = state.worlds.find((item) => item?.id === id);
  state.worlds = state.worlds.filter((item) => item?.id !== id);
  if (state.activeWorldId === id || !state.worlds.some((item) => item.id === state.activeWorldId)) {
    state.activeWorldId = state.worlds[0].id;
  }
  return { state, world, deletedAt: now };
}
