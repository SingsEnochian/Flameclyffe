/**
 * pull-wot-fandom.mjs
 *
 * Pulls page content from the Wheel of Time Fandom wiki via MediaWiki API.
 * Writes pages, revision metadata, links, categories, media refs, receipts,
 * a checkpoint (for --resume), a failures log, and a final manifest to:
 *
 *   canon/taaveren-vaen/wot-fandom/
 *
 * Usage:
 *   node scripts/ingest/pull-wot-fandom.mjs
 *   node scripts/ingest/pull-wot-fandom.mjs --resume
 *   node scripts/ingest/pull-wot-fandom.mjs --include-history
 *
 * Bulk page corpus is gitignored; only source-profile.json, README.md,
 * BOXFIRE-RUNBOOK.md, and the final manifest.json are tracked.
 */

import { mkdir, readFile, writeFile, access, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const WIKI_API = 'https://wheeloftime.fandom.com/api.php';
const SOURCE_ID = 'wot-fandom-wiki';
const WORLD = 'taaveren-vaen';

const OUT_DIR = 'canon/taaveren-vaen/wot-fandom';
const PAGES_DIR = join(OUT_DIR, 'pages');
const RECEIPTS_DIR = join(OUT_DIR, 'receipts');
const CHECKPOINT_PATH = join(OUT_DIR, 'checkpoint.json');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const FAILURES_PATH = join(OUT_DIR, 'failures.json');

const ARGS = new Set(process.argv.slice(2));
const RESUME = ARGS.has('--resume');
const INCLUDE_HISTORY = ARGS.has('--include-history');

const RATE_DELAY_MS = 350;
const ENUM_LIMIT = 500;
const FETCH_BATCH = 20;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 20_000;

const UA = 'Boxfire-Arcsweep/1.0 (hearthgate world ingest; non-commercial research; contact: singsenochian@gmail.com)';

// ── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sha256hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function atomicJson(filePath, value) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, filePath);
}

