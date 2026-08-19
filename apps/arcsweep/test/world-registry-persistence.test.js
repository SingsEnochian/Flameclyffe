import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultState } from '../src/storage.js';
import {
  createWorldRegistryEntry,
  deleteWorldRegistryEntry,
  updateWorldRegistryEntry,
} from '../src/world-registry-operations.js';
import {
  createWorldRegistryJournal,
  reconcileWorldRegistry,
  recordWorldDeletion,
  recordWorldSnapshot,
} from '../src/world-registry-journal.js';

const T0 = '2026-08-19T20:00:00.000Z';
const T1 = '2026-08-19T20:01:00.000Z';
const T2 = '2026-08-19T20:02:00.000Z';
const T3 = '2026-08-19T20:03:00.000Z';

test('new world creation is pure and selects the created world', () => {
  const original = createDefaultState();
  const before = structuredClone(original);
  const { state, world } = createWorldRegistryEntry(original, { id: 'world-terra-prime', now: T1 });

  assert.deepEqual(original, before);
  assert.equal(world.id, 'world-terra-prime');
  assert.equal(state.activeWorldId, world.id);
  assert.equal(state.worlds[0].id, world.id);
});

test('journal restores a new world after a later stale state write drops it', () => {
  const stale = createDefaultState();
  const { state: withWorld, world } = createWorldRegistryEntry(stale, { id: 'world-terra-prime', now: T1 });
  const journal = recordWorldSnapshot(createWorldRegistryJournal(), world, T1);

  assert.ok(withWorld.worlds.some((item) => item.id === world.id));
  assert.ok(!stale.worlds.some((item) => item.id === world.id));

  const repaired = reconcileWorldRegistry(stale, journal);
  assert.equal(repaired.changed, true);
  assert.deepEqual(repaired.recovered, [world.id]);
  assert.ok(repaired.state.worlds.some((item) => item.id === world.id));
});

test('newer journal edit beats an older stale world snapshot', () => {
  const base = createDefaultState();
  const { state: created, world } = createWorldRegistryEntry(base, { id: 'world-terra-prime', now: T1 });
  const { state: edited, world: editedWorld } = updateWorldRegistryEntry(created, {
    id: world.id,
    name: 'Terra Prime',
    kind: 'Waking World',
    description: 'Current reality world registry anchor.',
    now: T2,
  });
  const journal = recordWorldSnapshot(createWorldRegistryJournal(), editedWorld, T2);

  const stale = structuredClone(created);
  const repaired = reconcileWorldRegistry(stale, journal);
  const recovered = repaired.state.worlds.find((item) => item.id === world.id);
  assert.equal(repaired.changed, true);
  assert.deepEqual(repaired.refreshed, [world.id]);
  assert.equal(recovered.name, 'Terra Prime');
  assert.equal(recovered.updatedAt, T2);
  assert.equal(edited.worlds.find((item) => item.id === world.id).name, 'Terra Prime');
});

test('deletion tombstone prevents an older stale snapshot from resurrecting a world', () => {
  const base = createDefaultState();
  const { state: created, world } = createWorldRegistryEntry(base, { id: 'world-terra-prime', now: T1 });
  let journal = recordWorldSnapshot(createWorldRegistryJournal(), world, T1);
  const { state: deleted } = deleteWorldRegistryEntry(created, { id: world.id, now: T2 });
  journal = recordWorldDeletion(journal, world.id, T2);

  assert.ok(!deleted.worlds.some((item) => item.id === world.id));

  const repaired = reconcileWorldRegistry(created, journal);
  assert.equal(repaired.changed, true);
  assert.deepEqual(repaired.removed, [world.id]);
  assert.ok(!repaired.state.worlds.some((item) => item.id === world.id));
});

test('a world explicitly recreated after a tombstone is not removed', () => {
  const base = createDefaultState();
  const { state: created, world } = createWorldRegistryEntry(base, { id: 'world-terra-prime', now: T1 });
  let journal = recordWorldSnapshot(createWorldRegistryJournal(), world, T1);
  journal = recordWorldDeletion(journal, world.id, T2);

  const recreated = structuredClone(created);
  const current = recreated.worlds.find((item) => item.id === world.id);
  current.name = 'Terra Prime Reborn';
  current.updatedAt = T3;

  const repaired = reconcileWorldRegistry(recreated, journal);
  assert.equal(repaired.changed, false);
  assert.equal(repaired.state.worlds.find((item) => item.id === world.id).name, 'Terra Prime Reborn');
});
