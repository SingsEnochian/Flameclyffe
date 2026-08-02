#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const DEFAULT_ROOT = 'canon/taaveren-vaen/wot-fandom';
const rootArg = process.argv.find((arg) => arg.startsWith('--root='));
const ROOT = path.resolve(rootArg?.slice('--root='.length) || process.env.WOT_INGEST_ROOT || DEFAULT_ROOT);
const manifest = JSON.parse(await readFile(path.join(ROOT, 'ingest.manifest.json'), 'utf8'));
const RAW_FILE = path.join(ROOT, manifest.outputs.raw_pages);
const PAGE_INDEX_FILE = path.join(ROOT, manifest.outputs.page_index);
const STATE_FILE = path.join(ROOT, 'data/raw/crawl-state.json');
const RECEIPT_DIR = path.join(ROOT, manifest.outputs.receipts);
const BUNDLE_FILE = path.join(ROOT, manifest.arcsweep.import_bundle);
const VERIFY_FILE = path.join(RECEIPT_DIR, 'verification-latest.json');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

async function latestReceipt(prefix, requiredStatus = 'complete') {
  const files = (await readdir(RECEIPT_DIR))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
    .reverse();
  for (const name of files) {
    const value = JSON.parse(await readFile(path.join(RECEIPT_DIR, name), 'utf8'));
    if (!requiredStatus || value.status === requiredStatus) return { name, value };
  }
  throw new Error(`No ${requiredStatus || ''} ${prefix} receipt found.`.trim());
}

const checks = [];
function check(name, condition, evidence) {
  checks.push({ name, status: condition ? 'VERIFIED' : 'FAILED', evidence });
  return condition;
}

let failure = null;
try {
  const crawl = await latestReceipt('crawl-', 'complete');
  const normalise = await latestReceipt('normalise-', 'complete');
  const index = JSON.parse(await readFile(PAGE_INDEX_FILE, 'utf8'));
  const state = JSON.parse(await readFile(STATE_FILE, 'utf8'));
  const bundle = JSON.parse(await readFile(BUNDLE_FILE, 'utf8'));

  check('crawl receipt complete', crawl.value.status === 'complete', crawl.name);
  check(
    'page index count matches receipt',
    index.pages.length === crawl.value.total_discovered,
    `${index.pages.length} index pages / ${crawl.value.total_discovered} receipt pages`,
  );
  check(
    'crawl state is complete',
    state.complete === true && state.pages === index.pages.length,
    `${state.pages}/${index.pages.length}`,
  );
  check(
    'raw archive hash matches receipt',
    await hashFile(RAW_FILE) === crawl.value.raw_sha256,
    crawl.value.raw_sha256,
  );
  check(
    'page index hash matches receipt',
    await hashFile(PAGE_INDEX_FILE) === crawl.value.page_index_sha256,
    crawl.value.page_index_sha256,
  );

  const seen = new Set();
  let lines = 0;
  let duplicatePageIds = 0;
  const reader = readline.createInterface({
    input: createReadStream(RAW_FILE, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    lines += 1;
    if (seen.has(record.page_id)) duplicatePageIds += 1;
    seen.add(record.page_id);
  }
  check('raw page count matches index', lines === index.pages.length, `${lines}/${index.pages.length}`);
  check('raw archive has no duplicate page ids', duplicatePageIds === 0, `${duplicatePageIds} duplicates`);
  check(
    'normalisation consumed the full archive',
    normalise.value.source_pages === lines,
    `${normalise.value.source_pages}/${lines}`,
  );
  check('canon entities generated', normalise.value.entities > 0, `${normalise.value.entities} entities`);
  check('relationship graph generated', normalise.value.relationships > 0, `${normalise.value.relationships} relationships`);
  check(
    'canon and project overlay remain separate',
    bundle.house.foundation === 'wheel-of-time-canon'
      && bundle.house.overlay === 'taaveren-vaen'
      && bundle.canon_law.overwrite_source_canon === false,
    `${bundle.house.foundation} ↔ ${bundle.house.overlay}`,
  );
  check(
    'tone identity binds both aspects',
    bundle.sensory_identity?.dual_aspect?.anchor_voice === 'wheel-of-time-canon'
      && bundle.sensory_identity?.dual_aspect?.living_voice === 'taaveren-vaen',
    JSON.stringify(bundle.sensory_identity?.dual_aspect || {}),
  );
  check('bundle exists', await exists(BUNDLE_FILE), path.relative(process.cwd(), BUNDLE_FILE));
} catch (error) {
  failure = error;
  checks.push({ name: 'verification execution', status: 'FAILED', evidence: error.message });
}

const failed = checks.filter((item) => item.status === 'FAILED');
const result = {
  schema: 'hearthgate.canon-verification.v1',
  status: failed.length ? 'FAILED' : 'VERIFIED',
  verified_at: new Date().toISOString(),
  ingest_id: manifest.ingest_id,
  checks,
  error: failure ? { name: failure.name, message: failure.message } : null,
};
await writeFile(VERIFY_FILE, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exitCode = 1;
