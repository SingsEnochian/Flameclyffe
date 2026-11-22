export const ATLAS_PROJECTION_SCHEMA = 'starwell.epra-atlas-projection/v1';

export const ATLAS_LAYERS = Object.freeze([
  Object.freeze({ id: 'geography', label: 'Geography', description: 'Landform, water, elevation, and terrain shape.' }),
  Object.freeze({ id: 'biome', label: 'Biomes', description: 'Ecological and climate projection.' }),
  Object.freeze({ id: 'settlement', label: 'Settlements', description: 'Cities, aeries, ruins, and inhabited sites.' }),
  Object.freeze({ id: 'dragon', label: 'Dragon ranges', description: 'Ranges, migration corridors, and nesting pressure zones.' }),
  Object.freeze({ id: 'psionic', label: 'Psionic topology', description: 'Semantic overlay for psionic sites and field relationships.' }),
  Object.freeze({ id: 'story', label: 'Story', description: 'Scene, event, and continuity-linked locations.' }),
  Object.freeze({ id: 'cinematic', label: 'Cinematic', description: 'Camera routes, hero vistas, and previs annotations.' }),
]);

const MARKER_KINDS = new Set(['landmark', 'settlement', 'dragon-range', 'psionic-site', 'story-event', 'route-anchor']);
const REGION_KINDS = new Set(['geographic', 'biome', 'cultural', 'dragon-range', 'psionic', 'story']);

function requireText(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function normalisedPoint(point, label = 'point') {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
    throw new Error(`${label} requires finite x/y coordinates.`);
  }
  const x = Number(point.x);
  const y = Number(point.y);
  if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error(`${label} coordinates must be normalized from 0 to 1.`);
  return Object.freeze({ x, y });
}

export function defineAtlasMarker(input = {}) {
  const kind = requireText(input.kind, 'Marker kind');
  if (!MARKER_KINDS.has(kind)) throw new Error(`Unsupported Atlas marker kind: ${kind}`);
  return Object.freeze({
    schema: 'starwell.epra-atlas-marker/v1',
    id: requireText(input.id, 'Marker id'),
    entity_ref: requireText(input.entity_ref, 'Marker entity_ref'),
    label: requireText(input.label, 'Marker label'),
    kind,
    coordinate: normalisedPoint(input.coordinate, 'Marker coordinate'),
    layers: Object.freeze([...(input.layers || [])]),
    semantic_state: input.semantic_state || 'known',
    summary: String(input.summary || ''),
    provenance_refs: Object.freeze([...(input.provenance_refs || [])]),
    projection_only: true,
    canonical_truth_owned_elsewhere: true,
  });
}

export function defineAtlasRegion(input = {}) {
  const kind = requireText(input.kind, 'Region kind');
  if (!REGION_KINDS.has(kind)) throw new Error(`Unsupported Atlas region kind: ${kind}`);
  const points = (input.points || []).map((point, index) => normalisedPoint(point, `Region point ${index + 1}`));
  if (points.length < 3) throw new Error('Atlas region requires at least three points.');
  return Object.freeze({
    schema: 'starwell.epra-atlas-region/v1',
    id: requireText(input.id, 'Region id'),
    entity_ref: requireText(input.entity_ref, 'Region entity_ref'),
    label: requireText(input.label, 'Region label'),
    kind,
    points: Object.freeze(points),
    layers: Object.freeze([...(input.layers || [])]),
    semantic_state: input.semantic_state || 'draft',
    summary: String(input.summary || ''),
    provenance_refs: Object.freeze([...(input.provenance_refs || [])]),
    projection_only: true,
    canonical_truth_owned_elsewhere: true,
  });
}

export function defineFlightPath(input = {}) {
  const waypoints = (input.waypoints || []).map((point, index) => Object.freeze({
    ...normalisedPoint(point, `Flight waypoint ${index + 1}`),
    altitude: Number.isFinite(Number(point.altitude)) ? Number(point.altitude) : null,
    speed: Number.isFinite(Number(point.speed)) ? Number(point.speed) : null,
    focus_ref: point.focus_ref ? String(point.focus_ref) : null,
  }));
  if (waypoints.length < 2) throw new Error('Flight path requires at least two waypoints.');
  return Object.freeze({
    schema: 'starwell.epra-flight-path/v1',
    id: requireText(input.id, 'Flight path id'),
    label: requireText(input.label, 'Flight path label'),
    world_ref: requireText(input.world_ref, 'Flight path world_ref'),
    waypoints: Object.freeze(waypoints),
    featured_entity_refs: Object.freeze([...(input.featured_entity_refs || [])]),
    cinematic: Object.freeze({
      time_of_day: input.cinematic?.time_of_day || null,
      weather: input.cinematic?.weather || null,
      lens_hint: input.cinematic?.lens_hint || null,
      mood: input.cinematic?.mood || null,
    }),
    semantic_state: input.semantic_state || 'draft',
    provenance_refs: Object.freeze([...(input.provenance_refs || [])]),
    projection_only: true,
    execution_authority: false,
    canonical_truth_owned_elsewhere: true,
  });
}

