import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileWorldseedForState,
  forkWorldInState,
  receiptPossibleWorldsComparison,
  receiptWorldseedReplay,
  worldseedLiveSnapshot,
} from '../src/worldseed-live-state.js';
import { WORLD_BIRTH_RECEIPT_SCHEMA } from '../src/world-registry-operations.js';

function fixture() {
  return {
    worlds: [{
      id: 'earth',
      name: 'Earth',
      kind: 'Birth World',
      parentWorldId: null,
      parentSeedFingerprint: '',
      branchPoint: '',
      lineageLabel: 'root',
      worldseedFingerprint: '',
      descendantWorldIds: [],
      forkReason: '',
      worldseedInheritance: {},
    }],
    activeWorldId: 'earth',
    records: {
      seedhouse: [
        {
          id: 'earth-genome', worldId: 'earth', title: 'Birth-world genome', seedType: 'Continuity Genome', status: 'Rooted',
          emotionalLaws: 'Relationship remains structural.', valuesCore: 'Memory, craft, reciprocity.',
          mustSurvive: 'The memory of oceans and sky.', descendantsInherit: 'Earth as place of birth.',
        },
        {
          id: 'earth-ark', worldId: 'earth', title: 'Ark', seedType: 'Ark Export', status: 'Export-ready',
        },
      ],
    },
  };
}

test('compiles the live state and reports genome and lineage coverage', () => {
  const state = fixture();
  const snapshot = worldseedLiveSnapshot(state, 'earth');
  assert.equal(snapshot.seed.world.id, 'earth');
  assert.equal(snapshot.seed.readiness.exportReady, true);
  assert.deepEqual(snapshot.lineagePath, ['earth']);
  assert.ok(snapshot.genomeCoverage.defined.includes('emotionalLaws'));
  assert.equal(snapshot.sectionCounts.continuityGenome, 1);
});

test('forks a descendant into persistent state, links the parent, inherits Seedhouse baseline, and receipts its birth', () => {
  const state = fixture();
  const parentBefore = structuredClone(state.worlds[0]);
  const result = forkWorldInState(state, {
    worldId: 'earth', childId: 'moon', childName: 'Moon Hearth', mode: 'descendant', branchPoint: 'First permanent lunar hearth', reason: 'Carry civilisation beyond one world', createdAt: '2030-01-01T00:00:00.000Z',
  });
  assert.equal(result.child.parentWorldId, 'earth');
  assert.equal(result.child.parentSeedFingerprint, result.seed.fingerprint);
  assert.ok(result.child.worldseedInheritance.mustSurvive.includes('The memory of oceans and sky.'));
  assert.deepEqual(state.worlds.find((world) => world.id === 'earth').descendantWorldIds, ['moon']);
  assert.equal(state.activeWorldId, 'moon');
  assert.equal(state.worldseedForkReceipts[0].childWorldId, 'moon');
  assert.equal(result.worldBirthReceipt.schema, WORLD_BIRTH_RECEIPT_SCHEMA);
  assert.equal(result.worldBirthReceipt.event, 'WORLD_BORN');
  assert.equal(result.worldBirthReceipt.worldId, 'moon');
  assert.equal(result.worldBirthReceipt.source, 'worldseed-fork');
  assert.equal(result.worldBirthReceipt.sourceRef, result.receipt.id);
  assert.equal(result.worldBirthReceipt.seedFingerprint, result.seed.fingerprint);
  assert.equal(state.worldBirthReceipts[0].id, result.worldBirthReceipt.id);
  assert.equal(result.inheritedSeedhouseRecords.length, 2);
  assert.ok(result.inheritedSeedhouseRecords.every((record) => record.worldId === 'moon'));
  assert.ok(result.inheritedSeedhouseRecords.some((record) => record.inheritedFromSeedhouseRecordId === 'earth-genome'));
  const childSeed = compileWorldseedForState(state, 'moon');
  assert.equal(childSeed.readiness.recordCount, 2);
  assert.equal(childSeed.readiness.continuityGenomeDefined, true);
  assert.ok(childSeed.provenance.lineageRefs.some((ref) => ref.includes('inherited-from:earth:earth-genome')));
  assert.equal(parentBefore.name, state.worlds.find((world) => world.id === 'earth').name);
});

test('replay receipts persist without rewriting a changed expected fingerprint', () => {
  const state = fixture();
  const compiled = compileWorldseedForState(state, 'earth');
  const replay = receiptWorldseedReplay(state, 'earth', compiled.fingerprint, '2031-01-01T00:00:00.000Z');
  assert.equal(replay.matched, true);
  assert.equal(state.worldseedReplayReceipts.length, 1);
  state.records.seedhouse[0].valuesCore = 'Memory, craft, reciprocity, plural homes.';
  const mismatch = receiptWorldseedReplay(state, 'earth', compiled.fingerprint, '2032-01-01T00:00:00.000Z');
  assert.equal(mismatch.matched, false);
  assert.equal(state.worldseedReplayReceipts[0].result, 'fingerprint-mismatch');
});

test('Possible Worlds comparison becomes a persistent receipt without changing either branch', () => {
  const state = fixture();
  forkWorldInState(state, {
    worldId: 'earth', childId: 'moon', childName: 'Moon Hearth', mode: 'descendant', createdAt: '2030-01-01T00:00:00.000Z',
  });
  const moonGenome = state.records.seedhouse.find((record) => record.worldId === 'moon' && record.seedType === 'Continuity Genome');
  moonGenome.valuesCore = 'Memory, craft, reciprocity, plural homes.';
  const earthBefore = structuredClone(state.worlds.find((world) => world.id === 'earth'));
  const moonBefore = structuredClone(state.worlds.find((world) => world.id === 'moon'));
  const receipt = receiptPossibleWorldsComparison(state, 'earth', 'moon', '2031-02-03T04:05:06.000Z');
  assert.equal(receipt.schema, 'arcsweep.possible-worlds-comparison-receipt/v1');
  assert.equal(receipt.sameFingerprint, false);
  assert.ok(receipt.changedGenomeFields.includes('valuesCore'));
  assert.equal(state.worldseedComparisonReceipts[0].id, receipt.id);
  assert.deepEqual(state.worlds.find((world) => world.id === 'earth'), earthBefore);
  assert.deepEqual(state.worlds.find((world) => world.id === 'moon'), moonBefore);
});
