import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileWorldseedForState,
  forkWorldInState,
  receiptWorldseedReplay,
  worldseedLiveSnapshot,
} from '../src/worldseed-live-state.js';

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

test('forks a descendant into persistent state and links the parent', () => {
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
