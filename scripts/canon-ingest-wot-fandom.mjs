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
const PAGE_INDEX_FILE = path.join(ROOT, manifest.outputs.page_index);
const STATE_FILE = path.join(RAW_DIR, 'crawl-state.json');

await Promise.all([RAW_DIR, INDEX_DIR, RECEIPT_DIR].map((dir) => mkdir(dir, { recursive: true })));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function api(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries({ format: 'json', formatversion: '2', ...params })) {
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

async function getNamespaces() {
  const body = await api({ action: 'query', meta: 'siteinfo', siprop: 'namespaces' });
  return Object.values(body.query?.namespaces || {})
    .map((ns) => Number(ns.id))
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

async function enumerateNamespace(namespace, start = null) {
  const pages = [];
  let apcontinue = start;
  do {
    const body = await api({
      action: 'query',
      list: 'allpages',
      aplimit: 'max',
      apnamespace: namespace,
      apfilterredir: 'all',
      apcontinue
    });
    pages.push(...(body.query?.allpages || []));
    apcontinue = body.continue?.apcontinue || null;
    await sleep(manifest.snapshot.request_delay_ms);
  } while (apcontinue);
  return pages;
}

async function fetchPage(pageid) {
  const aggregate = { categories: [], links: [], images: [] };
  let continuation = {};
  let basePage = null;
  do {
    const body = await api({
      action: 'query',
      pageids: pageid,
      prop: 'revisions|categories|links|images|info|pageprops',
      rvprop: 'ids|timestamp|user|userid|comment|content|contentmodel|sha1|size',
      rvslots: 'main',
      rvlimit: 1,
      cllimit: 'max',
      pllimit: 'max',
      imlimit: 'max',
      inprop: 'url',
      ...continuation
    });
    const page = body.query?.pages?.[0];
    if (!page) throw new Error(`Missing page ${pageid}`);
    basePage ||= page;
    aggregate.categories.push(...(page.categories || []));
    aggregate.links.push(...(page.links || []));
    aggregate.images.push(...(page.images || []));
    continuation = body.continue || null;
    if (continuation) delete continuation.continue;
    await sleep(manifest.snapshot.request_delay_ms);
  } while (continuation && Object.keys(continuation).length);
  return { ...basePage, ...aggregate };
}

const priorState = (await exists(STATE_FILE))
  ? JSON.parse(await readFile(STATE_FILE, 'utf8'))
  : { completed_page_ids: [], pages: 0, started_at: new Date().toISOString() };
const completed = new Set(priorState.completed_page_ids || []);
const runStarted = new Date().toISOString();

if (!manifest.snapshot.resume || !(await exists(RAW_FILE))) {
  await writeFile(RAW_FILE, '');
  completed.clear();
}

const namespaces = await getNamespaces();
const pageIndex = [];
for (const namespace of namespaces) {
  const pages = await enumerateNamespace(namespace);
  pageIndex.push(...pages.map((page) => ({ ...page, namespace })));
}
await writeFile(PAGE_INDEX_FILE, JSON.stringify({
  ingest_id: manifest.ingest_id,
  generated_at: new Date().toISOString(),
  namespaces,
  pages: pageIndex
}, null, 2));

let pageCount = completed.size;
for (const summary of pageIndex) {
  if (completed.has(summary.pageid)) continue;
  const page = await fetchPage(summary.pageid);
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
    categories: [...new Set((page.categories || []).map((item) => item.title.replace(/^Category:/, '')))],
    links: [...new Map((page.links || []).map((item) => [`${item.ns}:${item.title}`, { ns: item.ns, title: item.title }])).values()],
    images: [...new Set((page.images || []).map((item) => item.title))],
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
    knowledge_eligible: !manifest.namespaces.exclude_from_knowledge.includes(page.ns),
    canon_promotable: manifest.namespaces.canon_promote.includes(page.ns),
    attribution: {
      licence: manifest.source.license,
      source_page: page.fullurl,
      revision_id: revision?.revid || null,
      revision_user: revision?.user || null,
      retrieved_at: new Date().toISOString()
    }
  };
  await appendFile(RAW_FILE, `${JSON.stringify(record)}\n`, 'utf8');
  completed.add(page.pageid);
  pageCount += 1;
  await writeFile(STATE_FILE, JSON.stringify({
    completed_page_ids: [...completed],
    pages: pageCount,
    total_discovered: pageIndex.length,
    started_at: priorState.started_at,
    updated_at: new Date().toISOString(),
    complete: pageCount >= pageIndex.length
  }, null, 2));
  process.stdout.write(`\rCaptured ${pageCount}/${pageIndex.length} pages…`);
}
process.stdout.write('\n');

const receipt = {
  ingest_id: manifest.ingest_id,
  world_key: manifest.world_key,
  source: manifest.source,
  started_at: runStarted,
  completed_at: new Date().toISOString(),
  pages: pageCount,
  namespaces,
  raw_file: manifest.outputs.raw_pages,
  raw_sha256: hash(await readFile(RAW_FILE)),
  manifest_sha256: hash(JSON.stringify(manifest)),
  attribution_preserved: true,
  canon_policy: manifest.canon_policy
};
await writeFile(path.join(RECEIPT_DIR, `crawl-${Date.now()}.json`), JSON.stringify(receipt, null, 2));
console.log(`Receipt written for ${pageCount} pages.`);
