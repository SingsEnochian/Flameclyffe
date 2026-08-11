'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  exportPortableCanonFolder,
  ingestSources,
  listCanons,
  readCanonManifest,
} = require('../desktop/canon-store.cjs');

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'arcsweep-canon-'));
  const source = path.join(root, 'terra.md');
  await fsp.writeFile(source, '# Terra Aeterna\nHearthweave faces the sea.\n', 'utf8');
  return {
    root,
    source,
    storePaths: { root: path.join(root, 'data') },
    primer: { sourcePolicy: { acceptedExtensions: ['.md'] } },
  };
}

test('ingests, fingerprints, and lists a canon source', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const result = await ingestSources(fx.storePaths, {
    canonId: 'Terra Aeterna',
    canonName: 'Terra Aeterna',
    filePaths: [fx.source],
    primer: fx.primer,
  });
  assert.equal(result.ok, true);
  assert.equal(result.added.length, 1);
  assert.match(result.added[0].sha256, /^[a-f0-9]{64}$/);
  const rows = await listCanons(fx.storePaths);
  assert.deepEqual(rows.map((row) => row.canonId), ['terra-aeterna']);
});

test('does not copy duplicate source content twice', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  const options = {
    canonId: 'Terra Aeterna',
    canonName: 'Terra Aeterna',
    filePaths: [fx.source],
    primer: fx.primer,
  };
  await ingestSources(fx.storePaths, options);
  const duplicate = await ingestSources(fx.storePaths, options);
  assert.equal(duplicate.added.length, 0);
  assert.equal(duplicate.duplicates.length, 1);
  const manifest = await readCanonManifest(fx.storePaths, 'terra-aeterna');
  assert.equal(manifest.sources.length, 1);
});

test('exports a portable canon folder with sources and manifest', async (t) => {
  const fx = await fixture();
  t.after(() => fs.rmSync(fx.root, { recursive: true, force: true }));
  await ingestSources(fx.storePaths, {
    canonId: 'Terra Aeterna',
    canonName: 'Terra Aeterna',
    filePaths: [fx.source],
    primer: fx.primer,
  });
  const destination = path.join(fx.root, 'exports');
  await fsp.mkdir(destination);
  const result = await exportPortableCanonFolder(fx.storePaths, 'terra-aeterna', destination);
  assert.equal(result.ok, true);
  assert.equal(fs.existsSync(path.join(result.destination, 'canon.json')), true);
  assert.equal(fs.existsSync(path.join(result.destination, 'primer.json')), true);
  assert.equal(fs.existsSync(path.join(result.destination, 'sources')), true);
  assert.equal(fs.existsSync(path.join(result.destination, 'receipts.jsonl')), true);
});
