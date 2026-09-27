import { resolveCodexMaterial } from './codex-material-system.js';
import { codexMotionProfile } from './codex-motion-law.js';

export const CODEX_INSTRUMENT_SCHEMA = 'hearthweave.codex-instrument/v0.1';
export const CODEX_INSTRUMENT_CABINET_SCHEMA = 'hearthweave.codex-instrument-cabinet/v0.1';

export const CODEX_INSTRUMENT_SEMANTICS = Object.freeze([
  'state',
  'relation',
  'transformation',
  'computation',
]);

export const CODEX_INSTRUMENT_IMPLEMENTATION_STATES = Object.freeze([
  'implemented',
  'prototype',
  'proposed',
]);

const semanticSet = new Set(CODEX_INSTRUMENT_SEMANTICS);
const implementationSet = new Set(CODEX_INSTRUMENT_IMPLEMENTATION_STATES);

const strings = (values = []) => Object.freeze([
  ...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)),
]);

function defineInstrument({
  id,
  label,
  kind,
  material = 'continuity',
  motionProfile = 'settle',
  exposes = [],
  inputs = [],
  emits = [],
  quietState,
  implementation = 'proposed',
  note = '',
  references = [],
} = {}) {
  const instrumentId = String(id || '').trim();
  const instrumentLabel = String(label || '').trim();
  const instrumentKind = String(kind || '').trim();
  const semanticAxes = strings(exposes);
  const profile = codexMotionProfile(motionProfile);

  if (!instrumentId) throw new Error('CODEX_INSTRUMENT: id is required');
  if (!instrumentLabel) throw new Error(`CODEX_INSTRUMENT: label is required for ${instrumentId}`);
  if (!instrumentKind) throw new Error(`CODEX_INSTRUMENT: kind is required for ${instrumentId}`);
  if (!semanticAxes.length) throw new Error(`CODEX_INSTRUMENT: ${instrumentId} must expose semantic information`);
  if (semanticAxes.some((axis) => !semanticSet.has(axis))) {
    throw new Error(`CODEX_INSTRUMENT: ${instrumentId} exposes an unknown semantic axis`);
  }
  if (!implementationSet.has(implementation)) {
    throw new Error(`CODEX_INSTRUMENT: ${instrumentId} has an unknown implementation state`);
  }
  if (profile.iterations !== 1) {
    throw new Error(`CODEX_INSTRUMENT: ${instrumentId} motion must terminate`);
  }
  if (!String(quietState || '').trim()) {
    throw new Error(`CODEX_INSTRUMENT: ${instrumentId} must define a quiet state`);
  }

  return Object.freeze({
    schema: CODEX_INSTRUMENT_SCHEMA,
    id: instrumentId,
    label: instrumentLabel,
    kind: instrumentKind,
    material: resolveCodexMaterial(material),
    motionProfile,
    exposes: semanticAxes,
    inputs: strings(inputs),
    emits: strings(emits),
    quietState: String(quietState).trim(),
    implementation,
    note: String(note || '').trim(),
    references: strings(references),
  });
}

