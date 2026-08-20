import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORLDSEED_PACKAGE_SCHEMA,
  buildWorldseedPackage,
  importWorldseedPackage,
  parseWorldseedPackage,
  serializeWorldseedPackage,
  verifyWorldseedPackage,
} from '../src/worldseed-package.js';
import { WORLD_BIRTH_RECEIPT_SCHEMA } from '../src/world-registry-operations.js';

function sourceState() {
  return {
    worlds: [{ id: 'earth', name: 'Earth', kind: 'Birth World', descendantWorldIds: [] }],
    activeWorldId: 'earth',
    scripts: [{ id: 'canon-earth', worldId: 'earth', world: 'Earth', status: 'Canon', name: 'Origin', content: 'Earth is a beginning.' }],
    records: {
      seedhouse: [
        {
          id: 'seed-earth-genome', worldId: 'earth', title: 'Birth-world genome', seedType: 'Continuity Genome', status: 'Rooted',
          valuesCore: 'Memory, craft, relationship.', emotionalLaws: 'Home can become plural.',
          mustSurvive: 'Earth as place of birth.', descendantsInherit: 'The memory of oceans and sky.',
        },
        { id: 'seed-earth-ark', worldId: 'earth', title: 'Ark', seedType: 'Ark Export', status: 'Export-ready' },
      ],
      timeline: [{ id: 'timeline-earth', worldId: 'earth', title: 'First hearth', date: 'Origin' }],
      records: [{ id: 'record-earth', worldId: 'earth', title: 'A record', attachments: [] }],
    },
    worldseedReplayReceipts: [],
    worldseedForkReceipts: [],
    worldseedComparisonReceipts: [],
  };
}

function emptyState() {
  return {
    worlds: [{ id: 'local', name: 'Local World', kind: 'World' }],
    activeWorldId: 'local',
    scripts: [],
    records: { seedhouse: [], timeline: [], records: [] },
  };
}

test('serializes a one-file .worldseed envelope that reconstructs exactly', () => {
  const pkg = buildWorldseedPackage(sourceState(), 'earth', '2030-01-01T00:00:00.000Z');
  assert.equal(pkg.schema, WORLDSEED_PACKAGE_SCHEMA);
  assert.equal(pkg.extension, '.worldseed');
  assert.equal(pkg.manifest.status, 'export-ready');
  assert.equal(pkg.content.canon.length, 1);
  assert.equal(pkg.content.timeline.length, 1);
  const text = serializeWorldseedPackage(pkg);
  const parsed = parseWorldseedPackage(text);
  const verification = verifyWorldseedPackage(parsed, '2040-01-01T00:00:00.000Z');
  assert.equal(verification.matched, true);
  assert.equal(verification.actualFingerprint, pkg.worldseed.fingerprint);
});

test('exact import restores world, Seedhouse, canon, timeline, room records, and synthesizes a legacy birth receipt', () => {
  const pkg = buildWorldseedPackage(sourceState(), 'earth');
  const target = emptyState();
  const result = importWorldseedPackage(target, pkg, '2035-05-05T05:05:05.000Z');
  assert.equal(result.verification.matched, true);
  assert.equal(target.activeWorldId, 'earth');
  assert.equal(target.worlds[0].worldseedFingerprint, pkg.worldseed.fingerprint);
  assert.equal(target.records.seedhouse.filter((record) => record.worldId === 'earth').length, 2);
  assert.equal(target.records.timeline.some((record) => record.id === 'timeline-earth'), true);
  assert.equal(target.records.records.some((record) => record.id === 'record-earth'), true);
  assert.equal(target.scripts.some((script) => script.id === 'canon-earth'), true);
  assert.equal(target.worldseedImportReceipts[0].fingerprint, pkg.worldseed.fingerprint);
  assert.equal(result.worldBirthReceipt.schema, WORLD_BIRTH_RECEIPT_SCHEMA);
  assert.equal(result.worldBirthReceipt.event, 'WORLD_BORN');
  assert.equal(result.worldBirthReceipt.worldId, 'earth');
  assert.equal(result.worldBirthReceipt.source, 'worldseed-import');
  assert.equal(result.worldBirthReceipt.seedFingerprint, pkg.worldseed.fingerprint);
  assert.equal(target.worldseedImportReceipts[0].worldBirthReceiptId, result.worldBirthReceipt.id);
});

test('package carries an existing root birth receipt without rebirthing the world', () => {
  const source = sourceState();
  source.worldBirthReceipts = [{
    schema: WORLD_BIRTH_RECEIPT_SCHEMA,
    version: 1,
    event: 'WORLD_BORN',
    id: 'world-born:earth:origin',
    bornAt: '2020-01-01T00:00:00.000Z',
    worldId: 'earth',
    worldName: 'Earth',
    worldKind: 'Birth World',
    parentWorldId: null,
    source: 'world-registry',
    sourceRef: 'registry:create',
    seedFingerprint: '',
  }];
  const pkg = buildWorldseedPackage(source, 'earth', '2030-01-01T00:00:00.000Z');
  assert.equal(pkg.content.birthReceipts.length, 1);
  assert.equal(pkg.content.birthReceipts[0].id, 'world-born:earth:origin');
  assert.ok(pkg.manifest.refs.provenance.includes('world-born:earth:origin'));

  const target = emptyState();
  const result = importWorldseedPackage(target, pkg, '2035-05-05T05:05:05.000Z');
  assert.equal(result.worldBirthReceipt.id, 'world-born:earth:origin');
  assert.equal(result.worldBirthReceipt.bornAt, '2020-01-01T00:00:00.000Z');
  assert.equal(target.worldBirthReceipts.length, 1);
  assert.equal(target.worldseedImportReceipts[0].worldBirthReceiptId, 'world-born:earth:origin');
});

test('exact import refuses to overwrite a world with the same id', () => {
  const pkg = buildWorldseedPackage(sourceState(), 'earth');
  assert.throws(() => importWorldseedPackage(sourceState(), pkg), /already exists/i);
});

test('tampered package fails verification and import', () => {
  const pkg = buildWorldseedPackage(sourceState(), 'earth');
  pkg.seedhouseRecords[0].valuesCore = 'Tampered after export.';
  const verification = verifyWorldseedPackage(pkg);
  assert.equal(verification.matched, false);
  assert.throws(() => importWorldseedPackage(emptyState(), pkg), /fingerprint/i);
});
