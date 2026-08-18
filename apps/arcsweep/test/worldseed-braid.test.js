import assert from 'node:assert/strict';
import test from 'node:test';
import {
  carryRecordToCanon,
  receiptWorldseedBraidReplay,
  rootCanonInSeedhouse,
  worldseedBraidSnapshot,
} from '../src/worldseed-braid.js';

function fixture() {
  return {
    worlds: [{ id: 'terra', name: 'Terra Aeterna', worldseedFingerprint: '' }],
    activeWorldId: 'terra',
    scripts: [],
    records: {
      records: [{
        id: 'record-arrival',
        worldId: 'terra',
        title: 'Arrival scene',
        content: 'The first hearth was lit beneath three moons.',
        canonCarry: 'Requested for review',
        canonExcerpt: 'The first hearth was lit beneath three moons.',
      }],
      seedhouse: [],
    },
  };
}

test('carries an explicit record excerpt into Canon Studio without erasing the source record', () => {
  const state = fixture();
  const result = carryRecordToCanon(state, {
    worldId: 'terra',
    recordId: 'record-arrival',
    authority: 'Steward committed',
    committedAt: '2026-08-18T19:20:00.000Z',
  });
  assert.equal(result.canon.status, 'Canon');
  assert.equal(result.canon.sourceRecordId, 'record-arrival');
  assert.equal(state.records.records[0].canonCarry, 'Carried excerpt to canon');
  assert.equal(state.records.records[0].content, 'The first hearth was lit beneath three moons.');
  assert.equal(state.canonCarryReceipts.length, 1);
});

test('roots committed Canon Studio material into Seedhouse with explicit provenance', () => {
  const state = fixture();
  const { canon } = carryRecordToCanon(state, {
    worldId: 'terra', recordId: 'record-arrival', committedAt: '2026-08-18T19:20:00.000Z',
  });
  const result = rootCanonInSeedhouse(state, {
    worldId: 'terra', canonId: canon.id, seedType: 'World Constitution',
    descendantsInherit: 'Hearth before dominion.', rootedAt: '2026-08-18T19:21:00.000Z',
  });
  assert.equal(result.seed.status, 'Rooted');
  assert.equal(result.seed.rootedFromCanonId, canon.id);
  assert.match(result.seed.sourceRefs, /canon-studio:/);
  assert.equal(state.canonSeedReceipts.length, 1);
});

test('Replay proves the braid and reports later divergence instead of rewriting history', () => {
  const state = fixture();
  const { canon } = carryRecordToCanon(state, {
    worldId: 'terra', recordId: 'record-arrival', committedAt: '2026-08-18T19:20:00.000Z',
  });
  rootCanonInSeedhouse(state, {
    worldId: 'terra', canonId: canon.id, rootedAt: '2026-08-18T19:21:00.000Z',
  });
  const first = receiptWorldseedBraidReplay(state, 'terra', '2026-08-18T19:22:00.000Z');
  assert.equal(first.replay.matched, true);
  state.records.seedhouse[0].mustSurvive = 'The first hearth and the memory of the sea.';
  const second = receiptWorldseedBraidReplay(state, 'terra', '2026-08-18T19:23:00.000Z');
  assert.equal(second.replay.matched, false);
  assert.equal(second.braidReceipt.result, 'fingerprint-mismatch');
  const snapshot = worldseedBraidSnapshot(state, 'terra');
  assert.deepEqual(snapshot.path, ['Records Room', 'Canon Studio', 'Seedhouse', 'Replay']);
  assert.equal(snapshot.stages.canonStudio.count, 1);
  assert.equal(snapshot.stages.seedhouse.count, 1);
});
