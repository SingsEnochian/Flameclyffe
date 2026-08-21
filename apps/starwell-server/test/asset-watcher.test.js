'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  ASSET_WATCH_EVENT_SCHEMA,
  metadataForPath,
  relativeAlias,
} = require('../electron/asset-watcher');

test('asset watcher emits metadata-only relative aliases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hearthgate-watch-'));
  try {
    const nested = path.join(root, 'images');
    fs.mkdirSync(nested);
    const file = path.join(nested, 'sigil.png');
    fs.writeFileSync(file, 'not-secret-test-bytes');
    const receipt = metadataForPath(root, file, 'change', '2026-08-21T01:50:00-04:00');
    assert.equal(receipt.schema, ASSET_WATCH_EVENT_SCHEMA);
    assert.equal(receipt.relative_path_alias, 'images/sigil.png');
    assert.equal(receipt.name, 'sigil.png');
    assert.equal(receipt.extension, '.png');
    assert.equal(receipt.exists, true);
    assert.equal(receipt.is_directory, false);
    assert.equal(receipt.size_bytes, 21);
    assert.equal(receipt.content_read, false);
    assert.equal(JSON.stringify(receipt).includes(root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('asset watcher refuses aliases outside the selected root', () => {
  const root = path.resolve(os.tmpdir(), 'watch-root');
  const outside = path.resolve(os.tmpdir(), 'elsewhere', 'file.txt');
  assert.equal(relativeAlias(root, outside), null);
});

test('Electron preload exposes bounded watcher actions, not filesystem read primitives', () => {
  const preload = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.js'), 'utf8');
  assert.match(preload, /selectAssetWatchDirectory/);
  assert.match(preload, /startAssetWatch/);
  assert.match(preload, /stopAssetWatch/);
  assert.match(preload, /onAssetWatchEvent/);
  assert.doesNotMatch(preload, /readFile|readFileSync|readdir|writeFile/);
  assert.match(main, /dialog\.showOpenDialog/);
  assert.match(main, /startMetadataWatcher/);
  assert.match(main, /root_label/);
  assert.doesNotMatch(main, /win\.webContents\.send\('asset-watch:event',[\s\S]*selection\.root[,}]/);
});
