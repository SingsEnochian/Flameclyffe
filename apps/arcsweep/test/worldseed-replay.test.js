import assert from 'node:assert/strict';
import test from 'node:test';
import { compileWorldseed } from '../src/worldseed.js';
import { replayWorldseed, WORLDSEED_REPLAY_SCHEMA } from '../src/worldseed-replay.js';

const world = { id: 'luna', name: 'Luna', kind: 'Living World' };
const records = [
  {
    id: 'luna-genome',
    worldId: 'luna',
    title: 'Moonmere continuity genome',
    seedType: 'Continuity Genome',
    status: 'Rooted',
    emotionalLaws: 'Sovereignty and healing remain braided.',
    valuesCore: 'Consent, restoration, kinship, chosen law.',
    sourceRefs: 'canon:luna:moonmere-gate',
  },
  {
    id: 'luna-ark',
    worldId: 'luna',
    title: 'Ark contract',
    seedType: 'Ark Export',
    status: 'Export-ready',
    lineageRefs: 'root:luna',
  },
];

test('reconstructs a Worldseed and receipts an exact fingerprint match', () => {
  const compiled = compileWorldseed(world, records, '2026-08-18T14:00:00.000Z');
  const replay = replayWorldseed({
    world,
    seedhouseRecords: [...records].reverse(),
    expectedFingerprint: compiled.fingerprint,
    replayedAt: '2030-01-01T00:00:00.000Z',
  });

  assert.equal(replay.schema, WORLDSEED_REPLAY_SCHEMA);
  assert.equal(replay.matched, true);
  assert.equal(replay.result, 'exact-match');
  assert.equal(replay.reconstruction.seedhouseRecordCount, 2);
  assert.equal(replay.reconstruction.continuityGenomeDefined, true);
  assert.equal(replay.reconstruction.exportReady, true);
  assert.deepEqual(replay.reconstruction.sourceRefs, ['canon:luna:moonmere-gate']);
});

test('reports fingerprint mismatch instead of rewriting the expected seed', () => {
  const compiled = compileWorldseed(world, records);
  const changed = records.map((record) => record.id === 'luna-genome'
    ? { ...record, valuesCore: 'Consent, restoration, sovereignty, memory.' }
    : record);
  const replay = replayWorldseed({
    world,
    seedhouseRecords: changed,
    expectedFingerprint: compiled.fingerprint,
  });

  assert.equal(replay.matched, false);
  assert.equal(replay.result, 'fingerprint-mismatch');
  assert.equal(replay.expectedFingerprint, compiled.fingerprint);
  assert.notEqual(replay.actualFingerprint, compiled.fingerprint);
});
