export const WORLD_REGISTRY_JOURNAL_SCHEMA = 'arcsweep.world-registry-journal/v1';
export const WORLD_REGISTRY_JOURNAL_KEY = 'hearthgate.arcsweep.world-registry-journal.v1';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function asTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function worldTime(world) {
  return Math.max(asTime(world?.updatedAt), asTime(world?.createdAt));
}

export function createWorldRegistryJournal() {
  return {
    schema: WORLD_REGISTRY_JOURNAL_SCHEMA,
    version: 1,
    entries: {},
    updatedAt: null,
  };
}

export function normaliseWorldRegistryJournal(value) {
  const journal = createWorldRegistryJournal();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return journal;
  const entries = value.entries && typeof value.entries === 'object' && !Array.isArray(value.entries)
    ? value.entries
    : {};
  for (const [id, entry] of Object.entries(entries)) {
    if (!id || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    journal.entries[id] = {
      id,
      world: entry.world && typeof entry.world === 'object' && !Array.isArray(entry.world) ? clone(entry.world) : null,
      writtenAt: typeof entry.writtenAt === 'string' ? entry.writtenAt : null,
      deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : null,
    };
  }
  journal.updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
  return journal;
}

export function recordWorldSnapshot(journalInput, world, now = new Date().toISOString()) {
  if (!world?.id) throw new Error('WORLD_REGISTRY_JOURNAL: world id is required');
  const journal = normaliseWorldRegistryJournal(journalInput);
  journal.entries[world.id] = {
    id: world.id,
    world: clone(world),
    writtenAt: now,
    deletedAt: null,
  };
  journal.updatedAt = now;
  return journal;
}

export function recordWorldDeletion(journalInput, worldId, now = new Date().toISOString()) {
  if (!worldId) throw new Error('WORLD_REGISTRY_JOURNAL: world id is required');
  const journal = normaliseWorldRegistryJournal(journalInput);
  const previous = journal.entries[worldId];
  journal.entries[worldId] = {
    id: worldId,
    world: previous?.world ? clone(previous.world) : null,
    writtenAt: previous?.writtenAt || null,
    deletedAt: now,
  };
  journal.updatedAt = now;
  return journal;
}

export function reconcileWorldRegistry(stateInput, journalInput) {
  const state = clone(stateInput);
  const journal = normaliseWorldRegistryJournal(journalInput);
  if (!Array.isArray(state.worlds)) state.worlds = [];
  let changed = false;
  const recovered = [];
  const removed = [];
  const refreshed = [];

  for (const [id, entry] of Object.entries(journal.entries)) {
    const index = state.worlds.findIndex((world) => world?.id === id);
    const current = index >= 0 ? state.worlds[index] : null;
    const deletionTime = asTime(entry.deletedAt);

    if (deletionTime) {
      if (current && worldTime(current) <= deletionTime) {
        state.worlds.splice(index, 1);
        changed = true;
        removed.push(id);
      }
      continue;
    }

    if (!entry.world) continue;
    if (!current) {
      state.worlds.unshift(clone(entry.world));
      changed = true;
      recovered.push(id);
      continue;
    }

    if (worldTime(entry.world) > worldTime(current)) {
      state.worlds[index] = clone(entry.world);
      changed = true;
      refreshed.push(id);
    }
  }

  if (!state.worlds.length) {
    const survivor = Object.values(journal.entries)
      .filter((entry) => entry.world && !entry.deletedAt)
      .sort((a, b) => worldTime(b.world) - worldTime(a.world))[0]?.world;
    if (survivor) {
      state.worlds = [clone(survivor)];
      changed = true;
      recovered.push(survivor.id);
    }
  }

  if (state.worlds.length && !state.worlds.some((world) => world.id === state.activeWorldId)) {
    state.activeWorldId = state.worlds[0].id;
    changed = true;
  }

  return { state, journal, changed, recovered, removed, refreshed };
}
