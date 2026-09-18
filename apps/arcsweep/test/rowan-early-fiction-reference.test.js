import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

test('Voidcaller preserves chronology while keeping story lore reference-only', async () => {
  const reference = await load('../skills/sources/drive/voidcaller-reference.v0.1.json');
  assert.equal(reference.source.created_at, '2012-11-03T18:05:43.005Z');
  assert.equal(reference.canon_policy.auto_promote, false);
  assert.equal(reference.canon_policy.story_lore_transfer, false);
  assert.equal(reference.canon_policy.ancestry_status, 'candidate-authorial-precursor');
  assert.ok(reference.laws.includes('fear is not observation'));
  assert.ok(reference.laws.includes('care that mutates state requires consent'));
});

test('The Starsong Chronicles records threshold ancestry without auto-promoting shared terminology', async () => {
  const reference = await load('../skills/sources/drive/the-starsong-chronicles-reference.v0.1.json');
  assert.equal(reference.source.created_at, '2018-01-19T17:27:31.302Z');
  assert.equal(reference.source.document_footer_year, 2019);
  assert.equal(reference.canon_policy.auto_promote, false);
  assert.equal(reference.canon_policy.ancestry_status, 'candidate-authorial-precursor');
  assert.ok(reference.laws.includes('unknown external cohorts remain unknown'));
  assert.match(reference.prohibitions.join(' '), /shared word Starsong/i);
});

test('Rowan fiction corpus indexes relay, Voidcaller, and Starsong reference sources', async () => {
  const corpus = await load('../skills/sources/drive/rowan-fiction-mechanism-corpus.v0.1.json');
  const titles = corpus.accessible_sources.map((entry) => entry.title);
  assert.ok(titles.includes('Back up your vampires'));
  assert.ok(titles.includes('Voidcaller'));
  assert.ok(titles.includes('The Starsong Chronicles'));
  assert.equal(corpus.policy.design_ancestry_claims_require_chronology, true);
});
