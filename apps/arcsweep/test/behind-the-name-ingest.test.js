import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildRegistry,
  parseGivenNames,
  parseGivenNamesWithRelated,
  parseSurnames,
} from '../scripts/behind-the-name-ingest.mjs';

const manifestUrl = new URL('../skills/sources/behind-the-name/site-ingest.json', import.meta.url);
const receiptUrl = new URL('../skills/sources/behind-the-name/ingest-receipt.2026-09-09.json', import.meta.url);

async function loadManifest() {
  return JSON.parse(await readFile(fileURLToPath(manifestUrl), 'utf8'));
}

async function loadReceipt() {
  return JSON.parse(await readFile(fileURLToPath(receiptUrl), 'utf8'));
}

test('Behind the Name ingest uses licensed acquisition, never HTML scraping', async () => {
  const manifest = await loadManifest();

  assert.equal(manifest.corpus_id, 'behind-the-name-onomastics');
  assert.equal(manifest.live_site_policy.crawl_enabled, false);
  assert.equal(manifest.live_site_policy.scrape_html, false);
  assert.equal(manifest.live_site_policy.snapshot_html, false);
  assert.equal(manifest.live_site_policy.copy_meaning_history, false);
  assert.equal(manifest.live_site_policy.ai_train, false);
  assert.equal(manifest.live_site_policy.use, 'reference-only');
  assert.equal(manifest.authorised_acquisition.downloads.enabled, true);
  assert.equal(manifest.authorised_acquisition.downloads.licence, 'CC-BY-SA-4.0');
  assert.equal(manifest.authorised_acquisition.downloads.manual_verification_required, true);
});

test('Behind the Name ingest excludes submitted/prose collections and keeps receipts mandatory', async () => {
  const manifest = await loadManifest();

  assert.equal(manifest.live_site_policy.copy_submitted_names, false);
  assert.ok(manifest.excluded_collections.includes('meaning-and-history prose'));
  assert.ok(manifest.excluded_collections.includes('user-submitted given names'));
  assert.ok(manifest.excluded_collections.includes('user-submitted surnames'));
  assert.ok(manifest.record_schema.prohibited_fields_from_live_pages.includes('description'));
  assert.equal(manifest.receipt_requirements.hash_every_input, true);
  assert.equal(manifest.receipt_requirements.no_success_without_source_hashes, true);
});

test('optional Behind the Name API enrichment is bounded to documented limits', async () => {
  const manifest = await loadManifest();
  const api = manifest.authorised_acquisition.api;

  assert.equal(api.enabled_by_default, false);
  assert.equal(api.key_environment_variable, 'BEHINDTHENAME_API_KEY');
  assert.equal(api.rate_limits.requests_per_second, 2);
  assert.equal(api.rate_limits.requests_per_hour, 400);
  assert.equal(api.rate_limits.requests_per_day, 4000);
  assert.equal(api.rate_limits.requests_per_year, 400000);
  assert.ok(api.allowed_enrichment.includes('given-name usage'));
  assert.match(api.forbidden_assumption, /does not provide meaning\/history/i);
});

test('licensed text adapters preserve source fields and related-name edges', () => {
  const given = '# name\tgender\nAäron\tm\nAda\tfm\n';
  const related = '# name\tgender\trelated\nAäron\tm\tAaron\nAda\tfm\tAada,Adeline\n';
  const surnames = '# surnames\nÅberg\nAalto\n';

  assert.deepEqual(parseGivenNames(given), [
    { name: 'Aäron', gender: 'm' },
    { name: 'Ada', gender: 'fm' },
  ]);
  assert.deepEqual(parseGivenNamesWithRelated(related)[1].relatedNames, ['Aada', 'Adeline']);
  assert.deepEqual(parseSurnames(surnames), ['Åberg', 'Aalto']);

  const registry = buildRegistry({
    givenText: given,
    relatedText: related,
    surnameText: surnames,
    hashes: { given: 'a', givenRelated: 'b', surnames: 'c' },
    exportedAt: { given: 'x', givenRelated: 'y', surnames: 'z' },
  });

  assert.equal(registry.counts.records, 4);
  assert.equal(registry.counts.related_name_edges, 3);
  assert.equal(registry.records[0].display_name, 'Aäron');
  assert.equal(registry.records[0].flat_name, 'aaron');
  assert.equal(registry.records[0].source_licence, 'CC-BY-SA-4.0');
});

test('sealed 2026-09-09 ingest receipt records exact licensed snapshot and output hashes', async () => {
  const receipt = await loadReceipt();

  assert.equal(receipt.schema, 'hearthfire.licensed-dataset-ingest-receipt/v1');
  assert.equal(receipt.status, 'verified-local-ingest');
  assert.equal(receipt.source_licence, 'CC-BY-SA-4.0');
  assert.equal(receipt.counts.given_names, 29815);
  assert.equal(receipt.counts.surnames, 8590);
  assert.equal(receipt.counts.records, 38405);
  assert.equal(receipt.counts.related_name_edges, 46633);
  assert.equal(receipt.counts.given_names_with_related, 14008);
  assert.equal(receipt.inputs[0].sha256, 'aad7d788cc1e521769d259affc41eb1f3cb61bafa846759bcccaf478b7db28d8');
  assert.equal(receipt.inputs[1].sha256, 'c34734a34898a906effe20df1d287ec48ee16bdc999ed4631d54356e379d39be');
  assert.equal(receipt.inputs[2].sha256, '3633abd9633df29c3a3bfcf6b510b3166ceb8ac1bf5d643b77a32fe883f8f82b');
  assert.match(receipt.output_hashes['records/onomastics.jsonl'], /^sha256:[0-9a-f]{64}$/);
  assert.equal(receipt.validation.given_and_related_sources_match, true);
  assert.equal(receipt.validation.html_scraped, false);
  assert.equal(receipt.validation.training_authorised, false);
});
