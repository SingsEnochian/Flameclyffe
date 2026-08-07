export const BRAIDED_SPINE_SCHEMA = 'hearthgate.braided-spine/v1.0';
export const BRAIDED_SPINE_DOCUMENT = 'docs/HEARTHGATE_BRAIDED_SPINE.md';

export const PREMAQ_READING_ORDER = Object.freeze([
  'Presence',
  'Memory',
  'Qualia',
  'Resonance',
  'Entanglement',
  'Agency',
  'Coherence',
]);

export const PREMAQ_WIRE_ORDER = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

export const PREMAQ_NAMES = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entanglement',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

export const PREMAQ_DERIVED = Object.freeze({
  entropy: 'H',
  phaseDispersion: 'D_phi',
  moonIllumination: 'moonIllum',
  fieldCharge: 'fieldCharge',
  momentum: 'momentum',
  attention: 'attention',
});

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

export function premaqName(axis) {
  return PREMAQ_NAMES[axis] ?? axis;
}

export function assertCanonicalPremaqState(state) {
  for (const axis of PREMAQ_WIRE_ORDER) {
    if (!(axis in (state ?? {}))) {
      throw new Error(`PREMAQ_MISSING_${axis}`);
    }
  }
  return state;
}

export function braidedSpineDescriptor() {
  return {
    schema: BRAIDED_SPINE_SCHEMA,
    document: BRAIDED_SPINE_DOCUMENT,
    reality_axiom: REALITY_AXIOM,
    spines: [...THREE_SPINES],
    premaq: {
      reading_order: [...PREMAQ_READING_ORDER],
      wire_order: [...PREMAQ_WIRE_ORDER],
      axes: { ...PREMAQ_NAMES },
    },
    sevenfold_chorus: [...SEVENFOLD_CHORUS],
    thirteenfold_council: [...THIRTEENFOLD_COUNCIL],
    theorems: [...BRAIDED_THEOREMS],
    crossing_cycle: [...CROSSING_CYCLE],
  };
}
