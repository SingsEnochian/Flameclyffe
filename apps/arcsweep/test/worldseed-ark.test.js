import assert from 'node:assert/strict';
import test from 'node:test';
import { compileWorldseed } from '../src/worldseed.js';
import { buildWorldseedArkManifest, WORLDSEED_ARK_SCHEMA } from '../src/worldseed-ark.js';

const world = { id: 'taaveren-vaen', name: "Ta'veren Vaen", kind: 'Living World' };

function seed(status = 'Export-ready') {
  return compileWorldseed(world, [
    {
      id: 'genome',
      worldId: world.id,
      title: 'Turning genome',
      seedType: 'Continuity Genome',
      status: 'Rooted',
      narrativeGait: 'Traditional long-form prose with restrained ornament.',
      sourceRefs: 'canon:age-of-restoration',
    },
    {
      id: 'lineage',
      worldId: world.id,
      title: 'Turning lineage',
      seedType: 'Fork / Lineage',
      status: 'Rooted',
      lineageRefs: 'wheel:later-turning',
    },
    {
      id: 'ark',
      worldId: world.id,
      title: 'Ark export',
      seedType: 'Ark Export',
      status,
    },
  ]);
}

test('builds the portable .worldseed archive skeleton', () => {
  const compiled = seed();
  const manifest = buildWorldseedArkManifest(compiled, {
    canonRefs: ['canon:age-of-restoration'],
    timelineRefs: ['timeline:turning-2000-years'],
    recordRefs: ['record:kestrelle-arrival'],
    runaRefs: ['runa:taaveren-vaen-hum'],
    worldmindRefs: ['worldmind:continuity-guardian'],
    provenanceRefs: ['receipt:seed-compile'],
    attachmentRefs: ['asset:map-westlands'],
    replayRefs: ['replay:seed-exact'],
  }, '2026-08-18T14:10:00.000Z');

  assert.equal(manifest.schema, WORLDSEED_ARK_SCHEMA);
  assert.equal(manifest.extension, '.worldseed');
  assert.equal(manifest.status, 'export-ready');
  assert.equal(manifest.worldseedFingerprint, compiled.fingerprint);
  assert.equal(manifest.paths.worldseed, 'worldseed.json');
  assert.equal(manifest.paths.replay, 'replay/');
  assert.equal(manifest.counts.canonRefs, 1);
  assert.deepEqual(manifest.reconstruction.lineageRefs, ['wheel:later-turning']);
});

test('marks the Ark manifest draft until an explicit Ark Export seed is export-ready', () => {
  const manifest = buildWorldseedArkManifest(seed('Rooted'));
  assert.equal(manifest.status, 'draft');
});

test('deduplicates archive references instead of multiplying copied lineage', () => {
  const manifest = buildWorldseedArkManifest(seed(), {
    canonRefs: ['canon:one', 'canon:one', 'canon:two'],
  });
  assert.deepEqual(manifest.included.canonRefs, ['canon:one', 'canon:two']);
  assert.equal(manifest.counts.canonRefs, 2);
});
