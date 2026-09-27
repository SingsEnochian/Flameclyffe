import { normaliseWorldId } from '../world-id-aliases.js';

export const CODEX_UNIVERSE_RECORD_SCHEMA = 'hearthweave.universe-record/v0.1';
export const CODEX_UNIVERSE_MAP_SCHEMA = 'hearthweave.universe-map/v0.1';

export const UNIVERSE_MAPPING_STATES = Object.freeze([
  'anchored',
  'mapped',
  'ingest-queued',
  'discovered',
]);

export const UNIVERSE_CANON_AUTHORITIES = Object.freeze([
  'empirical-observation',
  'project-canon',
  'private-author-canon',
  'derivative-canon',
  'unknown',
]);

const mappingStates = new Set(UNIVERSE_MAPPING_STATES);
const canonAuthorities = new Set(UNIVERSE_CANON_AUTHORITIES);

function strings(values = []) {
  return Object.freeze([
    ...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)),
  ]);
}

function defineUniverse({
  id,
  name,
  universeClass,
  mappingState = 'discovered',
  canonAuthority = 'unknown',
  worldIds = [],
  aliases = [],
  parentUniverseId = null,
  lineage = '',
  summary = '',
  sourceStatus = 'not-yet-ingested',
  notes = [],
} = {}) {
  const universeId = String(id || '').trim().toLowerCase();
  const label = String(name || '').trim();
  const kind = String(universeClass || '').trim();

  if (!universeId) throw new Error('CODEX_UNIVERSE: id is required');
  if (!label) throw new Error(`CODEX_UNIVERSE: name is required for ${universeId}`);
  if (!kind) throw new Error(`CODEX_UNIVERSE: universeClass is required for ${universeId}`);
  if (!mappingStates.has(mappingState)) throw new Error(`CODEX_UNIVERSE: invalid mappingState for ${universeId}`);
  if (!canonAuthorities.has(canonAuthority)) throw new Error(`CODEX_UNIVERSE: invalid canonAuthority for ${universeId}`);
  if (parentUniverseId && parentUniverseId === universeId) throw new Error(`CODEX_UNIVERSE: ${universeId} cannot parent itself`);

  const canonicalWorldIds = strings(worldIds.map((worldId) => normaliseWorldId(worldId) || worldId));
  return Object.freeze({
    schema: CODEX_UNIVERSE_RECORD_SCHEMA,
    id: universeId,
    name: label,
    universeClass: kind,
    mappingState,
    canonAuthority,
    worldIds: canonicalWorldIds,
    aliases: strings(aliases),
    parentUniverseId: parentUniverseId ? String(parentUniverseId).trim().toLowerCase() : null,
    lineage: String(lineage || '').trim(),
    summary: String(summary || '').trim(),
    sourceStatus: String(sourceStatus || '').trim(),
    notes: strings(notes),
  });
}

