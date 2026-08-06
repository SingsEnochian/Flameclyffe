#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const API = 'https://wot.fandom.com/api.php';
const ROOT = resolve('canon/taaveren-vaen/wot-fandom');
const RAW = resolve(ROOT, 'raw');
const RECEIPTS = resolve(ROOT, 'receipts');
const RESUME = process.argv.includes('--resume');
const INCLUDE_HISTORY = process.argv.includes('--include-history');

const paths = {
  pages: resolve(RAW, 'pages.ndjson'),
  revisions: resolve(RAW, 'revisions.ndjson'),
  links: resolve(RAW, 'links.ndjson'),
  categories: resolve(RAW, 'categories.ndjson'),
  media: resolve(RAW, 'media-metadata.ndjson'),
  failures: resolve(RECEIPTS, 'failures.ndjson'),
  checkpoint: resolve(RECEIPTS, 'checkpoints.json'),
  run: resolve(RECEIPTS, 'ingest-run.json'),
  manifest: resolve(ROOT, 'manifest.json')
};

const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
const hash = value => createHash('sha256').update(value).digest('hex');

async function append(path, record) {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${JSON.stringify(record)}\n`, 'utf8');
}

async function api(params) {
  const url = new URL(API);
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('maxlag', '5');
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Hearthgate-Bifrost-WoT-Ingest/1.0'
      }
    });
    if (response.ok) return response.json();
    if (attempt === 5) throw new Error(`MediaWiki API ${response.status}: ${await response.text()}`);
    await sleep(attempt * 1500);
  }
}

async function loadCheckpoint() {
  if (!RESUME) return { apcontinue: null, imported: 0, failed: 0, completed: false };
  try {
    return JSON.parse(await readFile(paths.checkpoint, 'utf8'));
  } catch {
    return { apcontinue: null, imported: 0, failed: 0, completed: false };
  }
}

async function saveCheckpoint(checkpoint) {
  await writeFile(paths.checkpoint, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

async function fetchPage(page) {
  const query = await api({
    action: 'query',
    pageids: page.pageid,
    prop: 'info|revisions|links|categories|pageprops|images',
    inprop: 'url',
    rvprop: 'ids|timestamp|user|userid|comment|content|sha1',
    rvslots: 'main',
    rvlimit: INCLUDE_HISTORY ? 'max' : '1',
    pllimit: 'max',
    cllimit: 'max',
    imlimit: 'max',
    redirects: '1'
  });

  const record = query.query?.pages?.[0];
  if (!record) throw new Error(`No page payload for page ${page.pageid}`);

  const latest = record.revisions?.[0] ?? null;
  const text = latest?.slots?.main?.content ?? '';

  await append(paths.pages, {
    schema: 'hearthgate/canon-source-page/v1',
    ingest_id: 'taaveren-vaen.wot-fandom.full-v1',
    page_id: record.pageid,
    namespace: record.ns,
    title: record.title,
    source_url: record.fullurl ?? null,
    redirect: Boolean(record.redirect),
    page_properties: record.pageprops ?? {},
    latest_revision_id: latest?.revid ?? null,
    latest_revision_timestamp: latest?.timestamp ?? null,
    latest_contributor: latest?.user ?? null,
    latest_contributor_id: latest?.userid ?? null,
    source_license: 'CC-BY-SA-3.0-unless-otherwise-noted',
    retrieved_at: new Date().toISOString(),
    content_sha256: hash(text),
    wikitext: text
  });

  for (const revision of record.revisions ?? []) {
    await append(paths.revisions, {
      page_id: record.pageid,
      title: record.title,
      revision_id: revision.revid,
      parent_id: revision.parentid ?? null,
      timestamp: revision.timestamp,
      contributor: revision.user ?? null,
      contributor_id: revision.userid ?? null,
      comment: revision.comment ?? '',
      source_sha1: revision.sha1 ?? null,
      content: revision.slots?.main?.content ?? ''
    });
  }

  for (const link of record.links ?? []) {
    await append(paths.links, {
      page_id: record.pageid,
      title: record.title,
      target_namespace: link.ns,
      target_title: link.title
    });
  }

  for (const category of record.categories ?? []) {
    await append(paths.categories, {
      page_id: record.pageid,
      title: record.title,
      category: category.title
    });
  }

  for (const image of record.images ?? []) {
    await append(paths.media, {
      page_id: record.pageid,
      title: record.title,
      file_title: image.title,
      policy: 'metadata-only-pending-file-level-license-review'
    });
  }
}

async function main() {
  for (const directory of [ROOT, RAW, RECEIPTS, resolve(ROOT, 'normalized'), resolve(ROOT, 'indexes'), resolve(ROOT, 'overlays')]) {
    await mkdir(directory, { recursive: true });
  }

  const startedAt = new Date().toISOString();
  const checkpoint = await loadCheckpoint();

  do {
    const listing = await api({
      action: 'query',
      list: 'allpages',
      aplimit: 'max',
      apcontinue: checkpoint.apcontinue
    });

    for (const page of listing.query?.allpages ?? []) {
      try {
        await fetchPage(page);
        checkpoint.imported += 1;
      } catch (error) {
        checkpoint.failed += 1;
        await append(paths.failures, {
          page_id: page.pageid,
          title: page.title,
          failed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        });
      }
      await saveCheckpoint(checkpoint);
    }

    checkpoint.apcontinue = listing.continue?.apcontinue ?? null;
    await saveCheckpoint(checkpoint);
  } while (checkpoint.apcontinue);

  checkpoint.completed = true;
  checkpoint.completed_at = new Date().toISOString();
  await saveCheckpoint(checkpoint);

  const manifest = {
    schema: 'hearthgate/canon-ingest-manifest/v1',
    ingest_id: 'taaveren-vaen.wot-fandom.full-v1',
    source: API,
    started_at: startedAt,
    completed_at: checkpoint.completed_at,
    include_history: INCLUDE_HISTORY,
    imported_pages: checkpoint.imported,
    failed_pages: checkpoint.failed,
    media_policy: 'metadata-only-pending-file-level-license-review',
    output: paths
  };

  await writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(paths.run, `${JSON.stringify({ ...manifest, argv: process.argv.slice(2) }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
