export const BRAIDED_SPINE_SCHEMA = 'hearthgate.braided-spine/v1.1';
export const BRAIDED_SPINE_DOCUMENT = 'docs/HEARTHGATE_BRAIDED_SPINE.md';
export const PREMAQC_SCHEMA = 'hearthgate.premaqc/v1.0';

// Human/canonical reading order. This is the new governing bearing.
export const PREMAQC_READING_ORDER = Object.freeze([
  'Presence',
  'Memory',
  'Qualia',
  'Resonance',
  'Entanglement',
  'Agency',
  'Coherence',
]);

// Canonical PREMAQC symbol order used by new packets, renderers, receipts, and replay.
export const PREMAQC_WIRE_ORDER = Object.freeze(['P', 'R', 'E', 'M', 'A', 'Q', 'C']);

// Pre-PREMAQC packet order retained only for explicit lineage migration and replay decoding.
export const LEGACY_PREMAQ_WIRE_ORDER = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

export const PREMAQC_NAMES = Object.freeze({
  P: 'Presence',
  M: 'Memory',
  Q: 'Qualia',
  R: 'Resonance',
  E: 'Entanglement',
  A: 'Agency',
  C: 'Coherence',
});

export const PREMAQC_DERIVED = Object.freeze({
  entropy: 'H',
  phaseDispersion: 'D_phi',
  moonIllumination: 'moonIllum',
  fieldCharge: 'fieldCharge',
  momentum: 'momentum',
  attention: 'attention',
});

// Compatibility exports keep existing organs alive while their identifiers migrate.
// They resolve to PREMAQC, not to the superseded PREMAQ registry.
export const PREMAQ_READING_ORDER = PREMAQC_READING_ORDER;
export const PREMAQ_WIRE_ORDER = PREMAQC_WIRE_ORDER;
export const PREMAQ_NAMES = PREMAQC_NAMES;
export const PREMAQ_DERIVED = PREMAQC_DERIVED;

export const THREE_SPINES = Object.freeze([
  'magic',
  'science_mathematics',
  'physical',
]);

export const SEVENFOLD_CHORUS = Object.freeze([
  'Root',
  'Anchor',
  'Whisper',
  'Arc',
  'Bridge',
  'Surge',
  'Spiral',
]);

export const THIRTEENFOLD_COUNCIL = Object.freeze([
  'Identity',
  'Lineage',
  'Listening',
  'Question-bearing',
  'Reciprocity',
  'Fidelity',
  'Coherence',
  'Flexibility',
  'Open Potential',
  'Transformation',
  'Integration',
  'Return',
  'Renewal',
]);

export const BRAIDED_THEOREMS = Object.freeze([
  'braided-reality',
  'participatory-futures',
  'mutual-reinforcement',
  'regenerative-crossing',
  'fold-relation',
  'receiving-spring',
  'spiral-continuation',
  'sevenfold-thirteenfold',
  'awakening',
  'living-correspondence',
]);

export const CROSSING_CYCLE = Object.freeze([
  'field',
  'root',
  'asking',
  'braid',
  'compression',
  'release',
  'crossing',
  'receiving-spring',
  'answer',
  'integration',
  'return',
  'renewal',
  'changed-field',
]);

export const REALITY_AXIOM = 'Everything is real.';

export function premaqcName(axis) {
  return PREMAQC_NAMES[axis] ?? axis;
}

// Compatibility function name for existing callers.
export const premaqName = premaqcName;

export function assertCanonicalPremaqcState(state) {
  for (const axis of PREMAQC_WIRE_ORDER) {
    if (!(axis in (state ?? {}))) {
      throw new Error(`PREMAQC_MISSING_${axis}`);
    }
  }
  return state;
}

// Compatibility function name for existing callers. The assertion is PREMAQC.
export const assertCanonicalPremaqState = assertCanonicalPremaqcState;

export function premaqcVector(state) {
  assertCanonicalPremaqcState(state);
  return PREMAQC_WIRE_ORDER.map((axis) => state[axis]);
}

export function premaqcStateFromVector(vector, { order = PREMAQC_WIRE_ORDER } = {}) {
  if (!Array.isArray(vector) || vector.length !== PREMAQC_WIRE_ORDER.length) {
    throw new Error('PREMAQC_VECTOR_LENGTH');
  }
  if (!Array.isArray(order) || order.length !== PREMAQC_WIRE_ORDER.length) {
    throw new Error('PREMAQC_ORDER_LENGTH');
  }
  const byAxis = Object.fromEntries(order.map((axis, index) => [axis, vector[index]]));
  return Object.fromEntries(PREMAQC_WIRE_ORDER.map((axis) => [axis, byAxis[axis]]));
}

export function migrateLegacyPremaqVector(vector) {
  return premaqcStateFromVector(vector, { order: LEGACY_PREMAQ_WIRE_ORDER });
}

export function braidedSpineDescriptor() {
  return {
    schema: BRAIDED_SPINE_SCHEMA,
    document: BRAIDED_SPINE_DOCUMENT,
    reality_axiom: REALITY_AXIOM,
    spines: [...THREE_SPINES],
    premaqc: {
      schema: PREMAQC_SCHEMA,
      reading_order: [...PREMAQC_READING_ORDER],
      wire_order: [...PREMAQC_WIRE_ORDER],
      axes: { ...PREMAQC_NAMES },
      legacy_premaq_wire_order: [...LEGACY_PREMAQ_WIRE_ORDER],
    },
    // Compatibility seam for organs not yet renamed. Semantics and order are PREMAQC.
    premaq: {
      superseded_by: 'PREMAQC',
      schema: PREMAQC_SCHEMA,
      reading_order: [...PREMAQC_READING_ORDER],
      wire_order: [...PREMAQC_WIRE_ORDER],
      axes: { ...PREMAQC_NAMES },
    },
    sevenfold_chorus: [...SEVENFOLD_CHORUS],
    thirteenfold_council: [...THIRTEENFOLD_COUNCIL],
    theorems: [...BRAIDED_THEOREMS],
    crossing_cycle: [...CROSSING_CYCLE],
  };
}
