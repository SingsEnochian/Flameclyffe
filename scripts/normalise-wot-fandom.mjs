#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const DEFAULT_ROOT = 'canon/taaveren-vaen/wot-fandom';
const args = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(args.root || process.env.WOT_INGEST_ROOT || DEFAULT_ROOT);
const manifest = JSON.parse(await readFile(path.join(ROOT, 'ingest.manifest.json'), 'utf8'));
const OVERLAY_FILE = path.resolve(ROOT, '..', 'project-overlay.json');
const RAW_FILE = path.join(ROOT, manifest.outputs.raw_pages);
const PAGE_INDEX_FILE = path.join(ROOT, manifest.outputs.page_index);
const ENTITY_FILE = path.join(ROOT, manifest.outputs.entities);
const RELATIONSHIP_FILE = path.join(ROOT, manifest.outputs.relationships);
const TIMELINE_FILE = path.join(ROOT, manifest.outputs.timeline);
const CATEGORY_FILE = path.join(ROOT, manifest.outputs.categories);
const REDIRECT_FILE = path.join(ROOT, manifest.outputs.redirects);
const DOSSIER_DIR = path.join(ROOT, manifest.outputs.dossiers);
const RECEIPT_DIR = path.join(ROOT, manifest.outputs.receipts);
const BUNDLE_FILE = path.join(ROOT, manifest.arcsweep.import_bundle);
const NORMALISED_DIR = path.dirname(ENTITY_FILE);

