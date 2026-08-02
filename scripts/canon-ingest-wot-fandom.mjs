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
import { createInterface } from 'node:readline';

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
const BASE_DELAY_MS = Math.max(
  250,
  Number(args.delayMs ?? manifest.snapshot.request_delay_ms ?? 900),
);
const BATCH_SIZE = Math.min(
  25,
  Math.max(1, Number(args.batchSize ?? manifest.snapshot.batch_size ?? 25)),
);
const MAX_RETRIES = Math.max(3, Number(manifest.snapshot.max_retries ?? 10));
const MAX_BACKOFF_MS = Math.max(30_000, Number(manifest.snapshot.max_backoff_ms ?? 120_000));
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
    batchSize: null,
    root: null,
  };
  for (const arg of argv) {
    if (arg === '--reset') parsed.reset = true;
    else if (arg === '--index-only') parsed.indexOnly = true;
    else if (arg.startsWith('--max-pages=')) parsed.maxPages = arg.split('=')[1];
    else if (arg.startsWith('--namespace=')) parsed.namespace = arg.split('=')[1];
    else if (arg.startsWith('--delay-ms=')) parsed.delayMs = arg.split('=')[1];
    else if (arg.startsWith('--batch-size=')) parsed.batchSize = arg.split('=')[1];
    else if (arg.startsWith('--root=')) parsed.root = arg.slice('--root='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => createHash('sha256').update(value).digest('hex');

function jitter(maximum = 250) {
  return Math.floor(Math.random() * (maximum + 1));
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

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

async function completedIdsFromArchive(filePath) {
  const completed = new Set();
  if (!(await exists(filePath))) return completed;

  const lines = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (Number.isInteger(record.page_id)) completed.add(record.page_id);
    } catch (error) {
      throw new Error(`Invalid NDJSON at ${filePath}:${lineNumber}: ${error.message}`);
    }
  }
  return completed;
}

let adaptiveDelayMs = BASE_DELAY_MS;
let previousRequestStartedAt = 0;

async function throttle() {
  const elapsed = Date.now() - previousRequestStartedAt;
  const waitMs = Math.max(0, adaptiveDelayMs - elapsed) + jitter(125);
  if (waitMs > 0) await sleep(waitMs);
  previousRequestStartedAt = Date.now();
}

function retryableHttpStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
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
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    await throttle();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'Hearthgate-Canon-Steward/1.2 (Taaveren Vaen; attribution-preserving research archive)',
        },
      });

      if (response.ok) {
        const body = await response.json();
        if (!body.error) {
          adaptiveDelayMs = Math.max(BASE_DELAY_MS, Math.floor(adaptiveDelayMs * 0.9));
          return body;
        }
        if (body.error.code !== 'maxlag') {
          const error = new Error(`${body.error.code}: ${body.error.info}`);
          error.retryable = false;
          throw error;
        }
        lastError = new Error(`${body.error.code}: ${body.error.info}`);
      } else {
        lastError = new Error(`MediaWiki API request failed: ${response.status} ${response.statusText}`);
        if (!retryableHttpStatus(response.status)) {
          lastError.retryable = false;
          throw lastError;
        }
      }

      adaptiveDelayMs = Math.min(5_000, Math.max(BASE_DELAY_MS * 2, Math.ceil(adaptiveDelayMs * 1.5)));
      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
      const exponentialMs = Math.min(MAX_BACKOFF_MS, 1_500 * (2 ** (attempt - 1)));
      const waitMs = Math.max(retryAfterMs ?? 0, exponentialMs) + jitter(750);
      console.warn(
        `[Canon Steward] ${lastError.message}; retry ${attempt}/${MAX_RETRIES} in ${waitMs} ms.`,
      );
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      if (error.retryable === false) throw error;
      if (attempt === MAX_RETRIES) break;
      adaptiveDelayMs = Math.min(5_000, Math.max(BASE_DELAY_MS * 2, Math.ceil(adaptiveDelayMs * 1.5)));
      const waitMs = Math.min(MAX_BACKOFF_MS, 1_500 * (2 ** (attempt - 1))) + jitter(750);
      console.warn(
        `[Canon Steward] ${error.message}; retry ${attempt}/${MAX_RETRIES} in ${waitMs} ms.`,
      );
      await sleep(waitMs);
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
  } while (apcontinue);
  return pages;
}

function contentContinuations(continuation) {
  if (!continuation) return null;
  const allowed = ['continue', 'clcontinue', 'plcontinue', 'imcontinue'];
  const selected = Object.fromEntries(
    allowed
      .filter((key) => continuation[key] !== undefined)
      .map((key) => [key, continuation[key]]),
  );
  return Object.keys(selected).length > 1 ? selected : null;
}

