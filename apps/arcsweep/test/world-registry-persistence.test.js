import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultState, normaliseState } from '../src/storage.js';
import {
  WORLD_BIRTH_RECEIPT_SCHEMA,
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

test('new world creation is pure, selects the created world, and receipts WORLD_BORN', () => {
  const original = createDefaultState();
  const before = structuredClone(original);
  const { state, world, receipt } = createWorldRegistryEntry(original, {
    id: 'world-terra-prime',
    name: 'Terra Prime',
    now: T1,
  });

  assert.deepEqual(original, before);
  assert.equal(world.id, 'world-terra-prime');
  assert.equal(world.name, 'Terra Prime');
  assert.equal(state.activeWorldId, world.id);
  assert.equal(state.worlds[0].id, world.id);
  assert.equal(receipt.schema, WORLD_BIRTH_RECEIPT_SCHEMA);
  assert.equal(receipt.event, 'WORLD_BORN');
  assert.equal(receipt.worldId, world.id);
  assert.equal(receipt.worldName, 'Terra Prime');
  assert.equal(receipt.bornAt, T1);
  assert.equal(receipt.source, 'world-registry');
  assert.equal(state.worldBirthReceipts[0].id, receipt.id);
});

test('legacy world migration preserves a recorded world creation time as birth evidence', () => {
  const state = normaliseState({
    worlds: [{ id: 'world-terra-prime', name: 'Terra Prime', kind: 'Waking World', createdAt: T0 }],
    activeWorldId: 'world-terra-prime',
  });
  const receipt = state.worldBirthReceipts.find((item) => item.worldId === 'world-terra-prime');
  assert.equal(receipt.schema, WORLD_BIRTH_RECEIPT_SCHEMA);
  assert.equal(receipt.event, 'WORLD_BORN');
  assert.equal(receipt.bornAt, T0);
  assert.equal(receipt.source, 'legacy-state-migration');
  assert.equal(receipt.sourceRef, 'state-normalise:recorded-world-createdAt');
});

test('legacy world migration keeps birth time unknown when the old state never recorded one', () => {
  const state = normaliseState({
    worlds: [{ id: 'world-terra-prime', name: 'Terra Prime', kind: 'Waking World' }],
    activeWorldId: 'world-terra-prime',
  });
  const receipt = state.worldBirthReceipts.find((item) => item.worldId === 'world-terra-prime');
  assert.equal(receipt.event, 'WORLD_BORN');
  assert.equal(receipt.bornAt, null);
  assert.equal(receipt.id, 'world-born:world-terra-prime:unknown');
  assert.equal(receipt.source, 'legacy-state-migration');
  assert.equal(receipt.sourceRef, 'state-normalise:birth-time-unknown');
});

test('legacy migration preserves an existing root birth receipt without duplication', () => {
  const originalReceipt = {
    schema: WORLD_BIRTH_RECEIPT_SCHEMA,
    version: 1,
    event: 'WORLD_BORN',
    id: 'world-born:world-terra-prime:origin',
    bornAt: T0,
    worldId: 'world-terra-prime',
    worldName: 'Terra Prime',
    worldKind: 'Waking World',
    parentWorldId: null,
    source: 'world-registry',
    sourceRef: 'registry:create',
    seedFingerprint: '',
  };
  const state = normaliseState({
    worlds: [{ id: 'world-terra-prime', name: 'Terra Prime', kind: 'Waking World', createdAt: T1 }],
    activeWorldId: 'world-terra-prime',
    worldBirthReceipts: [originalReceipt],
  });
  const receipts = state.worldBirthReceipts.filter((item) => item.worldId === 'world-terra-prime');
  assert.equal(receipts.length, 1);
  assert.deepEqual(receipts[0], originalReceipt);
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
