'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const {
  copyAttachment,
  createStorePaths,
  readAttachmentPayload,
  resolveAttachment,
  writeAttachmentPayload,
} = require('../desktop/store.cjs');

test('binary Worldseed payloads round-trip through the desktop store with SHA-256 verification', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-worldseed-'));
  try {
    const paths = createStorePaths(root);
    const source = path.join(root, 'source.txt');
    await fsp.writeFile(source, 'Earth is a beginning.\n', 'utf8');
    const original = await copyAttachment(paths, source);
    const payload = await readAttachmentPayload(paths, original);
    assert.equal(payload.attachmentId, original.id);
    assert.equal(payload.sha256, original.sha256);
    assert.equal(Buffer.from(payload.base64, 'base64').toString('utf8'), 'Earth is a beginning.\n');

    const imported = await writeAttachmentPayload(paths, payload);
    assert.notEqual(imported.id, original.id);
    assert.equal(imported.importedFromAttachmentId, original.id);
    assert.equal(imported.sha256, original.sha256);
    const importedText = await fsp.readFile(resolveAttachment(paths, imported), 'utf8');
    assert.equal(importedText, 'Earth is a beginning.\n');
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
});

test('binary Worldseed import rejects a mismatched digest', async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-worldseed-bad-'));
  try {
    const paths = createStorePaths(root);
    await assert.rejects(() => writeAttachmentPayload(paths, {
      schema: 'arcsweep.worldseed-binary-entry/v1',
      attachmentId: 'old',
      name: 'bad.txt',
      extension: '.txt',
      size: 3,
      sha256: 'not-the-real-digest',
      base64: Buffer.from('abc').toString('base64'),
    }), /SHA-256 verification/i);
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
});
