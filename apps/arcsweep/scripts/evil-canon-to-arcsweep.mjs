#!/usr/bin/env node
/**
 * evil-canon-to-arcsweep.mjs
 *
 * Converts evil-canon-ingest-kit output into an Arcsweep-importable state JSON.
 * Merges with an existing Arcsweep state so existing worlds are preserved.
 *
 * Usage:
 *   node apps/arcsweep/scripts/evil-canon-to-arcsweep.mjs \
 *     --ingest "<path/to/output/evil-canon-ingest>" \
 *     [--state  "<path/to/arcsweep-state.json>"]   (default: %APPDATA%/Hearthgate/Arcsweep/state/arcsweep-state.json)
 *     [--out    "<output.json>"]                    (default: evil-canon-arcsweep-import.json)
 */

import fs from 'node:fs';
import path from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const APPDATA = process.env.APPDATA
  || path.join(process.env.USERPROFILE || process.env.HOME || '~', 'AppData', 'Roaming');
const DEFAULT_STATE = path.join(APPDATA, 'Hearthgate', 'Arcsweep', 'state', 'arcsweep-state.json');

const ingestDir = flag('--ingest');
const statePath = flag('--state') || DEFAULT_STATE;
const outPath   = flag('--out')   || 'evil-canon-arcsweep-import.json';

if (!ingestDir) {
  console.error([
    'Usage: node evil-canon-to-arcsweep.mjs --ingest <ingest-output-dir>',
    '       [--state <arcsweep-state.json>] [--out <output.json>]',
    '',
    'Example:',
    '  node apps/arcsweep/scripts/evil-canon-to-arcsweep.mjs \\',
    '    --ingest "C:/Users/light/Downloads/Coding Projects/Hearthweave Protocol/Terra Aeterna/evil-canon-ingest-kit/evil-canon-ingest-kit/output/evil-canon-ingest"',
  ].join('\n'));
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function readDossiers(type) {
  const dir = path.join(ingestDir, 'normalized', 'dossiers', type);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJson(path.join(dir, f)))
    .filter(Boolean);
}

function truncate(str, max = 3000) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '\n\n[truncated — see source dossier for full text]';
}

// ── Load inputs ───────────────────────────────────────────────────────────────
const existingState = fs.existsSync(statePath) ? readJson(statePath) : null;
if (existingState) {
  console.log(`Loaded existing state: ${existingState.worlds?.length ?? 0} world(s), v${existingState.version}`);
} else {
  console.log('No existing state at default path — will produce standalone import.');
  console.log(`(Checked: ${statePath})`);
  console.log('Pass --state <path> if your state file is elsewhere.\n');
}

const characters = readDossiers('character');
const demons     = readDossiers('demon-entity');
const episodes   = readDossiers('episode');
const seasons    = readDossiers('season');

console.log(`Dossiers loaded: ${characters.length} characters · ${demons.length} demon-entities · ${episodes.length} episodes · ${seasons.length} seasons`);

// ── Evil Canon world ──────────────────────────────────────────────────────────
const WORLD_ID = 'evil-canon-reference-world';
const now = new Date().toISOString();