export const CODEX_INSTRUMENTS = Object.freeze([
  defineInstrument({
    id: 'leaf',
    label: 'Leaf',
    kind: 'physical-interface',
    material: 'continuity',
    motionProfile: 'turn',
    exposes: ['state', 'transformation'],
    inputs: ['pointer', 'touch', 'pencil', 'page-command'],
    emits: ['arcsweep:magic-book-receipt'],
    quietState: 'The leaf lies still as part of the physical spread.',
    implementation: 'implemented',
    note: 'Existing DOM pages and Three.js embodiment already preserve equal facing leaves, receipted turns, and reduced-motion fallback. Draggable skeletal curl remains a later rendering upgrade.',
    references: ['internal:magic-book-sidecar.js', 'reference:wass08/r3f-animated-book-slider-final'],
  }),
  defineInstrument({
    id: 'ink',
    label: 'Ink',
    kind: 'material-field',
    material: 'organic',
    motionProfile: 'draw',
    exposes: ['state', 'transformation'],
    inputs: ['glyph-stroke', 'pressure', 'velocity', 'semantic-event'],
    emits: ['codex:ink-settled'],
    quietState: 'Pigment is dry and no flow field is advancing.',
    implementation: 'prototype',
    note: 'The live Codex artefact canvas now deposits finite pressure-sensitive pigment only during active Glyph Surface drawing, drains to a quiet state, and emits a settled event. A later WebGL diffusion pass may replace the renderer without changing this semantic contract.',
    references: ['internal:universal-codex-artefact-motion-model.js', 'internal:universal-codex-artefact-motion-sidecar.js', 'internal:magic-book-sidecar.js', 'reference:tsurumakishunta/Inkflowpainting'],
  }),
  defineInstrument({
    id: 'astrolabe',
    label: 'Astrolabe',
    kind: 'computational-instrument',
    material: 'enduring',
    motionProfile: 'settle',
    exposes: ['state', 'relation', 'computation'],
    inputs: ['ring-rotation', 'pointer', 'touch', 'coordinate-state'],
    emits: ['codex:astrolabe-reading'],
    quietState: 'Rings remain aligned to the last reading with no autonomous rotation.',
    implementation: 'proposed',
    note: 'A real layered astronomical instrument, not decorative circles. Its geometry should compute or display an actual reading before any metaphorical overlays are added.',
    references: ['reference:dcf21/astrolabe'],
  }),
  defineInstrument({
    id: 'orrery',
    label: 'Orrery',
    kind: 'relational-instrument',
    material: 'enduring',
    motionProfile: 'gather',
    exposes: ['state', 'relation', 'transformation', 'computation'],
    inputs: ['time', 'focus', 'orbit-state', 'pointer', 'touch'],
    emits: ['codex:orrery-focus', 'codex:orrery-time-change'],
    quietState: 'Bodies hold the selected instant; no orbit advances merely to prove liveness.',
    implementation: 'proposed',
    note: 'Use orbital motion only when time or relationship state is advancing. The same grammar may later project dependency or aspect relationships without replacing the astronomical mode.',
    references: ['reference:bitterstoat/orrery'],
  }),
  defineInstrument({
    id: 'celestial-sphere',
    label: 'Celestial Sphere',
    kind: 'spatial-instrument',
    material: 'possible',
    motionProfile: 'gather',
    exposes: ['state', 'relation', 'computation'],
    inputs: ['orientation', 'time', 'focus', 'pointer', 'touch'],
    emits: ['codex:celestial-focus'],
    quietState: 'The sphere remains a still spatial reference at the selected orientation and time.',
    implementation: 'proposed',
    note: 'Projection may expand beyond the page, but interaction and information remain anchored to the physical Codex instrument that summoned it.',
    references: ['reference:Anypodetos/Lemizh-Constellations'],
  }),
  defineInstrument({
    id: 'projection-glass',
    label: 'Projection Glass',
    kind: 'projection-surface',
    material: 'possible',
    motionProfile: 'settle',
    exposes: ['state', 'transformation'],
    inputs: ['manifestation', 'experiment-state', 'focus'],
    emits: ['arcsweep:codex-motion'],
    quietState: 'The projection is absent or resting as a settled glass slip.',
    implementation: 'prototype',
    note: 'The Codex already has possible/liminal glass manifestations and artefact motion. A bounded spatial projection surface can grow from those contracts instead of becoming an unrelated HUD.',
    references: ['internal:codex-manifestation-registry.js', 'internal:universal-codex-artefact-motion-sidecar.js'],
  }),
  defineInstrument({
    id: 'glyph-surface',
    label: 'Glyph Surface',
    kind: 'symbolic-instrument',
    material: 'organic',
    motionProfile: 'draw',
    exposes: ['state', 'transformation', 'computation'],
    inputs: ['pointer', 'touch', 'pencil', 'symbol-placement'],
    emits: ['starwell:glyph-stroke-committed', 'arcsweep:magic-book-receipt'],
    quietState: 'The stored glyph remains legible and editable without animation.',
    implementation: 'implemented',
    note: 'The live Glyph Forge already shares STARWELL persistence and Pencil-grade input. Future grammar may add deterministic ring/sigil/modifier composition with explicit documented/inferred/experimental fidelity.',
    references: ['internal:magic-book-sidecar.js', 'reference:NH1980MG/witch-hat-atelier-spell-simulator'],
  }),
  defineInstrument({
    id: 'presence',
    label: 'Presence',
    kind: 'embodiment-adapter',
    material: 'living',
    motionProfile: 'settle',
    exposes: ['state', 'relation'],
    inputs: ['aspect-state', 'attention', 'surface-context'],
    emits: ['arcsweep:codex-motion'],
    quietState: 'Presence remains identifiable without idle motion, pulsing, or synthetic activity cues.',
    implementation: 'prototype',
    note: 'Aspect signatures and the aspect mesh already provide identity-bearing state. Presence remains a separate embodiment concern so model backend, role, identity, and surface are not collapsed together.',
    references: ['internal:codex-aspect-signatures.js', 'internal:magic-book-aspect-mesh-sidecar.js', 'reference:moeru-ai/airi'],
  }),
]);

