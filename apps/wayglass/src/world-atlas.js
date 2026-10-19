// Read-only discovery projection of the existing ArcSweep world/canon sources.
// This is not a second canon registry, a live-world entrance, or a data import.
import { HOUSE_DR_BUNDLE } from '../../arcsweep/src/house-dr-bundle.js';
import ARC_CANON_REGISTRY from '../../arcsweep/public/canon/registry.json';
import STEINS_GATE_PACK from '../../arcsweep/public/canon/steins-gate/canon-pack.json';
import RECREATORS_PACK from '../../arcsweep/public/canon/recreators/canon-pack.json';
import SUNDANCER_WORLD from '../../arcsweep/worlds/star-trek-sundancer.world.json';
import STARSONG_WORLD from '../../arcsweep/worlds/equestria-starsong.world.json';

export const WAYGLASS_WORLD_ATLAS_SCHEMA = 'wayglass.world-atlas-projection/v0.1';
const ID = /^[a-z0-9][a-z0-9:._-]{0,127}$/i;
const localImports = new Map();

const requiredDestinations = Object.freeze([
  Object.freeze({ world_id:'stargate', name:'Stargate', related:'Stargate franchise / continuity not yet specified' }),
  Object.freeze({ world_id:'sanctuary', name:'Sanctuary', related:'Exact logged world and canon not yet recovered' }),
  Object.freeze({ world_id:'the-never-ending-story', name:'The Never Ending Story', related:'Story/book/film variant not yet specified' }),
  Object.freeze({ world_id:'the-last-unicorn', name:'The Last Unicorn', related:'Book/film or owner-world variant not yet specified' }),
]);

const relatedCanon = Object.freeze({
  'steins-gate': Object.freeze([
    'Steins;Gate 0 — related continuity, separate chronology',
    'Science Adventure crossover titles — individually attributed references only',
    'World lines, divergence, attractor fields, convergence, Reading Steiner, Operation Skuld and Amadeus',
  ]),
  'recreators': Object.freeze(['Altair and the Holopsicon — source canon separate from ArcSweep mechanics analogy']),
  'starsong': Object.freeze(['Equestria: Starsong — separate runtime world file, not auto-merged']),
  'equestria-starsong': Object.freeze(['Starsong: Friendship Is Magic — separate House-world script, not auto-merged']),
});

const freeze = x => Object.freeze(x);
const valid = x => typeof x === 'string' && ID.test(x);
function candidate(entry) {
  if (!valid(entry.world_id)) throw new Error('World Atlas found an invalid world identifier.');
  return freeze({
    schema: WAYGLASS_WORLD_ATLAS_SCHEMA,
    world_id: entry.world_id,
    name: entry.name,
    kind: entry.kind || 'world',
    summary: entry.summary || '',
    source_status: entry.source_status,
    source_refs: freeze([...(entry.source_refs || [])]),
    related_canon: freeze([...(entry.related_canon || relatedCanon[entry.world_id] || [])]),
    canon_status: entry.canon_status || 'unknown',
    transport_status:'navigation-only',
    authority:'discovery-projection-not-canon',
    source_revision:entry.source_revision || null,
  });
}

export function projectWayglassWorldAtlas() {
  const items = new Map();
  const add = entry => {
    const existing = items.get(entry.world_id);
    if (!existing) { items.set(entry.world_id, candidate(entry)); return; }
    // A second source adds evidence, but never silently replaces a world.
    items.set(entry.world_id, candidate({
      ...existing,
      source_refs: [...new Set([...existing.source_refs, ...(entry.source_refs || [])])],
      related_canon: [...new Set([...existing.related_canon, ...(entry.related_canon || [])])],
    }));
  };
  for (const world of HOUSE_DR_BUNDLE.worlds) {
    add({
      world_id:world.sourceKey, name:world.name, kind:world.kind,
      summary:world.description,
      source_status:'source-linked',
      source_refs:['apps/arcsweep/src/house-dr-bundle.js', 'hearthweave-notion-dr-library:' + world.sourceKey],
      canon_status:world.canonOverlay ? 'reviewed-overlay-present' : 'source-script-status-varies',
      source_revision:world.revisedAt || HOUSE_DR_BUNDLE.version,
    });
  }
  const canonPacks = new Map([
    ['steins-gate', STEINS_GATE_PACK],
    ['recreators', RECREATORS_PACK],
  ]);
  for (const p of ARC_CANON_REGISTRY.packages) {
    const pack = canonPacks.get(p.id);
    if (!pack) continue;
    add({
      world_id:pack.world.id, name:pack.world.name, kind:'canon-library',
      summary:p.summary,
      source_status:'source-linked',
      source_refs:['apps/arcsweep/public/canon/' + p.id + '/canon-pack.json'],
      canon_status:'reference-only',
      source_revision:pack.updatedAt,
      related_canon:relatedCanon[p.id] || [],
    });
  }
  for (const world of [SUNDANCER_WORLD, STARSONG_WORLD]) {
    add({
      world_id:world.id, name:world.name, kind:world.kind,
      summary:world.summary,
      source_status:'source-linked',
      source_refs:['apps/arcsweep/worlds/' + world.id + '.world.json'],
      canon_status:world.status || 'working',
    });
  }
  for (const world of requiredDestinations) {
    if (!items.has(world.world_id)) add({
      ...world, kind:'owner-requested-destination',
      summary:world.related,
      source_status:'awaiting-source-reconciliation',
      source_refs:['owner-request:2026-10-19'],
      canon_status:'not-imported',
    });
  }
  return freeze([...items.values()]);
}

export const WAYGLASS_SOURCE_WORLDS = projectWayglassWorldAtlas();

export function listWayglassAtlasWorlds() {
  return freeze([...WAYGLASS_SOURCE_WORLDS, ...localImports.values()]);
}

export function importArcSweepWorldNavigationExport(input) {
  // The owner must explicitly select an export. Read no private dossiers, records,
  // histories, relationships, keys, routes or continuation state.
  const list = Array.isArray(input) ? input
    : Array.isArray(input?.worlds) ? input.worlds
      : Array.isArray(input?.state?.worlds) ? input.state.worlds
        : input && typeof input === 'object' && valid(input.id) ? [input] : null;
  if (!list || list.length > 250) throw new TypeError('Expected a world or a bounded ArcSweep worlds array (max 250).');
  let added=0,conflicts=0,rejected=0;
  const registered = new Set(WAYGLASS_SOURCE_WORLDS.map(item => item.world_id));
  for (const record of list) {
    const id=record?.id || record?.world_id;
    const name=record?.name;
    if (!valid(id) || typeof name !== 'string' || !name.trim() || name.length > 180) { rejected++; continue; }
    if (registered.has(id) || localImports.has(id)) { conflicts++; continue; }
    localImports.set(id,candidate({
      world_id:id, name:name.trim(), kind:typeof record.kind === 'string' ? record.kind.slice(0,100) : 'local-world',
      summary:'Owner-selected ArcSweep navigation export. Private world content was not imported.',
      source_status:'owner-session-only', source_refs:['owner-selected-local-export'],
      canon_status:'not-imported',
    }));
    added++;
  }
  return freeze({ schema:'wayglass.world-atlas-intake-receipt/v0.1', added,conflicts,rejected,imported_private_dossiers:0,persisted:false,provider_sent:false,authority:'navigation-only' });
}

export function clearWayglassAtlasImports() {localImports.clear();}