const evilWorld = {
  id: WORLD_ID,
  name: 'Evil · Canon Reference',
  kind: 'Canon Reference',
  description:
    'Source canon reference world for the television series Evil (CBS/Paramount+, 2019–2024). ' +
    'Imported from evilseries.fandom.com via evil-canon-ingest-kit. ' +
    'Characters and entities are in Relationships · Episodes and seasons are in Timeline.',
  history:
    `Seasons: ${seasons.map(s => s.name).filter(Boolean).join(', ')}.\n\n` +
    `Imported ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} from evilseries.fandom.com.`,
  rules:
    'This world is a read-only canon reference, not a playable world. Records reflect the TV source ' +
    'material with Extracted/Unreviewed QA status from the ingest. Promote individual entries to canon ' +
    'via the Non-Canon Ingest room review process before treating them as established fact.',
  surface: {
    type: 'journal',
    name: 'Evil Canon Index',
    appearance:
      'A worn leather codex cataloguing the supernatural cases investigated by the diocesan assessment team. ' +
      'Its pages hold character dossiers, case files, entity descriptions, and episode records.',
    summonMode: 'phrase',
    summonCue: 'Open the Evil Canon Index',
    veilEnabled: true,
    visibility: 'only-me',
    approvedPeople: '',
  },
  time: {
    wakingMinutes: 60,
    worldMinutes: 60,
    pauseWhenAway: true,
    arrivalDate: '2019-09-26',
    arrivalTime: '',
  },
  arrival: {
    location: 'Archdiocese of New York',
    context:
      'You are consulting on cases for the Catholic Church\'s diocesan assessment team alongside ' +
      'Dr. Kristen Bouchard, Father David Acosta, and Ben Shakir. Cases concern miracles, possessions, ' +
      'and the activities of a demonic hierarchy with interests in a select bloodline.',
    memories: '',
    orientation: 'I arrive calm, oriented, and able to recognise the people, place, date, and immediate situation.',
    wrpProfileId: '',
    wrpLabel: '',
    wrpRunaUrl: '',
  },
  identity: { name: '', pronouns: '', age: '', roles: '', form: '', sensorySignature: '', appearance: '', accessibility: '', notes: '' },
  competencies: { languages: 'English · Tibetan (Andy Bouchard)', worldSystems: 'Catholic canon · Demonic hierarchy · Paranormal assessment protocol', movement: '', socialContext: '', accessibility: '' },
  safetyWeave: {
    general: 'I remain safe, capable of choosing, and able to return by intention.',
    exclusions: '',
    returnAlwaysAvailable: true,
    anchorIntentGated: true,
  },
  recall: {
    onArrival: 'Relevant world memories and context are available without confusion.',
    onReturn: 'The Continuity Log preserves what I choose to carry forward.',
    selectiveForgetting: '',
  },
  companion: { enabled: false, name: '', form: '', role: '', communication: '', agency: '', notes: '' },
  theme: {
    background: '#0b0f0e',
    panel: '#18221f',
    accent: '#d8b56a',
    secondary: '#8ebca6',
    text: '#f0eadb',
    backgroundImage: '',
    lowMotion: false,
  },
  applets: [],
  createdAt: now,
  updatedAt: now,
};

// ── Map characters → relationships ────────────────────────────────────────────
function mapRelStatus(infoboxStatus) {
  if (!infoboxStatus) return 'Unknown';
  const s = String(infoboxStatus).toLowerCase();
  if (s.includes('alive') || s.includes('active')) return 'Active';
  if (s.includes('deceased') || s.includes('dead') || s.includes('killed')) return 'Ended';
  return 'Unknown';
}

