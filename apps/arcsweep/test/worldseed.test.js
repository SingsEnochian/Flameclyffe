import assert from 'node:assert/strict';
import test from 'node:test';
import { compileWorldseed, WORLDSEED_SCHEMA } from '../src/worldseed.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna', kind: 'Living World' };

const records = [
  {
    id: 'seed-constitution',
    worldId: world.id,
    title: 'Hearth before empire',
    seedType: 'World Constitution',
    status: 'Canonical',
    mustSurvive: 'Relationship and stewardship remain structural.',
    mayChange: 'Institutions and offices may change.',
    descendantsInherit: 'The hearth is a civic technology.',
    sourceRefs: 'canon:hearthweave',
    createdAt: '2026-08-18T13:45:00.000Z',
    updatedAt: '2026-08-18T13:45:00.000Z',
  },
  {
    id: 'seed-lineage',
    worldId: world.id,
    title: 'Age-turning fork',
    seedType: 'Fork / Lineage',
    status: 'Rooted',
    lineageRefs: 'parent:terra-aeterna@landing',
    transferableSeed: 'Branches preserve ancestry rather than overwriting it.',
  },
  {
    id: 'seed-ark',
    worldId: world.id,
    title: 'Ark package contract',
    seedType: 'Ark Export',
    status: 'Export-ready',
    mustSurvive: 'Canon provenance and continuity fingerprints.',
  },
  {
    id: 'other-world',
    worldId: 'not-terra',
    title: 'Foreign seed',
    seedType: 'Culture Seed',
    status: 'Canonical',
    mustSurvive: 'Should never enter this package.',
  },
];

test('compiles only the selected world into typed Worldseed sections', () => {
  const seed = compileWorldseed(world, records, '2026-08-18T13:45:00.000Z');
  assert.equal(seed.schema, WORLDSEED_SCHEMA);
  assert.equal(seed.world.id, world.id);
  assert.equal(seed.sections.constitution.length, 1);
  assert.equal(seed.sections.lineage.length, 1);
  assert.equal(seed.sections.ark.length, 1);
  assert.equal(seed.sections.culture.length, 0);
  assert.equal(seed.readiness.recordCount, 3);
  assert.equal(seed.readiness.rooted, true);
  assert.equal(seed.readiness.exportReady, true);
});

test('aggregates inheritance questions into the portable package', () => {
  const seed = compileWorldseed(world, records);
  assert.ok(seed.inheritance.mustSurvive.includes('Relationship and stewardship remain structural.'));
  assert.ok(seed.inheritance.mustSurvive.includes('Canon provenance and continuity fingerprints.'));
  assert.deepEqual(seed.inheritance.mayChange, ['Institutions and offices may change.']);
  assert.deepEqual(seed.inheritance.descendantsInherit, ['The hearth is a civic technology.']);
  assert.deepEqual(seed.inheritance.transferableSeeds, ['Branches preserve ancestry rather than overwriting it.']);
});

test('fingerprint is deterministic across generation time, record timestamps, and input ordering', () => {
  const first = compileWorldseed(world, records, '2026-08-18T13:45:00.000Z');
  const retimed = [...records].reverse().map((record) => record.id === 'seed-constitution'
    ? { ...record, createdAt: '2029-01-01T00:00:00.000Z', updatedAt: '2030-01-01T00:00:00.000Z' }
    : record);
  const second = compileWorldseed(world, retimed, '2030-01-01T00:00:00.000Z');
  assert.equal(first.fingerprint, second.fingerprint);
});

test('fingerprint changes when a worldseed invariant changes', () => {
  const first = compileWorldseed(world, records);
  const changed = records.map((record) => record.id === 'seed-constitution'
    ? { ...record, mustSurvive: 'Relationship, memory, and stewardship remain structural.' }
    : record);
  const second = compileWorldseed(world, changed);
  assert.notEqual(first.fingerprint, second.fingerprint);
});
