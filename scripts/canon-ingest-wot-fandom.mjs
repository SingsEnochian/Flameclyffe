#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ROOT = 'canon/taaveren-vaen/wot-fandom';
const args = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(args.root || process.env.WOT_INGEST_ROOT || DEFAULT_ROOT);
const manifest = JSON.parse(await readFile(path.join(ROOT, 'ingest.manifest.json'), 'utf8'));
const API = manifest.source.api_url;
const RAW_DIR = path.join(ROOT, 'data/raw');
const INDEX_DIR = path.join(ROOT, 'data/index');
const RECEIPT_DIR = path.join(ROOT, 'data/receipts');
const RAW_FILE = path.join(ROOT, manifest.outputs.raw_pages);
const PAGE_INDEX_FILE = path.join(ROOT, manifest.outputs.page_index);
const STATE_FILE = path.join(RAW_DIR, 'crawl-state.json');
const REQUEST_DELAY_MS = Math.max(100, Number(args.delayMs ?? manifest.snapshot.request_delay_ms ?? 350));
const MAX_PAGES = args.maxPages === null ? null : Math.max(1, Number(args.maxPages));
const ONLY_NAMESPACE = args.namespace === null ? null : Number(args.namespace);

await Promise.all([RAW_DIR, INDEX_DIR, RECEIPT_DIR].map((dir) => mkdir(dir, { recursive: true })));

function parseArgs(argv) {
  const parsed = {
    reset: false,
    indexOnly: false,
    maxPages: null,
    namespace: null,
    delayMs: null,
    root: null,
  };
  for (const arg of argv) {
    if (arg === '--reset') parsed.reset = true;
    else if (arg === '--index-only') parsed.indexOnly = true;
    else if (arg.startsWith('--max-pages=')) parsed.maxPages = arg.split('=')[1];
    else if (arg.startsWith('--namespace=')) parsed.namespace = arg.split('=')[1];
    else if (arg.startsWith('--delay-ms=')) parsed.delayMs = arg.split('=')[1];
    else if (arg.startsWith('--root=')) parsed.root = arg.slice('--root='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function hashFile(filePath) {
  const digest = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => digest.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return digest.digest('hex');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function atomicJson(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function api(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries({
    action: 'query',
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    ...params,
  })) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'Hearthgate-Canon-Steward/1.1 (Taaveren Vaen; attribution-preserving research archive)',
        },
      });
      if (response.ok) {
        const body = await response.json();
        if (!body.error) return body;
        if (body.error.code !== 'maxlag') {
          throw new Error(`${body.error.code}: ${body.error.info}`);
        }
        lastError = new Error(`${body.error.code}: ${body.error.info}`);
      } else {
        lastError = new Error(`MediaWiki API request failed: ${response.status} ${response.statusText}`);
        if (![429, 500, 502, 503, 504].includes(response.status)) throw lastError;
      }

      const retryAfterSeconds = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(30_000, 750 * (2 ** (attempt - 1)));
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      if (attempt === 6) break;
      await sleep(Math.min(30_000, 750 * (2 ** (attempt - 1))));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error('MediaWiki API request failed after retries.');
}

async function getNamespaces() {
  const body = await api({ meta: 'siteinfo', siprop: 'namespaces' });
  const namespaces = Object.values(body.query?.namespaces || {})
    .map((namespace) => Number(namespace.id))
    .filter((namespace) => Number.isInteger(namespace) && namespace >= 0)
    .sort((left, right) => left - right);
  return ONLY_NAMESPACE === null
    ? namespaces
    : namespaces.filter((namespace) => namespace === ONLY_NAMESPACE);
}

async function enumerateNamespace(namespace) {
  const pages = [];
  let apcontinue = null;
  do {
    const body = await api({
      list: 'allpages',
      aplimit: 'max',
      apnamespace: namespace,
      apfilterredir: 'all',
      apcontinue,
    });
    pages.push(...(body.query?.allpages || []));
    apcontinue = body.continue?.apcontinue || null;
    await sleep(REQUEST_DELAY_MS);
  } while (apcontinue);
  return pages;
}

function contentContinuations(continuation) {
  if (!continuation) return null;
  const allowed = ['clcontinue', 'plcontinue', 'imcontinue'];
  const selected = Object.fromEntries(
    allowed
      .filter((key) => continuation[key] !== undefined)
      .map((key) => [key, continuation[key]]),
  );
  return Object.keys(selected).length ? selected : null;
}

async function fetchPage(pageid) {
  const aggregate = { categories: [], links: [], images: [] };
  let continuation = null;
  let basePage = null;
  do {
    const body = await api({
      pageids: pageid,
      prop: 'revisions|categories|links|images|info|pageprops',
      rvprop: 'ids|timestamp|user|userid|comment|content|contentmodel|sha1|size',
      rvslots: 'main',
      rvlimit: 1,
      cllimit: 'max',
      pllimit: 'max',
      imlimit: 'max',
      inprop: 'url',
      ...(continuation || {}),
    });
    const page = body.query?.pages?.[0];
    if (!page) throw new Error(`Missing page ${pageid}`);
    basePage ||= page;
    aggregate.categories.push(...(page.categories || []));
    aggregate.links.push(...(page.links || []));
    aggregate.images.push(...(page.images || []));
    continuation = contentContinuations(body.continue);
    await sleep(REQUEST_DELAY_MS);
  } while (continuation);
  return { ...basePage, ...aggregate };
}

function createRecord(page) {
  const revision = page.revisions?.[0] || null;
  const content = revision?.slots?.main?.content ?? revision?.content ?? '';
  return {
    schema: 'hearthgate.canon-source-page.v1',
    ingest_id: manifest.ingest_id,
    source_wiki: manifest.source.name,
    source_url: page.fullurl,
    page_id: page.pageid,
    namespace: page.ns,
    title: page.title,
    canonical_title: page.title.replaceAll('_', ' ').trim(),
    redirect: Boolean(page.redirect),
    categories: [...new Set((page.categories || []).map((item) => item.title.replace(/^Category:/, '')))],
    links: [...new Map(
      (page.links || []).map((item) => [`${item.ns}:${item.title}`, { ns: item.ns, title: item.title }]),
    ).values()],
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
      contentmodel: revision.slots?.main?.contentmodel || revision.contentmodel || 'wikitext',
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
      retrieved_at: new Date().toISOString(),
    },
  };
}