function parseArgs(argv) {
  const parsed = { root: null, allowPartial: false };
  for (const arg of argv) {
    if (arg === '--allow-partial') parsed.allowPartial = true;
    else if (arg.startsWith('--root=')) parsed.root = arg.slice('--root='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

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

async function atomicJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function latestReceipt(prefix) {
  const files = (await readdir(RECEIPT_DIR))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .sort()
    .reverse();
  for (const name of files) {
    const receipt = JSON.parse(await readFile(path.join(RECEIPT_DIR, name), 'utf8'));
    if (receipt.status === 'complete' || (args.allowPartial && receipt.status === 'partial')) {
      return { name, receipt };
    }
  }
  throw new Error(`No ${args.allowPartial ? 'complete or partial' : 'complete'} crawl receipt found.`);
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'untitled';
}

function stripWikitext(value) {
  return String(value || '')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<ref\b[^>]*>[^]*?<\/ref>/gi, ' ')
    .replace(/<ref\b[^>]*\/>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, ' ')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, ' ')
    .replace(/'{2,5}/g, '')
    .replace(/^={2,}.*?={2,}$/gm, ' ')
    .replace(/[|{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSummary(content) {
  const withoutTemplates = String(content || '')
    .replace(/^\s*\{\{[^]*?^\}\}\s*/m, '')
    .replace(/^\s*__\w+__\s*$/gm, '');
  const paragraphs = withoutTemplates
    .split(/\n\s*\n/)
    .map(stripWikitext)
    .filter((paragraph) => paragraph.length >= 40 && !paragraph.startsWith('Category:'));
  return paragraphs.slice(0, 2).join(' ').slice(0, 1200);
}

function extractInfobox(content) {
  const lines = String(content || '').split('\n').slice(0, 180);
  const result = {};
  for (const line of lines) {
    const match = line.match(/^\s*\|\s*([^=|]{1,60})\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const key = slugify(match[1]).replaceAll('-', '_');
    const value = stripWikitext(match[2]).slice(0, 500);
    if (key && value && !(key in result)) result[key] = value;
  }
  return result;
}

const TYPE_RULES = [
  ['character', /characters?|people|humans?|aiel|aes sedai|forsaken|darkfriends?/i],
  ['location', /locations?|cities|towns|villages|geography|lands|stedding/i],
  ['nation', /nations?|countries|kingdoms?/i],
  ['organisation', /organizations?|organisations?|societies|orders|armies|military/i],
  ['culture', /cultures?|peoples|customs|traditions/i],
  ['book', /books?|novels?|publications/i],
  ['chapter', /chapters?/i],
  ['event', /events?|battles|wars|history/i],
  ['artifact', /objects?|artifacts?|ter'angreal|angreal|sa'angreal/i],
  ['weapon', /weapons?/i],
  ['creature', /creatures?|animals|shadowspawn/i],
  ['ability', /abilities|talents|powers/i],
  ['channeling_concept', /channeling|one power|weaves|saidin|saidar/i],
  ['old_tongue_term', /old tongue|language|words|phrases/i],
  ['prophecy', /prophecies|prophecy|foretellings/i],
  ['timeline_marker', /timeline|dates|years|ages/i],
  ['calendar_term', /calendar|months|holidays|festivals/i],
];

function inferTypes(page) {
  const haystack = `${page.title}\n${page.categories.join('\n')}`;
  const types = TYPE_RULES.filter(([, rule]) => rule.test(haystack)).map(([type]) => type);
  return types.length ? [...new Set(types)] : ['source_note'];
}

function isTimelineCandidate(page, types) {
  const haystack = `${page.title}\n${page.categories.join('\n')}`;
  return types.includes('event')
    || types.includes('timeline_marker')
    || /timeline|age of legends|breaking|war|battle|year|history/i.test(haystack);
}

const { name: crawlReceiptName } = await latestReceipt('crawl-');
const pageIndexDocument = JSON.parse(await readFile(PAGE_INDEX_FILE, 'utf8'));
const titleToId = new Map(
  pageIndexDocument.pages
    .filter((page) => page.namespace === 0 || page.ns === 0)
    .map((page) => [page.title, `wot-fandom:page:${page.pageid}`]),
);
const overlay = JSON.parse(await readFile(OVERLAY_FILE, 'utf8'));

await rm(NORMALISED_DIR, { recursive: true, force: true });
await rm(DOSSIER_DIR, { recursive: true, force: true });
await rm(path.dirname(BUNDLE_FILE), { recursive: true, force: true });
await Promise.all([
  mkdir(NORMALISED_DIR, { recursive: true }),
  mkdir(DOSSIER_DIR, { recursive: true }),
  mkdir(path.dirname(BUNDLE_FILE), { recursive: true }),
]);
await Promise.all([
  writeFile(ENTITY_FILE, ''),
  writeFile(RELATIONSHIP_FILE, ''),
  writeFile(TIMELINE_FILE, ''),
]);

const categories = new Map();
const redirects = [];
const seenPageIds = new Set();
let entities = 0;
let relationships = 0;
let timelineClaims = 0;
let sourcePages = 0;

const input = readline.createInterface({
  input: createReadStream(RAW_FILE, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const line of input) {
  if (!line.trim()) continue;
  const page = JSON.parse(line);
  if (seenPageIds.has(page.page_id)) continue;
  seenPageIds.add(page.page_id);
  sourcePages += 1;

  for (const category of page.categories || []) {
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(page.page_id);
  }
  if (page.redirect) {
    redirects.push({
      page_id: page.page_id,
      alias: page.canonical_title,
      source_url: page.source_url,
      target: page.links?.find((link) => link.ns === 0)?.title || null,
    });
  }

  if (page.namespace !== 0 || !page.canon_promotable || page.redirect) continue;

  const entityId = `wot-fandom:page:${page.page_id}`;
  const types = inferTypes(page);
  const entity = {
    schema: 'hearthgate.canon-entity.v1',
    entity_id: entityId,
    canonical_name: page.canonical_title,
    aliases: [],
    primary_type: types[0],
    type_candidates: types,
    house: 'wheel-of-time-canon',
    continuity: 'book-canon-reference',
    classification: 'secondary-canon-reference',
    spoiler_scope: manifest.canon_policy.spoiler_scope,
    summary: extractSummary(page.content),
    attributes: extractInfobox(page.content),
    categories: page.categories,
    images: page.images,
    source: {
      ingest_id: manifest.ingest_id,
      page_id: page.page_id,
      page_url: page.source_url,
      revision: page.revision,
      content_sha256: page.content_sha256,
      attribution: page.attribution,
      crawl_receipt: crawlReceiptName,
    },
    project_overlay: null,
  };
  await writeFile(ENTITY_FILE, `${JSON.stringify(entity)}\n`, { flag: 'a' });
  entities += 1;

  const dossierPath = path.join(
    DOSSIER_DIR,
    String(page.page_id % 100).padStart(2, '0'),
    `${page.page_id}-${slugify(page.canonical_title)}.json`,
  );
  await atomicJson(dossierPath, entity);

  for (const link of page.links || []) {
    if (link.ns !== 0) continue;
    const targetId = titleToId.get(link.title);
    if (!targetId || targetId === entityId) continue;
    const relationship = {
      schema: 'hearthgate.canon-relationship.v1',
      relationship_id: hash(`${entityId}|references|${targetId}`).slice(0, 32),
      source_entity_id: entityId,
      relation: 'references',
      target_entity_id: targetId,
      target_title: link.title,
      continuity: 'book-canon-reference',
      provenance: {
        source_page_id: page.page_id,
        source_revision_id: page.revision?.revid || null,
        crawl_receipt: crawlReceiptName,
      },
    };
    await writeFile(RELATIONSHIP_FILE, `${JSON.stringify(relationship)}\n`, { flag: 'a' });
    relationships += 1;
  }

  if (isTimelineCandidate(page, types)) {
    const timeline = {
      schema: 'hearthgate.timeline-claim.v1',
      claim_id: hash(`timeline|${entityId}`).slice(0, 32),
      entity_id: entityId,
      label: page.canonical_title,
      temporal_expression: null,
      confidence: 0.25,
      status: 'requires-primary-text-review',
      source: {
        page_id: page.page_id,
        page_url: page.source_url,
        revision_id: page.revision?.revid || null,
      },
    };
    await writeFile(TIMELINE_FILE, `${JSON.stringify(timeline)}\n`, { flag: 'a' });
    timelineClaims += 1;
  }
}

const categoryDocument = {
  schema: 'hearthgate.canon-category-index.v1',
  ingest_id: manifest.ingest_id,
  generated_at: new Date().toISOString(),
  categories: Object.fromEntries(
    [...categories.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, pageIds]) => [name, [...new Set(pageIds)].sort((a, b) => a - b)]),
  ),
};
await atomicJson(CATEGORY_FILE, categoryDocument);
await atomicJson(REDIRECT_FILE, {
  schema: 'hearthgate.canon-redirect-index.v1',
  ingest_id: manifest.ingest_id,
  generated_at: new Date().toISOString(),
  redirects,
});

const normalisationReceipt = {
  schema: 'hearthgate.canon-normalisation-receipt.v1',
  receipt_id: randomUUID(),
  status: 'complete',
  ingest_id: manifest.ingest_id,
  source_crawl_receipt: crawlReceiptName,
  generated_at: new Date().toISOString(),
  source_pages: sourcePages,
  entities,
  relationships,
  timeline_claims: timelineClaims,
  redirects: redirects.length,
  categories: categories.size,
  outputs: {
    entities: { path: manifest.outputs.entities, sha256: await hashFile(ENTITY_FILE) },
    relationships: { path: manifest.outputs.relationships, sha256: await hashFile(RELATIONSHIP_FILE) },
    timeline: { path: manifest.outputs.timeline, sha256: await hashFile(TIMELINE_FILE) },
    categories: { path: manifest.outputs.categories, sha256: await hashFile(CATEGORY_FILE) },
    redirects: { path: manifest.outputs.redirects, sha256: await hashFile(REDIRECT_FILE) },
  },
  limitations: [
    'Wiki categories and links seed entity and relationship candidates; they do not replace primary-text verification.',
    'Timeline candidates are explicitly review-gated and carry no inferred date unless present in later primary-source work.',
    'Ta’veren Vaen remains a separately classified project overlay.',
  ],
};
const normalisationReceiptName = `normalise-${Date.now()}.json`;
await atomicJson(path.join(RECEIPT_DIR, normalisationReceiptName), normalisationReceipt);

const bundle = {
  schema: 'hearthgate.arcsweep-canon-bundle.v1',
  bundle_id: 'taaveren-vaen.wot-canon-and-overlay.v1',
  generated_at: new Date().toISOString(),
  world_key: manifest.world_key,
  house: {
    foundation: 'wheel-of-time-canon',
    overlay: 'taaveren-vaen',
    relationship: 'later-turning',
    hearthweave_bind: 'preserve-both',
  },
  canon_foundation: {
    classification: manifest.arcsweep.classification,
    source: manifest.source,
    crawl_receipt: crawlReceiptName,
    normalisation_receipt: normalisationReceiptName,
    counts: {
      source_pages: sourcePages,
      entities,
      relationships,
      timeline_claims: timelineClaims,
    },
    data: {
      entities: manifest.outputs.entities,
      relationships: manifest.outputs.relationships,
      timeline: manifest.outputs.timeline,
      dossiers: manifest.outputs.dossiers,
      categories: manifest.outputs.categories,
      redirects: manifest.outputs.redirects,
    },
  },
  project_overlay: overlay,
  sensory_identity: {
    tone_profile: 'resonance/worlds/taaveren-vaen-v0.1.json',
    dual_aspect: {
      anchor_voice: 'wheel-of-time-canon',
      living_voice: 'taaveren-vaen',
    },
  },
  canon_law: {
    overwrite_source_canon: false,
    provenance_required: true,
    project_overlay_separate: true,
  },
};
await atomicJson(BUNDLE_FILE, bundle);

console.log(JSON.stringify({
  status: 'complete',
  source_pages: sourcePages,
  entities,
  relationships,
  timeline_claims: timelineClaims,
  bundle: path.relative(process.cwd(), BUNDLE_FILE),
}, null, 2));