async function fetchPages(pageids) {
  const aggregates = new Map(
    pageids.map((pageid) => [pageid, {
      basePage: null,
      categories: [],
      links: [],
      images: [],
    }]),
  );
  let continuation = null;

  do {
    const body = await api({
      pageids: pageids.join('|'),
      prop: 'revisions|categories|links|images|info|pageprops',
      rvprop: 'ids|timestamp|user|userid|comment|content|contentmodel|sha1|size',
      rvslots: 'main',
      cllimit: 'max',
      pllimit: 'max',
      imlimit: 'max',
      inprop: 'url',
      ...(continuation || {}),
    });

    for (const page of body.query?.pages || []) {
      const aggregate = aggregates.get(page.pageid);
      if (!aggregate) continue;
      aggregate.basePage ||= page;
      aggregate.categories.push(...(page.categories || []));
      aggregate.links.push(...(page.links || []));
      aggregate.images.push(...(page.images || []));
    }
    continuation = contentContinuations(body.continue);
  } while (continuation);

  return pageids.map((pageid) => {
    const aggregate = aggregates.get(pageid);
    if (!aggregate?.basePage) throw new Error(`Missing page ${pageid}`);
    return {
      ...aggregate.basePage,
      categories: aggregate.categories,
      links: aggregate.links,
      images: aggregate.images,
    };
  });
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

function chunks(values, size) {
  const output = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

const runId = randomUUID();
const runStarted = new Date().toISOString();
let pageIndex = [];
let pageCount = 0;
let selectedCount = 0;
let selectedCaptured = 0;

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

  if (!(await exists(RAW_FILE))) await writeFile(RAW_FILE, '');
  const priorState = await exists(STATE_FILE)
    ? JSON.parse(await readFile(STATE_FILE, 'utf8'))
    : { started_at: runStarted };
  const completed = await completedIdsFromArchive(RAW_FILE);
  const selectedIndex = MAX_PAGES === null ? pageIndex : pageIndex.slice(0, MAX_PAGES);
  selectedCount = selectedIndex.length;
  selectedCaptured = selectedIndex.filter((page) => completed.has(page.pageid)).length;
  pageCount = completed.size;

  const remaining = selectedIndex.filter((page) => !completed.has(page.pageid));
  for (const batch of chunks(remaining, BATCH_SIZE)) {
    const pages = await fetchPages(batch.map((page) => page.pageid));
    const records = pages.map(createRecord);
    await appendFile(RAW_FILE, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
    for (const record of records) completed.add(record.page_id);
    pageCount = completed.size;
    selectedCaptured += records.length;

    const fullSelectionComplete = selectedCaptured >= selectedCount;
    await atomicJson(STATE_FILE, {
      schema: 'hearthgate.canon-crawl-state.v1',
      ingest_id: manifest.ingest_id,
      completed_page_ids: [...completed],
      pages: pageCount,
      total_discovered: pageIndex.length,
      selected_pages: selectedCount,
      selected_captured: selectedCaptured,
      started_at: priorState.started_at || runStarted,
      updated_at: new Date().toISOString(),
      complete: MAX_PAGES === null && ONLY_NAMESPACE === null && fullSelectionComplete,
      run_mode: MAX_PAGES === null && ONLY_NAMESPACE === null ? 'full' : 'bounded',
      batch_size: BATCH_SIZE,
      request_delay_ms: adaptiveDelayMs,
    });
    process.stdout.write(
      `\rCaptured ${selectedCaptured}/${selectedCount} selected pages `
      + `(${pageCount} archived; ${pageIndex.length} discovered)…`,
    );
  }
  process.stdout.write('\n');

  const fullComplete = MAX_PAGES === null
    && ONLY_NAMESPACE === null
    && selectedIndex.every((page) => completed.has(page.pageid));
  const receipt = {
    schema: 'hearthgate.canon-crawl-receipt.v1',
    receipt_id: runId,
    status: fullComplete ? 'complete' : 'partial',
    run_mode: MAX_PAGES === null && ONLY_NAMESPACE === null ? 'full' : 'bounded',
    ingest_id: manifest.ingest_id,
    world_key: manifest.world_key,
    source: manifest.source,
    started_at: runStarted,
    completed_at: new Date().toISOString(),
    pages: pageCount,
    selected_pages: selectedCount,
    selected_captured: selectedIndex.filter((page) => completed.has(page.pageid)).length,
    total_discovered: pageIndex.length,
    namespaces,
    batch_size: BATCH_SIZE,
    base_request_delay_ms: BASE_DELAY_MS,
    final_request_delay_ms: adaptiveDelayMs,
    raw_file: manifest.outputs.raw_pages,
    raw_sha256: await hashFile(RAW_FILE),
    page_index_sha256: await hashFile(PAGE_INDEX_FILE),
    manifest_sha256: hash(JSON.stringify(manifest)),
    attribution_preserved: true,
    canon_policy: manifest.canon_policy,
  };
  const prefix = fullComplete ? 'crawl' : 'crawl-partial';
  await atomicJson(path.join(RECEIPT_DIR, `${prefix}-${Date.now()}.json`), receipt);
  console.log(`${receipt.status.toUpperCase()} receipt written for ${pageCount} archived pages.`);
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
    selected_captured: selectedCaptured,
    total_discovered: pageIndex.length,
    batch_size: BATCH_SIZE,
    request_delay_ms: adaptiveDelayMs,
    error: {
      name: error.name,
      message: error.message,
    },
  });
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
