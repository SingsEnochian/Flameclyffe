#!/usr/bin/env node
import { mkdir, readFile, writeFile, appendFile, access } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve('canon/taaveren-vaen/wot-fandom');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'ingest.manifest.json'), 'utf8'));
const API = manifest.source.api_url;
const RAW_DIR = path.join(ROOT, 'data/raw');
const INDEX_DIR = path.join(ROOT, 'data/index');
const RECEIPT_DIR = path.join(ROOT, 'data/receipts');
const RAW_FILE = path.join(ROOT, manifest.outputs.raw_pages);
const STATE_FILE = path.join(RAW_DIR, 'crawl-state.json');

await Promise.all([RAW_DIR, INDEX_DIR, RECEIPT_DIR].map((dir) => mkdir(dir, { recursive: true })));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function loadState() {
  if (!(await exists(STATE_FILE))) return { apcontinue: null, pages: 0, started_at: new Date().toISOString() };
  return JSON.parse(await readFile(STATE_FILE, 'utf8'));
}

async function api(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries({ format: 'json', formatversion: '2', origin: '*', ...params })) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { 'user-agent': 'Hearthgate-Arcsweep Canon Ingest/1.0 (Taaveren Vaen; attribution-preserving research archive)' }
  });
  if (!response.ok) throw new Error(`MediaWiki API request failed: ${response.status} ${response.statusText}`);
  const body = await response.json();
  if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
  return body;
}

async function listPageBatch(apcontinue) {
  return api({
    action: 'query',
    generator: 'allpages',
    gaplimit: manifest.snapshot.batch_size,
    gapfilterredir: 'all',
    gapcontinue: apcontinue,
    prop: 'revisions|categories|links|images|info|pageprops',
    rvprop: 'ids|timestamp|user|userid|comment|content|contentmodel|sha1|size',
    rvslots: 'main',
    rvlimit: 1,
    cllimit: 'max',
    pllimit: 'max',
    imlimit: 'max',
    inprop: 'url'
  });
}

const state = await loadState();
let continuation = state.apcontinue;
let pageCount = state.pages || 0;
const runStarted = new Date().toISOString();

if (!continuation && !manifest.snapshot.resume) await writeFile(RAW_FILE, '');

while (true) {
  const body = await listPageBatch(continuation);
  const pages = body.query?.pages || [];
  for (const page of pages) {
    const revision = page.revisions?.[0] || null;
    const content = revision?.slots?.main?.content ?? revision?.content ?? '';
    const record = {
      ingest_id: manifest.ingest_id,
      source_wiki: manifest.source.name,
      source_url: page.fullurl,
      page_id: page.pageid,
      namespace: page.ns,
      title: page.title,
      canonical_title: page.title.replace(/_/g, ' ').trim(),
      redirect: Boolean(page.redirect),
      categories: (page.categories || []).map((item) => item.title.replace(/^Category:/, '')),
      links: (page.links || []).map((item) => ({ ns: item.ns, title: item.title })),
      images: (page.images || []).map((item) => item.title),
      pageprops: page.pageprops || {},
      revision: revision ? {
        revid: revision.revid,
        parentid: revision.parentid,
        timestamp: revision.timestamp,
        user: revision.user,
        userid: revision.userid,
        comment: revision.comment,
        sha1: revision.sha1,
        size: revision.size,
        contentmodel: revision.slots?.main?.contentmodel || revision.contentmodel || 'wikitext'
      } : null,
      content,
      content_sha256: hash(content),
      classification: page.ns === 0 ? manifest.canon_policy.source_classification : 'support-material',
      attribution: {
        licence: manifest.source.license,
        source_page: page.fullurl,
        revision_id: revision?.revid || null,
        revision_user: revision?.user || null,
        retrieved_at: new Date().toISOString()
      }
    };
    await appendFile(RAW_FILE, `${JSON.stringify(record)}\n`, 'utf8');
    pageCount += 1;
  }

  continuation = body.continue?.gapcontinue || null;
  await writeFile(STATE_FILE, JSON.stringify({
    apcontinue: continuation,
    pages: pageCount,
    started_at: state.started_at,
    updated_at: new Date().toISOString(),
    complete: !continuation
  }, null, 2));

  process.stdout.write(`\rCaptured ${pageCount} pages${continuation ? '…' : '.\n'}`);
  if (!continuation) break;
  await sleep(manifest.snapshot.request_delay_ms);
}

const receipt = {
  ingest_id: manifest.ingest_id,
  world_key: manifest.world_key,
  source: manifest.source,
  started_at: runStarted,
  completed_at: new Date().toISOString(),
  pages: pageCount,
  raw_file: manifest.outputs.raw_pages,
  raw_sha256: hash(await readFile(RAW_FILE)),
  manifest_sha256: hash(JSON.stringify(manifest)),
  attribution_preserved: true,
  canon_policy: manifest.canon_policy
};
await writeFile(path.join(RECEIPT_DIR, `crawl-${Date.now()}.json`), JSON.stringify(receipt, null, 2));
console.log(`Receipt written for ${pageCount} pages.`);
