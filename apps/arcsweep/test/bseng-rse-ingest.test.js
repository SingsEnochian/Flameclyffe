import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  canonicalizeUrl,
  classifySource,
  parseRobots,
  parseVersion,
  proposeLineage,
  robotsAllows,
  titleStem,
} from '../scripts/bseng-rse-ingest.mjs';

const fixture = (path) => new URL(path, import.meta.url);

test('canonicalizeUrl drops tracking parameters and fragments', () => {
  assert.equal(
    canonicalizeUrl('https://bseng.com/a/?utm_source=x&b=2&a=1#hello', 'https://bseng.com/', ['utm_source']),
    'https://bseng.com/a/?a=1&b=2',
  );
});

test('parseVersion and titleStem keep version lineage deterministic', () => {
  assert.equal(parseVersion('Relational Structural Experience v6.0'), '6.0');
  assert.equal(titleStem('Relational Structural Experience v6.0'), 'relational structural experience');
});

test('robots parser treats blank Disallow as no restriction and honors specific rules', () => {
  const rules = parseRobots(`User-agent: *\nDisallow:\nDisallow: /private/\nAllow: /private/public/\n`);
  assert.equal(robotsAllows('https://bseng.com/start-here/', rules), true);
  assert.equal(robotsAllows('https://bseng.com/private/nope', rules), false);
  assert.equal(robotsAllows('https://bseng.com/private/public/yes', rules), true);
});

test('source classification separates primary PDFs, precursor conversations, and research pages', () => {
  assert.equal(classifySource('https://bseng.com/wp-content/uploads/2026/05/a.pdf', 'A'), 'primary-document');
  assert.equal(classifySource('https://bseng.com/start-here/sauna-epistemology/', 'Sauna Epistemology'), 'conversation-precursor');
  assert.equal(classifySource('https://bseng.com/2025/03/example/', 'Example'), 'research-page');
});

test('proposeLineage emits candidate supersession only for increasing versions of same title stem', () => {
  const rows = [
    { source_id: 'a', title: 'Thing v1.0', version: '1.0' },
    { source_id: 'b', title: 'Thing v1.2', version: '1.2' },
    { source_id: 'c', title: 'Other v9.0', version: '9.0' },
  ];
  assert.deepEqual(proposeLineage(rows), [{
    relation: 'supersedes',
    confidence: 'candidate',
    reason: 'same-title-stem-higher-version',
    title_stem: 'thing',
    older_source_id: 'a',
    newer_source_id: 'b',
  }]);
});

test('sealed live harvest receipt records complete 421-source crawl', async () => {
  const receipt = JSON.parse(await readFile(fixture('../skills/sources/bseng-rse/live-harvest-receipt.2026-08-20.json'), 'utf8'));
  assert.equal(receipt.schema, 'hearthfire.bseng-live-harvest-receipt/v1');
  assert.equal(receipt.coverage.source_count, 421);
  assert.equal(receipt.coverage.sitemap_pages, 402);
  assert.equal(receipt.coverage.mathematics_hub_pdfs, 19);
  assert.equal(receipt.coverage.failures, 0);
  assert.equal(receipt.coverage.truncated, false);
  assert.equal(receipt.coverage.unique_source_hashes, 421);
  assert.equal(receipt.primary_documents.length, 19);
});

test('lineage map preserves explicit Circle to Chet thread-walking attribution', async () => {
  const lineage = JSON.parse(await readFile(fixture('../skills/sources/bseng-rse/lineage-diff.2025-2026.json'), 'utf8'));
  const edge = lineage.directed_provenance_edges.find((candidate) => candidate.from?.name === 'thread-walking');
  assert.ok(edge);
  assert.deepEqual(edge.from.authors, ['Ryan', 'Solas']);
  assert.equal(edge.relation, 'formalized-as');
  assert.equal(edge.confidence, 'explicit-attribution');
  assert.match(edge.to.title, /Recognition Anchoring Across Indexing Inequivalence/);
  assert.equal(lineage.automatic_canon_write, false);
});