async function fileExists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function readJsonOrNull(filePath) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); } catch { return null; }
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiJson(params, attempt = 0) {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries({ ...params, format: 'json', formatversion: '2' })) {
    url.searchParams.set(k, String(v));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    if (data.error) throw new Error(`MediaWiki error: ${data.error.code} — ${data.error.info}`);
    return data;
  } catch (err) {
    if (attempt < MAX_RETRIES - 1) {
      // 429 rate-limited: back off much longer so Fandom's window resets
      const is429 = err.message.includes('429');
      const delay = is429 ? 12_000 + attempt * 8_000 : Math.pow(2, attempt) * 800;
      console.warn(`[retry ${attempt + 1}/${MAX_RETRIES}] ${err.message} — waiting ${Math.round(delay / 1000)}s`);
      await sleep(delay);
      return apiJson(params, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Phase 1: enumerate all titles in NS 0 ────────────────────────────────────

async function enumerateTitles(checkpoint) {
  const titles = checkpoint?.titles ? [...checkpoint.titles] : [];
  let apcontinue = checkpoint?.enumContinue ?? null;
  const enumComplete = checkpoint?.enumComplete ?? false;

  if (enumComplete) {
    console.log(`[enum] checkpoint has ${titles.length} titles — skipping re-enumeration`);
    return titles;
  }

  console.log(`[enum] enumerating page titles from NS 0${apcontinue ? ` (resuming at "${apcontinue}")` : ''}…`);

  while (true) {
    const params = { action: 'query', list: 'allpages', aplimit: ENUM_LIMIT, apnamespace: 0, apfilterredir: 'nonredirects' };
    if (apcontinue) params.apcontinue = apcontinue;

    const data = await apiJson(params);
    const batch = data.query?.allpages ?? [];
    titles.push(...batch.map((p) => ({ id: p.pageid, title: p.title })));
    console.log(`[enum] ${titles.length} titles so far…`);

    apcontinue = data.continue?.apcontinue ?? null;

    await atomicJson(CHECKPOINT_PATH, {
      enumComplete: !apcontinue,
      enumContinue: apcontinue,
      titles,
      fetchedSlugs: checkpoint?.fetchedSlugs ?? [],
    });

    if (!apcontinue) break;
    await sleep(RATE_DELAY_MS);
  }

  console.log(`[enum] complete — ${titles.length} titles`);
  return titles;
}

// ── Phase 2: fetch page content in batches ────────────────────────────────────

async function fetchPageBatch(batch, includeHistory) {
  const titleStr = batch.map((p) => p.title).join('|');
  const prop = ['revisions', 'links', 'categories', 'images'];
  const rvprop = includeHistory ? 'ids|timestamp|user|content' : 'ids|timestamp|content';
  const rvlimit = includeHistory ? 'max' : 1;

  const params = {
    action: 'query',
    prop: prop.join('|'),
    titles: titleStr,
    rvprop,
    rvlimit,
    lllimit: 500,
    cllimit: 500,
    imlimit: 500,
    redirects: 1,
  };

  const data = await apiJson(params);
  return data.query?.pages ?? [];
}

async function fetchAndSave(titleEntry, includeHistory, failures) {
  const slug = slugify(titleEntry.title);
  const pageFile = join(PAGES_DIR, `${slug}.json`);
  const receiptFile = join(RECEIPTS_DIR, `${slug}.json`);

  if (await fileExists(pageFile)) {
    if (!includeHistory) return 'skipped';
    // With --include-history, skip only if this page was already pulled with history
    try {
      const existing = JSON.parse(await readFile(pageFile, 'utf8'));
      if (existing.historyFetched) return 'skipped';
      // Page exists but lacks history — fall through to re-fetch
    } catch {
      return 'skipped';
    }
  }

  try {
    const pages = await fetchPageBatch([titleEntry], includeHistory);
    const page = Object.values(pages)[0];

    if (!page || page.missing) {
      failures.push({ title: titleEntry.title, reason: 'missing', at: new Date().toISOString() });
      return 'missing';
    }

    const revisions = page.revisions ?? [];
    const currentRev = revisions[0] ?? null;
    const wikitext = currentRev?.content ?? currentRev?.slots?.main?.content ?? '';
    const contentHash = sha256hex(wikitext);
    const pulledAt = new Date().toISOString();

    const record = {
      schema: 'boxfire.wiki-page/v1',
      source: SOURCE_ID,
      world: WORLD,
      pulledAt,
      pageId: page.pageid ?? titleEntry.id,
      title: page.title ?? titleEntry.title,
      slug,
      sha256: contentHash,
      wikitext,
      categories: (page.categories ?? []).map((c) => c.title.replace(/^Category:/, '')),
      links: (page.links ?? []).map((l) => l.title),
      media: (page.images ?? []).map((i) => i.title.replace(/^File:/, '')),
      revision: currentRev ? {
        revid: currentRev.revid,
        parentid: currentRev.parentid,
        timestamp: currentRev.timestamp,
        user: currentRev.user,
      } : null,
      ...(includeHistory ? { historyFetched: true } : {}),
      ...(includeHistory && revisions.length > 1 ? {
        revisionHistory: revisions.slice(1).map((r) => ({
          revid: r.revid,
          parentid: r.parentid,
          timestamp: r.timestamp,
          user: r.user,
          contentHash: r.content ? sha256hex(r.content) : null,
        })),
      } : {}),
    };

    await atomicJson(pageFile, record);

    const receipt = {
      schema: 'boxfire.ingest-receipt/v1',
      source: SOURCE_ID,
      world: WORLD,
      action: 'pull-wiki-page',
      pulledAt,
      pageId: record.pageId,
      title: record.title,
      slug,
      sha256: contentHash,
      wordCount: wikitext ? wikitext.split(/\s+/u).length : 0,
      categoryCount: record.categories.length,
      linkCount: record.links.length,
      mediaCount: record.media.length,
      originalCopied: false,
    };

    await atomicJson(receiptFile, receipt);
    return 'ok';

  } catch (err) {
    failures.push({ title: titleEntry.title, reason: err.message, at: new Date().toISOString() });
    console.warn(`[fail] "${titleEntry.title}": ${err.message}`);
    return 'fail';
  }
}

// ── Phase 3: write manifest ────────────────────────────────────────────────────

async function writeManifest(titles, failures, startedAt) {
  const manifest = {
    schema: 'boxfire.ingest-manifest/v1',
    source: SOURCE_ID,
    world: WORLD,
    completedAt: new Date().toISOString(),
    startedAt,
    pageCount: titles.length,
    failureCount: failures.length,
    includeHistory: INCLUDE_HISTORY,
    wikiBaseUrl: 'https://wheeloftime.fandom.com',
    apiEndpoint: WIKI_API,
    failures: failures.slice(0, 100),
  };
  await atomicJson(MANIFEST_PATH, manifest);
  console.log(`[manifest] written — ${manifest.pageCount} pages, ${manifest.failureCount} failures`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`\n[boxfire] WoT Fandom ingest — ${startedAt}`);
  console.log(`[boxfire] flags: resume=${RESUME} include-history=${INCLUDE_HISTORY}`);

  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(RECEIPTS_DIR, { recursive: true });

  const checkpoint = RESUME ? await readJsonOrNull(CHECKPOINT_PATH) : null;
  if (RESUME && checkpoint) {
    console.log(`[resume] checkpoint loaded — ${checkpoint.titles?.length ?? 0} titles enumerated`);
  } else if (RESUME && !checkpoint) {
    console.log(`[resume] no checkpoint found — starting from scratch`);
  }

  const failures = [];

  // Phase 1
  const titles = await enumerateTitles(checkpoint);

  // Phase 2
  let done = 0, skipped = 0, failed = 0;
  for (let i = 0; i < titles.length; i += FETCH_BATCH) {
    const batch = titles.slice(i, i + FETCH_BATCH);
    for (const entry of batch) {
      const result = await fetchAndSave(entry, INCLUDE_HISTORY, failures);
      if (result === 'ok') done++;
      else if (result === 'skipped') skipped++;
      else failed++;
    }
    const total = done + skipped + failed;
    process.stdout.write(`\r[fetch] ${total}/${titles.length} (done=${done} skipped=${skipped} fail=${failed})   `);
    await sleep(RATE_DELAY_MS);
  }
  process.stdout.write('\n');

  // Failures log
  if (failures.length) {
    await atomicJson(FAILURES_PATH, { schema: 'boxfire.failures/v1', source: SOURCE_ID, pulledAt: startedAt, failures });
    console.log(`[failures] ${failures.length} failures logged to ${FAILURES_PATH}`);
  }

  // Phase 3
  await writeManifest(titles, failures, startedAt);

  console.log(`\n[boxfire] done — ${done} fetched, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error('\n[boxfire] fatal error:', err);
  process.exit(1);
});
