export const COSMOLOGY_LINEAGE_SCHEMA = 'arcsweep.cosmology-lineage/v1';
export const DIVERGENCE_RECORD_SCHEMA = 'arcsweep.world-divergence/v1';
export const TEMPORAL_UNCERTAINTY_SCHEMA = 'arcsweep.temporal-uncertainty/v1';

export const COSMOLOGY_INHERITANCE_MODES = Object.freeze([
  Object.freeze({ id: 'shared-terra-prime', label: 'Shared with Terra Prime', meaning: 'Uses Terra Prime empirical cosmology unless world canon explicitly diverges.' }),
  Object.freeze({ id: 'branch', label: 'Branch', meaning: 'Inherits an ancestor cosmology to a named branch point, then diverges.' }),
  Object.freeze({ id: 'derived', label: 'Derived', meaning: 'Built from an ancestor cosmology with declared transformations.' }),
  Object.freeze({ id: 'independent', label: 'Independent', meaning: 'Has its own cosmological history and metaphysics.' }),
  Object.freeze({ id: 'unknown', label: 'Unknown', meaning: 'Cosmology has not yet been specified; no inheritance is assumed.' }),
]);

export const MULTIVERSE_MODEL_GALLERY = Object.freeze([
  Object.freeze({ id: 'inflationary', label: 'Inflationary domains', family: 'cosmology', status: 'hypothesis', empiricalStatus: 'not directly established', summary: 'Some eternal-inflation models produce causally separated reheated regions or pocket universes. Whether nature realises such a model is unknown.' }),
  Object.freeze({ id: 'everett', label: 'Everett / many-worlds', family: 'quantum-foundations', status: 'hypothesis', empiricalStatus: 'interpretation-dependent', summary: 'Unitary quantum evolution is interpreted as decohering into effectively non-interacting branches rather than undergoing fundamental collapse.' }),
  Object.freeze({ id: 'string-landscape', label: 'String landscape', family: 'high-energy-theory', status: 'hypothesis', empiricalStatus: 'unresolved', summary: 'Large families of metastable vacua are mathematically possible in some string constructions; physical realisation and selection remain unresolved.' }),
  Object.freeze({ id: 'brane', label: 'Brane / higher-dimensional cosmologies', family: 'high-energy-theory', status: 'hypothesis', empiricalStatus: 'unresolved', summary: 'Some models place observable cosmology on a lower-dimensional brane embedded in a higher-dimensional bulk.' }),
  Object.freeze({ id: 'cyclic', label: 'Cyclic / bouncing cosmologies', family: 'cosmology', status: 'hypothesis', empiricalStatus: 'constrained but unestablished', summary: 'Cosmic expansion may be preceded by contraction or repeated cycles in some models; no pre-Big-Bang history is established.' }),
  Object.freeze({ id: 'mathematical', label: 'Mathematical universe families', family: 'philosophy-of-physics', status: 'speculative', empiricalStatus: 'not established', summary: 'Some philosophical proposals treat mathematical structures as physically real universes. This is not an observed cosmological history.' }),
  Object.freeze({ id: 'hearthweave', label: 'Hearthweave possibility ecology', family: 'project-world-topology', status: 'project-canon-boundary', empiricalStatus: 'authored/project topology', summary: 'ArcSweep worlds, branches and possibility structures are explicit project states and must not be presented as empirical cosmology.' }),
]);

export const TEMPORAL_UNCERTAINTIES = Object.freeze([
  Object.freeze({ id: 'universe-age', label: 'Age of observable universe', centre: 13.8, unit: 'Ga', plusMinus: 0.02, confidence: 'high', provenance: 'scientific-consensus' }),
  Object.freeze({ id: 'solar-formation', label: 'Solar System formation', centre: 4.567, unit: 'Ga', plusMinus: 0.001, confidence: 'high', provenance: 'scientific-consensus' }),
  Object.freeze({ id: 'earth-formation', label: 'Earth formation', centre: 4.54, unit: 'Ga', plusMinus: 0.05, confidence: 'high', provenance: 'scientific-reconstruction' }),
  Object.freeze({ id: 'moon-formation', label: 'Moon formation interval', minimum: 4.45, maximum: 4.52, unit: 'Ga ago', confidence: 'medium', provenance: 'strong-inference' }),
  Object.freeze({ id: 'earliest-life', label: 'Earliest widely accepted life evidence', minimum: 3.5, maximum: 3.8, unit: 'Ga ago', confidence: 'medium', provenance: 'scientific-reconstruction' }),
  Object.freeze({ id: 'sapiens-origin', label: 'Homo sapiens emergence', minimum: 0.25, maximum: 0.35, unit: 'Ma ago', confidence: 'medium', provenance: 'scientific-reconstruction' }),
]);

function worldId(world) {
  return world?.id || null;
}