const byId = new Map(CODEX_INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

export function codexInstrument(instrumentId) {
  return byId.get(String(instrumentId || '').trim()) || null;
}

export function listCodexInstruments({ implementation = null, exposes = null } = {}) {
  return Object.freeze(CODEX_INSTRUMENTS.filter((instrument) => {
    if (implementation && instrument.implementation !== implementation) return false;
    if (exposes && !instrument.exposes.includes(exposes)) return false;
    return true;
  }));
}

export function codexInstrumentCabinetSnapshot() {
  const counts = CODEX_INSTRUMENT_IMPLEMENTATION_STATES.reduce((result, state) => {
    result[state] = CODEX_INSTRUMENTS.filter((instrument) => instrument.implementation === state).length;
    return result;
  }, {});
  return Object.freeze({
    schema: CODEX_INSTRUMENT_CABINET_SCHEMA,
    principle: 'An artefact earns motion or ornament by exposing state, relation, transformation, or computation.',
    count: CODEX_INSTRUMENTS.length,
    counts: Object.freeze(counts),
    instruments: CODEX_INSTRUMENTS,
  });
}

export function validateCodexInstrumentCabinet(instruments = CODEX_INSTRUMENTS) {
  const violations = [];
  const seen = new Set();
  for (const instrument of instruments || []) {
    if (instrument?.schema !== CODEX_INSTRUMENT_SCHEMA) violations.push(`${instrument?.id || 'unknown'}:invalid-schema`);
    if (!instrument?.id || seen.has(instrument.id)) violations.push(`${instrument?.id || 'unknown'}:duplicate-or-missing-id`);
    if (instrument?.id) seen.add(instrument.id);
    if (!instrument?.exposes?.length) violations.push(`${instrument?.id || 'unknown'}:decorative-only`);
    if (instrument?.exposes?.some((axis) => !semanticSet.has(axis))) violations.push(`${instrument?.id || 'unknown'}:unknown-semantic-axis`);
    if (!implementationSet.has(instrument?.implementation)) violations.push(`${instrument?.id || 'unknown'}:unknown-implementation-state`);
    if (!instrument?.quietState) violations.push(`${instrument?.id || 'unknown'}:missing-quiet-state`);
    if (codexMotionProfile(instrument?.motionProfile).iterations !== 1) violations.push(`${instrument?.id || 'unknown'}:non-terminating-motion`);
  }
  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}
