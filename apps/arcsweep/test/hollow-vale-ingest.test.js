import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  canonicalizeUrl,
  classifySource,
  isHollowValeRelevant,
  parseRobots,
  robotsAllows,
  stripHtml,
} from '../scripts/hollow-vale-ingest.mjs';

const fixture = (path) => new URL(path, import.meta.url);

const config = {
  base_url: 'https://www.alexanderpaulburton.com/',
  crawl: {
    direct_path_prefixes: ['/the-hollow-vale-wiki'],
    relevance_terms: ['the hollow vale', 'tharion', 'caelwyn'],
  },
  classification_rules: [
    { match: '/the-hollow-vale-wiki/', class: 'hollow-vale-wiki-entry' },
    { match: '/the-hollow-vale-wiki', class: 'hollow-vale-wiki-index' },
    { match: '/new-work/', class: 'hollow-vale-publication-or-companion' },
  ],
};

test('canonicalizeUrl drops tracking params and fragments', () => {
  assert.equal(
    canonicalizeUrl(
      'https://www.alexanderpaulburton.com/the-hollow-vale-wiki?a=1&utm_source=x#bell',
      config.base_url,
      ['utm_source'],
    ),
    'https://www.alexanderpaulburton.com/the-hollow-vale-wiki?a=1',
  );
});

test('Hollow Vale wiki paths are relevant without semantic guessing', () => {
  assert.equal(
    isHollowValeRelevant(
      'https://www.alexanderpaulburton.com/the-hollow-vale-wiki/the-rune-stone-and-the-spiral-of-names',
      'Anything',
      '',
      config,
    ),
    true,
  );
});

test('cross-site pages require Hollow Vale semantic signals', () => {
  assert.equal(
    isHollowValeRelevant(
      'https://www.alexanderpaulburton.com/new-work/example',
      'A Hollow Vale companion',
      'Tharion reference',
      config,
    ),
    true,
  );
  assert.equal(
    isHollowValeRelevant(
      'https://www.alexanderpaulburton.com/new-work/unrelated',
      'Unrelated work',
      'A different fictional setting',
      config,
    ),
    false,
  );
});

test('classification distinguishes wiki entries from broader companion pages', () => {
  assert.equal(
    classifySource(
      'https://www.alexanderpaulburton.com/the-hollow-vale-wiki/the-wyrdsong-and-the-forgotten-tongue',
      config,
    ),
    'hollow-vale-wiki-entry',
  );
  assert.equal(
    classifySource(
      'https://www.alexanderpaulburton.com/new-work/hollow-vale-companion',
      config,
    ),
    'hollow-vale-publication-or-companion',
  );
});

test('stripHtml removes scripts while preserving visible text', () => {
  assert.equal(stripHtml('<article><h1>Caelwyn</h1><script>bad()</script><p>Memory.</p></article>'), 'Caelwyn\nMemory.');
});

test('robots rules use the longest matching path', () => {
  const rules = parseRobots('User-agent: *\nDisallow: /private/\nAllow: /private/public/\n');
  assert.equal(robotsAllows('https://www.alexanderpaulburton.com/private/no', rules), false);
  assert.equal(robotsAllows('https://www.alexanderpaulburton.com/private/public/yes', rules), true);
});

test('reference pack preserves all four named Caelwyn origin traditions', async () => {
  const pack = JSON.parse(await readFile(fixture('../skills/sources/hollow-vale/reference-pack.v0.1.json'), 'utf8'));
  const variants = pack.records.myth_variants.filter((row) => row.subject === 'caelwyn');
  assert.equal(variants.length, 4);
  assert.ok(variants.some((row) => row.variant_id === 'wyrm-tree-birth'));
  assert.ok(variants.some((row) => row.variant_id === 'starborn-nomad'));
  assert.ok(variants.some((row) => row.variant_id === 'bell-touched-wanderer'));
  assert.ok(variants.some((row) => row.variant_id === 'child-of-the-vale'));
  assert.equal(pack.provenance.automatic_canon_write, false);
});

test('site manifest forbids raw prose and image mirroring', async () => {
  const manifest = JSON.parse(await readFile(fixture('../skills/sources/hollow-vale/site-ingest.json'), 'utf8'));
  assert.equal(manifest.copyright_policy.persist_raw_html, false);
  assert.equal(manifest.copyright_policy.persist_page_text, false);
  assert.equal(manifest.copyright_policy.mirror_images, false);
  assert.equal(manifest.variant_policy.preserve_competing_origin_traditions, true);
});
