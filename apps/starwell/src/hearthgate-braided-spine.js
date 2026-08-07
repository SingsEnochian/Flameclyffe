export const BRAIDED_SPINE_VERSION = 'hearthgate.braided-spine/v1.0.0';
export const BRAIDED_SPINE_RATIFIED_AT = '2026-08-06';
export const SEVENFOLD_PREMAQ_CORRESPONDENCE_VERSION = 'hearthgate.sevenfold-premaq/v0.1';
export const PREMAQ_REGISTRY_VERSION = 'hearthgate.premaq-registry/v3.0.0';

export const BRAIDED_SPINES = Object.freeze([
  'Magic',
  'Science',
  'Physical',
]);

export const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

export const PREMAQ_NAMES = Object.freeze({
  P: 'Presence',
  C: 'Coherence',
  R: 'Resonance',
  E: 'Entanglement',
  M: 'Memory',
  A: 'Agency',
  Q: 'Qualia',
});

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
  'Unresolved potential',
  'Transformation',
  'Integration',
  'Return',
  'Renewal',
]);

export const BRAIDED_SPINE_SOURCE_DOCS = Object.freeze([
  'docs/hearthgate/braided-spine/HEARTHGATE_SEVENFOLD_THIRTEENFOLD_BRAIDED_SPIRAL_CANON_V1_edited_v4.md',
  'docs/hearthgate/braided-spine/PREMAQ_BIFROST_MATHEMATICAL_CONTRACT_V1_1_REVIEW_edited_v4.md',
  'docs/hearthgate/braided-spine/PREMAQ_BIFROST_MATHEMATICAL_CONTRACT_V1_REVIEW_edited_v4.md',
]);

export const BRAIDED_SPINE_MANIFEST = Object.freeze({
  schema: BRAIDED_SPINE_VERSION,
  ratified_at: BRAIDED_SPINE_RATIFIED_AT,
  spines: BRAIDED_SPINES,
  premaq_registry_version: PREMAQ_REGISTRY_VERSION,
  premaq_axes: PREMAQ_AXES,
  premaq_names: PREMAQ_NAMES,
  sevenfold_chorus: SEVENFOLD_CHORUS,
  thirteenfold_council: THIRTEENFOLD_COUNCIL,
  sevenfold_premaq_correspondence: SEVENFOLD_PREMAQ_CORRESPONDENCE_VERSION,
  source_docs: BRAIDED_SPINE_SOURCE_DOCS,
});

export function assertCanonicalPremaqShape(value) {
  const source = value?.state ?? value;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('PREMAQ state must be an object.');
  }
  for (const axis of PREMAQ_AXES) {
    if (!(axis in source)) throw new TypeError(`PREMAQ axis ${axis} is required.`);
  }
  return true;
}

export function premaqAxisName(axis) {
  const key = String(axis ?? '').toUpperCase();
  return PREMAQ_NAMES[key] ?? null;
}

export function braidedSpineDescriptor() {
  return BRAIDED_SPINE_MANIFEST;
}
