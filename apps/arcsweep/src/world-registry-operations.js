import { createWorld } from './worlds.js';

function invariant(condition, message) {
  if (!condition) throw new Error(`WORLD_REGISTRY: ${message}`);
}

function cloneState(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createWorldRegistryEntry(stateInput, {
  id,
  now = new Date().toISOString(),
  name = 'Untitled World',
} = {}) {
  invariant(stateInput && typeof stateInput === 'object', 'state is required');
  invariant(Array.isArray(stateInput.worlds), 'state.worlds must be an array');
  invariant(String(id || '').trim(), 'world id is required');
  invariant(!stateInput.worlds.some((world) => world?.id === id), `world id ${id} already exists`);

  const state = cloneState(stateInput);
  const world = createWorld(String(id).trim(), now);
  world.name = String(name || '').trim() || 'Untitled World';
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
  invariant(String(id || '').trim(), 'world id is required');

  const state = cloneState(stateInput);
  const world = state.worlds.find((item) => item?.id === id);
  invariant(world, `world ${id} was not found`);

  world.name = String(name || '').trim() || 'Untitled World';
  world.kind = String(kind || '').trim();
  world.description = String(description || '').trim();
  world.updatedAt = now;

  return { state, world };
}