export const CODEX_UNIVERSES = Object.freeze([
  defineUniverse({
    id: 'terra-prime',
    name: 'Terra Prime · Our Universe',
    universeClass: 'waking-empirical-anchor',
    mappingState: 'anchored',
    canonAuthority: 'empirical-observation',
    worldIds: ['terra-prime', 'earth_prime'],
    aliases: ['Waking World', 'Our Universe', 'Earth Prime'],
    lineage: 'Reference frame. Authored universes may relate to it, but authored canon is never promoted into empirical history.',
    summary: 'Current-reality reference universe used by ArcSweep, Observer, DEEP, Terra Prime source ingest, and Bifrost reference-shore contracts.',
    sourceStatus: 'live-observation-and-receipted-ingest',
    notes: ['Hearthweave is the project topology spanning worlds; Terra Prime is the waking empirical anchor inside that topology.'],
  }),
  defineUniverse({
    id: 'terra-aeterna',
    name: 'Terra Aeterna',
    universeClass: 'authored-novelverse',
    mappingState: 'mapped',
    canonAuthority: 'private-author-canon',
    worldIds: ['terra-aeterna'],
    aliases: ['Terra Aeterna Novelverse'],
    summary: 'Established Hearthgate/ArcSweep authored universe with its own world profile, Bifrost endpoint, Runa/world-hum work, and manuscript provenance.',
    sourceStatus: 'partial-canon-already-present',
  }),
  defineUniverse({
    id: 'starsong',
    name: 'Starsong',
    universeClass: 'authored-derivative-world',
    mappingState: 'mapped',
    canonAuthority: 'derivative-canon',
    worldIds: ['equestria-starsong', 'starsong'],
    aliases: ['Friendship Is Magic / Starsong'],
    summary: 'Existing ArcSweep world identity and harmonic world reference. Source identity remains distinct from other worlds.',
    sourceStatus: 'partial-project-state',
  }),
  defineUniverse({
    id: 'taveren-vaen',
    name: 'Ta’veren Vaen',
    universeClass: 'authored-world',
    mappingState: 'mapped',
    canonAuthority: 'private-author-canon',
    worldIds: ['taveren-vaen', 'taaveren-vaen'],
    summary: 'Existing Hearthgate/world identity with a distinct world-hum and profile lineage.',
    sourceStatus: 'partial-project-state',
  }),
  defineUniverse({
    id: 'luna',
    name: 'Luna',
    universeClass: 'authored-world',
    mappingState: 'discovered',
    canonAuthority: 'private-author-canon',
    worldIds: ['luna'],
    summary: 'Named world identity already recognised by ArcSweep aliases and harmonic-world work.',
  }),
  defineUniverse({
    id: 'feather-and-flame',
    name: 'Feather and Flame',
    universeClass: 'authored-world',
    mappingState: 'discovered',
    canonAuthority: 'private-author-canon',
    worldIds: ['feather-and-flame'],
    summary: 'Existing ArcSweep world identity awaiting deeper canon mapping.',
  }),
  defineUniverse({
    id: 'sundancer',
    name: 'Sundancer',
    universeClass: 'authored-derivative-world',
    mappingState: 'discovered',
    canonAuthority: 'derivative-canon',
    worldIds: ['star-trek-sundancer', 'sundancer'],
    summary: 'Existing ArcSweep alias group for the Sundancer setting. Canon boundaries must remain distinct from source-franchise canon.',
  }),
  defineUniverse({
    id: 'kalladia',
    name: 'Kalladia · The Lines of Power',
    universeClass: 'authored-manuscript-universe',
    mappingState: 'discovered',
    canonAuthority: 'private-author-canon',
    worldIds: ['kalladia'],
    summary: 'Ancestral-corpus universe awaiting source-by-source mapping into the Universal Codex.',
    sourceStatus: 'ancestral-corpus-known',
  }),
  defineUniverse({
    id: 'amalthi-transition',
    name: 'The Amalthi Transition',
    universeClass: 'authored-manuscript-universe',
    mappingState: 'discovered',
    canonAuthority: 'private-author-canon',
    worldIds: ['amalthi-transition'],
    summary: 'Ancestral-corpus universe awaiting source-by-source mapping into the Universal Codex.',
    sourceStatus: 'ancestral-corpus-known',
  }),
  defineUniverse({
    id: 'epra-a-new-hope',
    name: 'Epra: A New Hope',
    universeClass: 'authored-colony-universe',
    mappingState: 'ingest-queued',
    canonAuthority: 'private-author-canon',
    worldIds: ['epra-a-new-hope', 'epra'],
    aliases: ['Epra', 'A New Hope'],
    lineage: 'Current Epra canon is mapped as its own authored universe. Destiny Weaves and Hope’s Crest are source lineages, not automatic truth inheritance.',
    summary: 'Current Epra project. Canon ingest is source-scoped and precedence-aware so current material can supersede or diverge from legacy Hope’s Crest and Destiny Weaves material without erasing ancestry.',
    sourceStatus: 'private-canon-ingest-manifest-ready',
  }),
]);

const byId = new Map(CODEX_UNIVERSES.map((universe) => [universe.id, universe]));

export function codexUniverse(universeId) {
  const id = String(universeId || '').trim().toLowerCase();
  if (!id) return null;
  return byId.get(id) || CODEX_UNIVERSES.find((universe) => universe.aliases.some((alias) => alias.toLowerCase() === id)) || null;
}

export function universeForWorldId(worldId) {
  const canonical = normaliseWorldId(worldId);
  if (!canonical) return null;
  return CODEX_UNIVERSES.find((universe) => universe.worldIds.includes(canonical)) || null;
}

export function codexUniverseMapSnapshot() {
  const counts = UNIVERSE_MAPPING_STATES.reduce((result, state) => {
    result[state] = CODEX_UNIVERSES.filter((universe) => universe.mappingState === state).length;
    return result;
  }, {});
  const edges = CODEX_UNIVERSES
    .filter((universe) => universe.parentUniverseId)
    .map((universe) => Object.freeze({
      from: universe.parentUniverseId,
      to: universe.id,
      relation: 'universe-lineage',
    }));
  return Object.freeze({
    schema: CODEX_UNIVERSE_MAP_SCHEMA,
    principle: 'Universe identity, canon lineage, and ingest provenance remain separate. Similarity never implies shared canon.',
    referenceUniverseId: 'terra-prime',
    count: CODEX_UNIVERSES.length,
    counts: Object.freeze(counts),
    universes: CODEX_UNIVERSES,
    edges: Object.freeze(edges),
  });
}

export function validateCodexUniverseMap(universes = CODEX_UNIVERSES) {
  const violations = [];
  const ids = new Set();
  for (const universe of universes || []) {
    if (universe?.schema !== CODEX_UNIVERSE_RECORD_SCHEMA) violations.push(`${universe?.id || 'unknown'}:invalid-schema`);
    if (!universe?.id || ids.has(universe.id)) violations.push(`${universe?.id || 'unknown'}:duplicate-or-missing-id`);
    if (universe?.id) ids.add(universe.id);
    if (!mappingStates.has(universe?.mappingState)) violations.push(`${universe?.id || 'unknown'}:invalid-mapping-state`);
    if (!canonAuthorities.has(universe?.canonAuthority)) violations.push(`${universe?.id || 'unknown'}:invalid-canon-authority`);
    if (!universe?.worldIds?.length) violations.push(`${universe?.id || 'unknown'}:missing-world-id`);
  }
  for (const universe of universes || []) {
    if (universe?.parentUniverseId && !ids.has(universe.parentUniverseId)) violations.push(`${universe.id}:dangling-parent`);
  }
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}
