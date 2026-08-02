#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import {
  access,
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
const MANIFEST_FILE = path.join(ROOT, 'ingest.manifest.json');
const manifest = JSON.parse(await readFile(MANIFEST_FILE, 'utf8'));
const RAW_FILE = path.join(ROOT, manifest.outputs.raw_pages);
const INDEX_FILE = path.join(ROOT, manifest.outputs.page_index);
const STATE_FILE = path.join(ROOT, 'data/raw/crawl-state.json');
const RECEIPT_DIR = path.join(ROOT, manifest.outputs.receipts);
const OUTPUT_FILE = process.env.GITHUB_OUTPUT || null;

function parseArgs(argv) {
  const parsed = { probe: false, root: null };
  for (const argument of argv) {
    if (argument === '--probe') parsed.probe = true;
    else if (argument.startsWith('--root=')) parsed.root = argument.slice('--root='.length);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return parsed;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function emitOutput(name, value) {
  if (!OUTPUT_FILE) return;
  const line = `${name}=${String(value)}\n`;
  const current = await readFile(OUTPUT_FILE, 'utf8').catch(() => '');
  await writeFile(OUTPUT_FILE, `${current}${line}`, 'utf8');
}

function diagnosticExcerpt(line) {
  const compact = line.replaceAll(/\s+/g, ' ').slice(0, 240);
  return compact.replaceAll(/[\u0000-\u001f\u007f]/g, '?');
}

function parseArchive(rawText) {
  const text = rawText.replace(/^\uFEFF/, '');
  const lines = text.split('\n');
  const records = [];
  const pageIds = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/, '');
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      const lineNumber = index + 1;
      throw new Error(
        `Invalid NDJSON at line ${lineNumber}; sha256=${hash(line)}; `
        + `excerpt=${JSON.stringify(diagnosticExcerpt(line))}; ${error.message}`,
      );
    }
    if (!Number.isInteger(record.page_id)) {
      throw new Error(`Archive line ${index + 1} has no integer page_id.`);
    }
    if (pageIds.has(record.page_id)) {
      throw new Error(`Archive contains duplicate page_id ${record.page_id}.`);
    }
    if (record.schema !== 'hearthgate.canon-source-page.v1') {
      throw new Error(
        `Archive page ${record.page_id} has unexpected schema ${JSON.stringify(record.schema)}.`,
      );
    }
    pageIds.add(record.page_id);
    records.push(record);
  }
  return { records, pageIds };
}

function compareIdSets(label, expectedIds, actualIds) {
  if (expectedIds.size !== actualIds.size) {
    throw new Error(`${label} count mismatch: expected ${expectedIds.size}, found ${actualIds.size}.`);
  }
  for (const pageId of expectedIds) {
    if (!actualIds.has(pageId)) throw new Error(`${label} is missing page_id ${pageId}.`);
  }
}

async function inspectCompletion() {
  const required = [RAW_FILE, INDEX_FILE, STATE_FILE];
  const missing = [];
  for (const filePath of required) {
    if (!(await exists(filePath))) missing.push(path.relative(ROOT, filePath));
  }
  if (missing.length) return { complete: false, reason: `missing ${missing.join(', ')}` };

  const [stateText, indexText] = await Promise.all([
    readFile(STATE_FILE, 'utf8'),
    readFile(INDEX_FILE, 'utf8'),
  ]);
  const state = JSON.parse(stateText);
  const pageIndex = JSON.parse(indexText);
  const indexedPages = Array.isArray(pageIndex.pages) ? pageIndex.pages : [];
  const completedIds = new Set(state.completed_page_ids || []);
  const indexedIds = new Set(indexedPages.map((page) => page.pageid));
  const declaredComplete = state.complete === true
    && state.pages === state.total_discovered
    && state.pages === indexedPages.length
    && completedIds.size === indexedPages.length;
  if (!declaredComplete) {
    return {
      complete: false,
      reason: `state incomplete (${state.pages || 0}/${state.total_discovered || indexedPages.length})`,
    };
  }
  compareIdSets('crawl state/index', indexedIds, completedIds);
  return { complete: true, state, pageIndex, indexedIds };
}

const inspection = await inspectCompletion();
if (!inspection.complete) {
  await emitOutput('complete', 'false');
  await emitOutput('reason', inspection.reason.replaceAll('\n', ' '));
  if (args.probe) {
    console.log(`Completed archive not available: ${inspection.reason}`);
    process.exit(0);
  }
  throw new Error(`A complete crawl archive is required: ${inspection.reason}`);
}

const rawBefore = await readFile(RAW_FILE, 'utf8');
const beforeHash = hash(rawBefore);
const { records, pageIds } = parseArchive(rawBefore);
compareIdSets('raw archive/index', inspection.indexedIds, pageIds);
if (records.length !== inspection.state.pages) {
  throw new Error(
    `Raw archive count mismatch: state declares ${inspection.state.pages}, parsed ${records.length}.`,
  );
}

const canonicalText = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
const afterHash = hash(canonicalText);
const temporaryRaw = `${RAW_FILE}.canonical.tmp`;
await writeFile(temporaryRaw, canonicalText, 'utf8');
await rename(temporaryRaw, RAW_FILE);

await mkdir(RECEIPT_DIR, { recursive: true });
const now = new Date().toISOString();
const manifestHash = hash(JSON.stringify(manifest));
const pageIndexHash = hash(await readFile(INDEX_FILE));
const crawlReceipt = {
  schema: 'hearthgate.canon-crawl-receipt.v1',
  receipt_id: randomUUID(),
  status: 'complete',
  run_mode: 'cache-rehydration',
  ingest_id: manifest.ingest_id,
  world_key: manifest.world_key,
  source: manifest.source,
  started_at: inspection.state.started_at || now,
  completed_at: now,
  pages: records.length,
  selected_pages: records.length,
  selected_captured: records.length,
  total_discovered: inspection.pageIndex.pages.length,
  namespaces: inspection.pageIndex.namespaces || [],
  raw_file: manifest.outputs.raw_pages,
  raw_sha256: afterHash,
  page_index_sha256: pageIndexHash,
  manifest_sha256: manifestHash,
  attribution_preserved: true,
  canon_policy: manifest.canon_policy,
  cache_rehydrated: true,
};
await atomicJson(path.join(RECEIPT_DIR, `crawl-cache-${Date.now()}.json`), crawlReceipt);
await atomicJson(path.join(RECEIPT_DIR, 'ndjson-canonicalisation-latest.json'), {
  schema: 'hearthgate.ndjson-canonicalisation-receipt.v1',
  status: 'VERIFIED',
  ingest_id: manifest.ingest_id,
  created_at: now,
  pages: records.length,
  raw_sha256_before: beforeHash,
  raw_sha256_after: afterHash,
  semantic_page_ids_preserved: true,
  canonical_newline: 'LF',
  terminal_newline: true,
});

await rm(`${RAW_FILE}.tmp`, { force: true });
await emitOutput('complete', 'true');
await emitOutput('pages', records.length);
await emitOutput('raw_sha256', afterHash);
console.log(
  `VERIFIED: canonical archive prepared for ${records.length} pages `
  + `(before ${beforeHash.slice(0, 12)}…, after ${afterHash.slice(0, 12)}…).`,
);
