import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestUrl = new URL('../skills/sources/behind-the-name/site-ingest.json', import.meta.url);

async function loadManifest() {
  return JSON.parse(await readFile(fileURLToPath(manifestUrl), 'utf8'));
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
