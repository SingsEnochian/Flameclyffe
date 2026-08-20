import assert from 'node:assert/strict';
import test from 'node:test';
import {
  plantSeedFromLibrary,
  publishSeedToLibrary,
  seedLibrarySnapshot,
} from '../src/worldseed-seed-library.js';

function fixture() {
  return {
    worlds: [
      { id: 'terra', name: 'Terra Aeterna' },
      { id: 'luna', name: 'Luna' },
    ],
    activeWorldId: 'terra',
    records: {
      seedhouse: [{
        id: 'terra-hearth',
        worldId: 'terra',
        title: 'Hearth before dominion',
        seedType: 'World Constitution',
        status: 'Rooted',
        mustSurvive: 'Arrival is relationship, not conquest.',
        descendantsInherit: 'The hearth precedes dominion.',
        transferableSeed: 'Build arrival law around reciprocity.',
        sourceRefs: 'canon-studio:arrival',
      }],
    },
    scripts: [],
  };
}

test('publishes an explicit transferable seed with source fingerprint and lineage', () => {
  const state = fixture();
  const entry = publishSeedToLibrary(state, {
    sourceWorldId: 'terra', seedhouseRecordId: 'terra-hearth', publishedAt: '2026-08-18T19:40:00.000Z',
  });
  assert.equal(entry.sourceWorld.id, 'terra');
  assert.match(entry.sourceWorldseedFingerprint, /^ws-/);
  assert.equal(entry.carried.transferableSeed, 'Build arrival law around reciprocity.');
  assert.equal(state.worldseedSeedLibrary.length, 1);
});

test('plants a seed into another world as germinating inheritance without overwriting the target', () => {
  const state = fixture();
  const lunaBefore = structuredClone(state.worlds.find((world) => world.id === 'luna'));
  const entry = publishSeedToLibrary(state, {
    sourceWorldId: 'terra', seedhouseRecordId: 'terra-hearth', publishedAt: '2026-08-18T19:40:00.000Z',
  });
  const result = plantSeedFromLibrary(state, {
    librarySeedId: entry.id, targetWorldId: 'luna', plantedAt: '2026-08-18T19:41:00.000Z',
  });
  assert.equal(result.record.worldId, 'luna');
  assert.equal(result.record.status, 'Germinating');
  assert.equal(result.record.inheritedFromWorldId, 'terra');
  assert.equal(result.record.inheritedFromWorldseedFingerprint, entry.sourceWorldseedFingerprint);
  assert.match(result.record.lineageRefs, /carried-from:terra:/);
  assert.deepEqual(state.worlds.find((world) => world.id === 'luna'), lunaBefore);
});

test('shows what a world can publish and what it can plant from elsewhere', () => {
  const state = fixture();
  publishSeedToLibrary(state, {
    sourceWorldId: 'terra', seedhouseRecordId: 'terra-hearth', publishedAt: '2026-08-18T19:40:00.000Z',
  });
  const terra = seedLibrarySnapshot(state, 'terra');
  const luna = seedLibrarySnapshot(state, 'luna');
  assert.equal(terra.candidates[0].published, true);
  assert.equal(luna.availableToPlant.length, 1);
  assert.equal(luna.availableToPlant[0].sourceWorld.name, 'Terra Aeterna');
});
