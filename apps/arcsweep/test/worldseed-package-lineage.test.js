import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorldseedPackage, importWorldseedPackage } from '../src/worldseed-package.js';

function source() {
  return {
    worlds: [{ id: 'terra', name: 'Terra Aeterna' }],
    activeWorldId: 'terra',
    scripts: [{ id: 'canon-1', worldId: 'terra', world: 'Terra Aeterna', status: 'Canon', name: 'Hearth law', content: 'Hearth before dominion.' }],
    records: {
      seedhouse: [{ id: 'seed-1', worldId: 'terra', title: 'Hearth law', seedType: 'Inheritance Rule', status: 'Rooted', mustSurvive: 'Hearth before dominion.', transferableSeed: 'Reciprocal arrival.' }],
      timeline: [],
      records: [],
    },
    canonCarryReceipts: [{ id: 'carry-1', worldId: 'terra' }],
    canonSeedReceipts: [{ id: 'root-1', worldId: 'terra' }],
    worldseedBraidReplayReceipts: [{ id: 'braid-1', worldId: 'terra', matched: true }],
    worldseedSeedLibrary: [{ id: 'library-1', sourceWorld: { id: 'terra', name: 'Terra Aeterna' }, sourceWorldseedFingerprint: 'ws-source', sourceSeedhouseRecordId: 'seed-1' }],
    worldseedPlantReceipts: [{ id: 'plant-1', sourceWorldId: 'terra', targetWorldId: 'other' }],
  };
}

function target() {
  return {
    worlds: [{ id: 'local', name: 'Local' }],
    activeWorldId: 'local',
    scripts: [],
    records: { seedhouse: [], timeline: [], records: [] },
  };
}

test('Ark carries braid receipts and published transferable seeds with the world', () => {
  const pkg = buildWorldseedPackage(source(), 'terra', '2030-01-01T00:00:00.000Z');
  assert.equal(pkg.content.canonCarryReceipts.length, 1);
  assert.equal(pkg.content.canonSeedReceipts.length, 1);
  assert.equal(pkg.content.braidReplayReceipts.length, 1);
  assert.equal(pkg.content.seedLibraryEntries.length, 1);
  assert.equal(pkg.content.plantReceipts.length, 1);
  assert.ok(pkg.manifest.included.provenanceRefs.includes('carry-1'));
});

test('exact Ark import restores the carried lineage collections', () => {
  const state = target();
  const pkg = buildWorldseedPackage(source(), 'terra');
  importWorldseedPackage(state, pkg, '2035-01-01T00:00:00.000Z');
  assert.equal(state.canonCarryReceipts[0].id, 'carry-1');
  assert.equal(state.canonSeedReceipts[0].id, 'root-1');
  assert.equal(state.worldseedBraidReplayReceipts[0].id, 'braid-1');
  assert.equal(state.worldseedSeedLibrary[0].id, 'library-1');
  assert.equal(state.worldseedPlantReceipts[0].id, 'plant-1');
});
