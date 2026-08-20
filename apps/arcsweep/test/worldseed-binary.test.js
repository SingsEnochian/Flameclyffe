import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORLDSEED_BINARY_ENTRY_SCHEMA,
  binaryArkStatus,
  collectWorldseedPackageAttachments,
  embedWorldseedBinaryPayloads,
  remapWorldseedPackageAttachments,
} from '../src/worldseed-binary.js';

function fixture() {
  return {
    schema: 'arcsweep.worldseed-package/v1',
    manifest: {},
    seedhouseRecords: [{
      id: 'seed-1',
      attachments: [{ id: 'asset-map', name: 'map.png', sha256: 'abc', relativePath: 'ingest/map.png' }],
    }],
    content: {
      canon: [],
      timeline: [],
      rooms: {
        places: [{
          id: 'place-1',
          attachments: [
            { id: 'asset-map', name: 'map.png', sha256: 'abc', relativePath: 'ingest/map.png' },
            { id: 'asset-song', name: 'hum.wav', sha256: 'def', relativePath: 'ingest/hum.wav' },
          ],
        }],
      },
    },
  };
}

test('collects each referenced attachment once across the Ark', () => {
  const attachments = collectWorldseedPackageAttachments(fixture());
  assert.deepEqual(attachments.map((item) => item.id), ['asset-map', 'asset-song']);
});

test('embeds payloads and records a complete binary manifest', () => {
  const pkg = embedWorldseedBinaryPayloads(fixture(), [
    { schema: WORLDSEED_BINARY_ENTRY_SCHEMA, attachmentId: 'asset-map', name: 'map.png', size: 3, sha256: 'abc', base64: 'YWJj' },
    { schema: WORLDSEED_BINARY_ENTRY_SCHEMA, attachmentId: 'asset-song', name: 'hum.wav', size: 3, sha256: 'def', base64: 'ZGVm' },
  ], '2026-08-18T19:30:00.000Z');
  const status = binaryArkStatus(pkg);
  assert.equal(status.complete, true);
  assert.equal(status.embeddedCount, 2);
  assert.equal(pkg.manifest.binary.mode, 'embedded');
});

test('remaps imported attachment receipts without changing unrelated world records', () => {
  const pkg = fixture();
  const remapped = remapWorldseedPackageAttachments(pkg, [
    { id: 'new-map', importedFromAttachmentId: 'asset-map', name: 'map.png', sha256: 'abc', relativePath: 'ingest/new-map.png' },
    { id: 'new-song', importedFromAttachmentId: 'asset-song', name: 'hum.wav', sha256: 'def', relativePath: 'ingest/new-song.wav' },
  ]);
  assert.equal(remapped.seedhouseRecords[0].attachments[0].id, 'new-map');
  assert.equal(remapped.content.rooms.places[0].attachments[1].id, 'new-song');
  assert.equal(pkg.seedhouseRecords[0].attachments[0].id, 'asset-map');
});