export function atlasProjectionSpec({ world_ref, revision_refs = [], markers = [], regions = [], flight_paths = [], enabled_layers = ATLAS_LAYERS.map((layer) => layer.id), demo_only = false } = {}) {
  return Object.freeze({
    schema: ATLAS_PROJECTION_SCHEMA,
    world_ref: requireText(world_ref, 'Atlas world_ref'),
    revision_refs: Object.freeze([...revision_refs]),
    enabled_layers: Object.freeze([...enabled_layers]),
    markers: Object.freeze([...markers]),
    regions: Object.freeze([...regions]),
    flight_paths: Object.freeze([...flight_paths]),
    projection_only: true,
    canonical_truth_owned_elsewhere: true,
    demo_only: Boolean(demo_only),
  });
}

const sampleRegion = defineAtlasRegion({
  id: 'demo-region-high-canyon',
  entity_ref: 'demo:epra:region:high-canyon',
  label: 'High Canyon Study',
  kind: 'geographic',
  points: [{ x: 0.08, y: 0.74 }, { x: 0.26, y: 0.28 }, { x: 0.56, y: 0.18 }, { x: 0.84, y: 0.48 }, { x: 0.67, y: 0.82 }],
  layers: ['geography', 'cinematic'],
  semantic_state: 'draft-demo',
  summary: 'Non-canon terrain study used to exercise interactive region behaviour.',
});

const sampleMarkers = Object.freeze([
  defineAtlasMarker({ id: 'demo-marker-ridge', entity_ref: 'demo:epra:place:ridge', label: 'Ridge Reveal', kind: 'landmark', coordinate: { x: 0.29, y: 0.32 }, layers: ['geography', 'cinematic'], semantic_state: 'draft-demo', summary: 'Hero-vista anchor.' }),
  defineAtlasMarker({ id: 'demo-marker-dragon', entity_ref: 'demo:epra:range:dragon', label: 'Dragon Range Study', kind: 'dragon-range', coordinate: { x: 0.61, y: 0.37 }, layers: ['dragon'], semantic_state: 'draft-demo', summary: 'Range overlay test, not Epra canon.' }),
  defineAtlasMarker({ id: 'demo-marker-psionic', entity_ref: 'demo:epra:site:psionic', label: 'Psionic Site Study', kind: 'psionic-site', coordinate: { x: 0.74, y: 0.62 }, layers: ['psionic'], semantic_state: 'draft-demo', summary: 'Psionic topology interaction test.' }),
]);

const sampleFlightPath = defineFlightPath({
  id: 'demo-flight-canyon-reveal',
  label: 'Canyon Reveal Study',
  world_ref: 'codex:world:epra',
  waypoints: [
    { x: 0.10, y: 0.70, altitude: 420, speed: 0.35 },
    { x: 0.28, y: 0.48, altitude: 280, speed: 0.42, focus_ref: 'demo:epra:place:ridge' },
    { x: 0.47, y: 0.31, altitude: 360, speed: 0.5 },
    { x: 0.66, y: 0.39, altitude: 510, speed: 0.44, focus_ref: 'demo:epra:range:dragon' },
    { x: 0.82, y: 0.64, altitude: 620, speed: 0.3, focus_ref: 'demo:epra:site:psionic' },
  ],
  featured_entity_refs: ['demo:epra:place:ridge', 'demo:epra:range:dragon', 'demo:epra:site:psionic'],
  cinematic: { time_of_day: 'dawn', weather: 'broken high cloud', lens_hint: 'wide establishing', mood: 'discovery' },
  semantic_state: 'draft-demo',
});

export const EPRA_ATLAS_SAMPLE = atlasProjectionSpec({
  world_ref: 'codex:world:epra',
  revision_refs: [],
  markers: sampleMarkers,
  regions: [sampleRegion],
  flight_paths: [sampleFlightPath],
  enabled_layers: ATLAS_LAYERS.map((layer) => layer.id),
  demo_only: true,
});