function text(value) {
  return String(value ?? '').trim();
}

function unknownMarker(value) {
  return !text(value) || /^not yet specified|^unknown|^unset/i.test(text(value));
}

export function inferCosmologyInheritance(world, terraPrimeId = 'terra-prime') {
  if (!world) return { mode: 'unknown', sourceWorldId: null, reason: 'world missing' };
  const explicit = world.knowledgeAtlas?.cosmologyInheritance;
  if (explicit && COSMOLOGY_INHERITANCE_MODES.some((item) => item.id === explicit.mode)) return explicit;
  if (world.id === terraPrimeId || world.wakingWorld) return { mode: 'shared-terra-prime', sourceWorldId: terraPrimeId, reason: 'Waking World empirical anchor' };
  if (world.parentWorldId) return { mode: 'branch', sourceWorldId: world.parentWorldId, branchPoint: text(world.branchPoint), reason: 'world registry ancestry' };
  const rules = text(world.rules).toLowerCase();
  if (/independent cosmolog|own cosmolog|separate universe/.test(rules)) return { mode: 'independent', sourceWorldId: null, reason: 'authored world rules' };
  if (unknownMarker(world.history) && unknownMarker(world.rules)) return { mode: 'unknown', sourceWorldId: null, reason: 'canon not specified' };
  return { mode: 'derived', sourceWorldId: terraPrimeId, reason: 'default explicit-reference requirement; divergence must be declared' };
}

function compareField(parent, child, path, label) {
  const parts = path.split('.');
  const read = (obj) => parts.reduce((value, key) => value?.[key], obj);
  const left = read(parent);
  const right = read(child);
  if (JSON.stringify(left) === JSON.stringify(right)) return null;
  return Object.freeze({ path, label, parentValue: left ?? null, childValue: right ?? null });
}

export function worldDivergenceRecord(parent, child, recordedAt = new Date().toISOString()) {
  if (!child) throw new TypeError('child world required');
  const comparisons = [
    ['kind', 'World kind'],
    ['history', 'History'],
    ['rules', 'Rules / metaphysics'],
    ['time.wakingMinutes', 'Waking time ratio'],
    ['time.worldMinutes', 'World time ratio'],
    ['arrival.location', 'Arrival location'],
    ['identity.form', 'Embodiment'],
    ['competencies.worldSystems', 'World systems'],
    ['worldseedInheritance.mustSurvive', 'Must-survive inheritance'],
    ['worldseedInheritance.mayChange', 'May-change inheritance'],
    ['worldseedInheritance.mayBeLost', 'May-be-lost inheritance'],
  ];
  const differences = comparisons.map(([path, label]) => compareField(parent || {}, child, path, label)).filter(Boolean);
  return Object.freeze({
    schema: DIVERGENCE_RECORD_SCHEMA,
    parentWorldId: worldId(parent),
    childWorldId: worldId(child),
    childWorldName: child.name || child.id,
    branchPoint: text(child.branchPoint),
    recordedAt,
    differences,
    differenceCount: differences.length,
    law: 'Divergence records differences only. They do not rewrite either world or imply that unlisted fields are identical in reality.',
  });
}

export function buildWorldLineageGraph(worlds = []) {
  const nodes = worlds.map((world) => Object.freeze({
    id: world.id,
    label: world.name || world.id,
    kind: world.kind || 'Unspecified',
    parentWorldId: world.parentWorldId || null,
    lineageLabel: world.lineageLabel || '',
    cosmology: inferCosmologyInheritance(world),
  }));
  const known = new Set(nodes.map((item) => item.id));
  const edges = nodes.filter((item) => item.parentWorldId).map((item) => Object.freeze({
    from: item.parentWorldId,
    to: item.id,
    dangling: !known.has(item.parentWorldId),
    relation: 'world-lineage',
  }));
  return Object.freeze({ schema: COSMOLOGY_LINEAGE_SCHEMA, nodes, edges });
}

export function buildAllDivergenceRecords(worlds = [], recordedAt = new Date().toISOString()) {
  const byId = new Map(worlds.map((world) => [world.id, world]));
  return worlds.filter((world) => world.parentWorldId).map((world) => worldDivergenceRecord(byId.get(world.parentWorldId) || null, world, recordedAt));
}

export function temporalRange(item) {
  if (!item) return null;
  if (Number.isFinite(item.minimum) && Number.isFinite(item.maximum)) return Object.freeze({ minimum: item.minimum, maximum: item.maximum, unit: item.unit, confidence: item.confidence });
  if (Number.isFinite(item.centre) && Number.isFinite(item.plusMinus)) return Object.freeze({ minimum: item.centre - item.plusMinus, maximum: item.centre + item.plusMinus, centre: item.centre, unit: item.unit, confidence: item.confidence });
  return null;
}
