import { createWorld } from './worlds.js';

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
  return { state, world };
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