const runId = randomUUID();
const runStarted = new Date().toISOString();
let pageIndex = [];
let pageCount = 0;
let selectedCount = 0;

try {
  if (args.reset) {
    await Promise.all([
      rm(RAW_FILE, { force: true }),
      rm(STATE_FILE, { force: true }),
      rm(PAGE_INDEX_FILE, { force: true }),
    ]);
  }

  const namespaces = await getNamespaces();
  for (const namespace of namespaces) {
    const pages = await enumerateNamespace(namespace);
    pageIndex.push(...pages.map((page) => ({ ...page, namespace })));
    process.stdout.write(`Indexed namespace ${namespace}: ${pages.length} pages.\n`);
  }
  pageIndex = [...new Map(pageIndex.map((page) => [page.pageid, page])).values()];
  await atomicJson(PAGE_INDEX_FILE, {
    schema: 'hearthgate.mediawiki-page-index.v1',
    ingest_id: manifest.ingest_id,
    generated_at: new Date().toISOString(),
    namespaces,
    pages: pageIndex,
  });

  if (args.indexOnly) {
    console.log(`Indexed ${pageIndex.length} pages; capture skipped by --index-only.`);
    process.exit(0);
  }

  const rawExists = await exists(RAW_FILE);
  const priorState = rawExists && await exists(STATE_FILE)
    ? JSON.parse(await readFile(STATE_FILE, 'utf8'))
    : { completed_page_ids: [], pages: 0, started_at: runStarted };
  if (!rawExists) await writeFile(RAW_FILE, '');

  const completed = new Set(priorState.completed_page_ids || []);
  const selectedIndex = MAX_PAGES === null ? pageIndex : pageIndex.slice(0, MAX_PAGES);
  selectedCount = selectedIndex.length;
  pageCount = completed.size;

  for (const summary of selectedIndex) {
    if (completed.has(summary.pageid)) continue;
    const record = createRecord(await fetchPage(summary.pageid));
    await appendFile(RAW_FILE, `${JSON.stringify(record)}\n`, 'utf8');
    completed.add(summary.pageid);
    pageCount = completed.size;
    await atomicJson(STATE_FILE, {
      schema: 'hearthgate.canon-crawl-state.v1',
      ingest_id: manifest.ingest_id,
      completed_page_ids: [...completed],
      pages: pageCount,
      total_discovered: pageIndex.length,
      selected_pages: selectedCount,
      started_at: priorState.started_at,
      updated_at: new Date().toISOString(),
      complete: MAX_PAGES === null && pageCount >= pageIndex.length,
      run_mode: MAX_PAGES === null ? 'full' : 'bounded',
    });
    process.stdout.write(`\rCaptured ${pageCount}/${selectedCount} selected pages (${pageIndex.length} discovered)…`);
  }
  process.stdout.write('\n');

  const fullComplete = MAX_PAGES === null && pageCount >= pageIndex.length;
  const receipt = {
    schema: 'hearthgate.canon-crawl-receipt.v1',
    receipt_id: runId,
    status: fullComplete ? 'complete' : 'partial',
    run_mode: MAX_PAGES === null ? 'full' : 'bounded',
    ingest_id: manifest.ingest_id,
    world_key: manifest.world_key,
    source: manifest.source,
    started_at: runStarted,
    completed_at: new Date().toISOString(),
    pages: pageCount,
    selected_pages: selectedCount,
    total_discovered: pageIndex.length,
    namespaces,
    raw_file: manifest.outputs.raw_pages,
    raw_sha256: await hashFile(RAW_FILE),
    page_index_sha256: await hashFile(PAGE_INDEX_FILE),
    manifest_sha256: hash(JSON.stringify(manifest)),
    attribution_preserved: true,
    canon_policy: manifest.canon_policy,
  };
  const prefix = fullComplete ? 'crawl' : 'crawl-partial';
  await atomicJson(path.join(RECEIPT_DIR, `${prefix}-${Date.now()}.json`), receipt);
  console.log(`${receipt.status.toUpperCase()} receipt written for ${pageCount} captured pages.`);
} catch (error) {
  await atomicJson(path.join(RECEIPT_DIR, `crawl-failed-${Date.now()}.json`), {
    schema: 'hearthgate.canon-crawl-receipt.v1',
    receipt_id: runId,
    status: 'failed',
    ingest_id: manifest.ingest_id,
    started_at: runStarted,
    failed_at: new Date().toISOString(),
    pages: pageCount,
    selected_pages: selectedCount,
    total_discovered: pageIndex.length,
    error: {
      name: error.name,
      message: error.message,
    },
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