function buildCharacterRecord(d) {
  const categories = (d.categories || []).filter(c => !['Characters', 'Males', 'Females'].includes(c));
  const role = [d.infobox?.occupation, d.ontology, categories.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  const bio   = truncate([d.sections?.['Character Biography'], d.sections?.['Personality']].filter(Boolean).join('\n\n'));
  return {
    id: `evil-char-${d.slug || uid('char')}`,
    worldId: WORLD_ID,
    title: d.name,
    relationship: role || 'Character',
    status: mapRelStatus(d.infobox?.status),
    communication: d.infobox?.played ? `Portrayed by: ${d.infobox.played}` : '',
    boundaries: d.infobox?.relatives ? `Relatives: ${d.infobox.relatives}` : '',
    details: bio,
    tags: 'evil-canon character',
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildDemonRecord(d) {
  const categories = (d.categories || []).slice(0, 3).join(', ');
  const body = Object.entries(d.sections || {})
    .filter(([k]) => k !== 'References')
    .map(([k, v]) => v ? `**${k}**\n${v}` : '')
    .filter(Boolean)
    .join('\n\n');
  return {
    id: `evil-demon-${d.slug || uid('demon')}`,
    worldId: WORLD_ID,
    title: d.name,
    relationship: `${d.ontology || 'Demon/Entity'} · ${categories}`,
    status: 'Unknown',
    communication: '',
    boundaries: '',
    details: truncate(body),
    tags: 'evil-canon demon-entity',
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Map seasons/episodes → timeline ──────────────────────────────────────────
function buildSeasonRecord(d) {
  const premiere = d.infobox?.premiere || d.infobox?.airdate || '';
  const ended    = d.infobox?.end || '';
  const period   = [premiere, ended].filter(Boolean).join(' – ');
  const body = [
    d.sections?.['Overview'] || d.sections?.['Plot'] || '',
    `Episodes: ${d.infobox?.episodes || '?'} · Network: ${d.infobox?.network || 'CBS/Paramount+'}`,
  ].filter(Boolean).join('\n\n');
  return {
    id: `evil-season-${d.slug || uid('season')}`,
    worldId: WORLD_ID,
    title: d.name || 'Evil Season',
    date: period,
    kind: 'Era',
    details: truncate(body),
    tags: 'evil-canon season',
    createdAt: now,
    updatedAt: now,
  };
}

function buildEpisodeRecord(d) {
  const s      = String(d.infobox?.season || '?').padStart(2, '0');
  const ep     = String(d.infobox?.ep_num || '?').padStart(2, '0');
  const air    = d.infobox?.airdate || '';
  const writer = d.infobox?.writer   || 'Unknown';
  const dir    = d.infobox?.director || 'Unknown';
  const rt     = d.infobox?.runtime  || '?';
  const synopsis = d.sections?.['Full summary'] || d.sections?.['Synopsis'] || d.sections?.['Plot'] || '';
  const meta   = `Director: ${dir} · Writer: ${writer} · Runtime: ${rt}`;
  return {
    id: `evil-ep-${d.slug || uid('ep')}`,
    worldId: WORLD_ID,
    title: `S${s}E${ep} · ${d.name}`,
    date: air,
    kind: 'Event',
    details: [meta, truncate(synopsis)].filter(Boolean).join('\n\n'),
    tags: `evil-canon episode season-${d.infobox?.season || '?'}`,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Build records ─────────────────────────────────────────────────────────────
const charRecords   = characters.map(buildCharacterRecord);
const demonRecords  = demons.map(buildDemonRecord);
const seasonRecords = seasons.map(buildSeasonRecord);
const epRecords     = episodes.map(buildEpisodeRecord);

// ── Merge with existing state ─────────────────────────────────────────────────
const EMPTY_RECORDS = {
  timeline: [], ingest: [], relationships: [], scenarios: [],
  calendar: [], diary: [], playlists: [], visualisations: [],
  wardrobe: [], outfits: [], belongings: [], places: [],
  'family-tree': [], 'photo-gallery': [],
};

let base;
if (existingState) {
  base = {
    ...existingState,
    records: { ...EMPTY_RECORDS, ...(existingState.records || {}) },
  };
} else {
  base = {
    version: '0.2.1',
    settings: {
      crLabel: 'Waking World', drLabel: 'Desired Reality', crMinutes: 60, drMinutes: 10080,
      returnAnchor: 'Notch', reduceMotion: false, largeText: false, highContrast: false, fontScale: 1,
    },
    worlds: [],
    activeWorldId: WORLD_ID,
    session: { active: false, startedAt: null, targetWorldId: null, targetWorld: '', intention: '', wakingMinutes: null, worldMinutes: null },
    scripts: [],
    continuity: [],
    manifestations: [],
    records: EMPTY_RECORDS,
    appearance: { name: '', form: '', sensorySignature: '', notes: '', updatedAt: now },
    returnHistory: [],
    houseBundles: [],
    provenance: { createdAt: now, updatedAt: now, storage: 'import' },
  };
}

// Add world if not present
if (!base.worlds.find(w => w.id === WORLD_ID)) {
  base.worlds.push(evilWorld);
  console.log('Added Evil Canon world to world registry.');
} else {
  console.log('Evil Canon world already present — skipping world creation.');
}

// Append records, skipping any IDs that already exist (idempotent)
function mergeRecords(existing, incoming) {
  const existingIds = new Set(existing.map(r => r.id));
  const fresh = incoming.filter(r => !existingIds.has(r.id));
  return [...existing, ...fresh];
}

const relBefore = base.records.relationships.length;
base.records.relationships = mergeRecords(base.records.relationships, [...charRecords, ...demonRecords]);
const relAdded = base.records.relationships.length - relBefore;

const tlBefore = base.records.timeline.length;
base.records.timeline = mergeRecords(base.records.timeline, [...seasonRecords, ...epRecords]);
const tlAdded = base.records.timeline.length - tlBefore;

base.provenance = { ...(base.provenance || {}), updatedAt: now };

// ── Write output ──────────────────────────────────────────────────────────────
fs.writeFileSync(outPath, JSON.stringify(base, null, 2), 'utf8');
const sizeKb = Math.round(fs.statSync(outPath).size / 1024);

console.log('');
console.log(`Output: ${outPath} (${sizeKb} KB)`);
console.log(`  Worlds total:        ${base.worlds.length}`);
console.log(`  Relationships added: ${relAdded} (${charRecords.length} characters + ${demonRecords.length} demon-entities)`);
console.log(`  Timeline added:      ${tlAdded} (${seasonRecords.length} seasons + ${epRecords.length} episodes)`);
console.log('');
console.log('Import into Arcsweep:');
console.log('  Settings & Recovery → Import archive → select the output file above.');
console.log('  A backup snapshot is created automatically before the import replaces state.');
console.log('  Run this script again into the same --out file to update without duplicating.');
