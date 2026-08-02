import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const PREPARE = path.join(REPO_ROOT, 'scripts/prepare-wot-fandom-archive.mjs');
const NORMALISE = path.join(REPO_ROOT, 'scripts/normalise-wot-fandom.mjs');
const VERIFY = path.join(REPO_ROOT, 'scripts/verify-wot-fandom-ingest.mjs');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('normalisation keeps Wheel of Time canon separate from Ta’veren Vaen', async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), 'wot-ingest-'));
  const root = path.join(parent, 'wot-fandom');
  await mkdir(path.join(root, 'data/raw'), { recursive: true });
  await mkdir(path.join(root, 'data/index'), { recursive: true });
  await mkdir(path.join(root, 'data/receipts'), { recursive: true });

  const manifest = {
    ingest_id: 'fixture.wot',
    world_key: 'taaveren-vaen',
    source: { name: 'Fixture Wiki', base_url: 'https://example.test', api_url: 'https://example.test/api.php', license: 'CC BY-SA' },
    namespaces: { exclude_from_knowledge: [], canon_promote: [0] },
    canon_policy: { spoiler_scope: 'full-series' },
    outputs: {
      raw_pages: 'data/raw/pages.ndjson',
      page_index: 'data/index/pages.json',
      categories: 'data/index/categories.json',
      redirects: 'data/index/redirects.json',
      entities: 'data/normalised/entities.ndjson',
      relationships: 'data/normalised/relationships.ndjson',
      timeline: 'data/normalised/timeline.ndjson',
      dossiers: 'data/dossiers',
      receipts: 'data/receipts',
    },
    arcsweep: { import_bundle: 'dist/bundle.json', classification: 'canonical-reference' },
  };
  await writeJson(path.join(root, 'ingest.manifest.json'), manifest);
  await writeJson(path.join(parent, 'project-overlay.json'), {
    overlay_id: 'taaveren-vaen.fixture',
    classification: 'project-canon-overlay',
  });

  const pages = [
    { pageid: 1, title: "Rand al'Thor", namespace: 0 },
    { pageid: 2, title: 'Dragon Reborn', namespace: 0 },
  ];
  const rawLines = [
    {
      schema: 'hearthgate.canon-source-page.v1',
      page_id: 1,
      namespace: 0,
      title: "Rand al'Thor",
      canonical_title: "Rand al'Thor",
      redirect: false,
      categories: ['Characters'],
      links: [{ ns: 0, title: 'Dragon Reborn' }],
      images: [],
      revision: { revid: 10 },
      content: "'''Rand al'Thor''' is a character with a sufficiently long fixture summary\u2028for normalisation.",
      content_sha256: 'a',
      source_url: 'https://example.test/1',
      canon_promotable: true,
      attribution: { licence: 'CC BY-SA' },
    },
    {
      schema: 'hearthgate.canon-source-page.v1',
      page_id: 2,
      namespace: 0,
      title: 'Dragon Reborn',
      canonical_title: 'Dragon Reborn',
      redirect: false,
      categories: ['Prophecies'],
      links: [{ ns: 0, title: "Rand al'Thor" }],
      images: [],
      revision: { revid: 11 },
      content: 'The Dragon Reborn is a prophecy with a sufficiently long fixture summary\u2029for normalisation.',
      content_sha256: 'b',
      source_url: 'https://example.test/2',
      canon_promotable: true,
      attribution: { licence: 'CC BY-SA' },
    },
  ];
  const raw = `${rawLines.map((page) => JSON.stringify(page)).join('\n')}\n`;
  const index = `${JSON.stringify({ pages }, null, 2)}\n`;
  await writeFile(path.join(root, 'data/raw/pages.ndjson'), raw, 'utf8');
  await writeFile(path.join(root, 'data/index/pages.json'), index, 'utf8');
  await writeJson(path.join(root, 'data/raw/crawl-state.json'), {
    complete: true,
    pages: 2,
    total_discovered: 2,
    completed_page_ids: [1, 2],
  });
  await writeJson(path.join(root, 'data/receipts/crawl-1.json'), {
    status: 'complete',
    pages: 2,
    total_discovered: 2,
    raw_sha256: sha256(raw),
    page_index_sha256: sha256(index),
  });

  const prepare = spawnSync(process.execPath, [PREPARE, `--root=${root}`], { encoding: 'utf8' });
  assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);

  const canonicalRaw = await readFile(path.join(root, 'data/raw/pages.ndjson'), 'utf8');
  assert.equal(canonicalRaw.includes('\u2028'), false);
  assert.equal(canonicalRaw.includes('\u2029'), false);
  assert.equal(canonicalRaw.includes('\\u2028'), true);
  assert.equal(canonicalRaw.includes('\\u2029'), true);
  const canonicalPages = canonicalRaw.trimEnd().split('\n').map((line) => JSON.parse(line));
  assert.equal(canonicalPages[0].content.includes('\u2028'), true);
  assert.equal(canonicalPages[1].content.includes('\u2029'), true);

  const normalise = spawnSync(process.execPath, [NORMALISE, `--root=${root}`], { encoding: 'utf8' });
  assert.equal(normalise.status, 0, normalise.stderr || normalise.stdout);

  const verify = spawnSync(process.execPath, [VERIFY, `--root=${root}`], { encoding: 'utf8' });
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);

  const receipt = JSON.parse(await readFile(path.join(root, 'data/receipts/verification-latest.json'), 'utf8'));
  assert.equal(receipt.status, 'VERIFIED');

  const bundle = JSON.parse(await readFile(path.join(root, 'dist/bundle.json'), 'utf8'));
  assert.equal(bundle.house.foundation, 'wheel-of-time-canon');
  assert.equal(bundle.house.overlay, 'taaveren-vaen');
  assert.equal(bundle.canon_law.overwrite_source_canon, false);
  assert.deepEqual(bundle.sensory_identity.dual_aspect, {
    anchor_voice: 'wheel-of-time-canon',
    living_voice: 'taaveren-vaen',
  });
});
