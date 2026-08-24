export const PREMAQC_CONTRACT_SCHEMA = 'flameclyffe.premaqc-contract/v1';
export const PREMAQC_TERM = 'PREMAQC';

export const PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const PREMAQC_DYNAMIC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']);
export const PREMAQC_CONTEXT_ONLY_AXES = Object.freeze(['Q']);

export const PREMAQC_SHOKZ_PLAN_SCHEMA = 'bifrost.premaqc-shokz-soundfont-plan/v1';
export const PREMAQC_FULL_SONG_PLAN_SCHEMA = 'bifrost.premaqc-full-song-plan/v1';
export const PREMAQC_FULL_SONG_RECEIPT_SCHEMA = 'bifrost.premaqc-full-song-receipt/v1';
export const TWO_SHORE_PREMAQC_GATE_SCHEMA = 'hearthgate.two-shore-premaqc-gate/v1';
export const TWO_SHORE_PREMAQC_ORIGIN_SCHEMA = 'hearthgate.earth-prime-premaqc-calibration/v1';

export const PREMAQC_AUTHORITY = Object.freeze({
  dynamic_axes: PREMAQC_DYNAMIC_AXES,
  context_only_axes: PREMAQC_CONTEXT_ONLY_AXES,
  qualia_is_firsthand_only: true,
  qualia_sonified: false,
  qualia_magnitude_inference_allowed: false,
  unsupported_or_ungranted_fields_remain_unknown: true,
  canon_commit: false,
  physical_claim: false,
});

const LEGACY_SCHEMA_MAP = Object.freeze({
  'bifrost.premaq-shokz-soundfont-plan/v0.4': PREMAQC_SHOKZ_PLAN_SCHEMA,
  'bifrost.premaq-shokz-soundfont-plan/v0.5': PREMAQC_SHOKZ_PLAN_SCHEMA,
  'bifrost.premaq-full-song-plan/v0.5': PREMAQC_FULL_SONG_PLAN_SCHEMA,
  'bifrost.premaq-full-song-receipt/v0.5': PREMAQC_FULL_SONG_RECEIPT_SCHEMA,
  'hearthgate.two-shore-premaq-gate/v0.1': TWO_SHORE_PREMAQC_GATE_SCHEMA,
  'hearthgate.two-shore-premaq-gate/v0.2': TWO_SHORE_PREMAQC_GATE_SCHEMA,
  'hearthgate.earth-prime-premaq-calibration/v0.2': TWO_SHORE_PREMAQC_ORIGIN_SCHEMA,
});

export function canonicalPremaqcSchema(schema) {
  return LEGACY_SCHEMA_MAP[schema] || schema;
}

export function canonicalisePremaqcEnvelope(value, { schema = null } = {}) {
  if (!value || typeof value !== 'object') return value;
  const next = structuredClone(value);
  next.schema = schema || canonicalPremaqcSchema(next.schema);
  next.vocabulary = PREMAQC_TERM;
  next.dynamic_axes = next.dynamic_axes || [...PREMAQC_DYNAMIC_AXES];
  next.context_only_axes = next.context_only_axes || [...PREMAQC_CONTEXT_ONLY_AXES];
  next.qualia_sonified = false;
  next.authority = {
    ...(next.authority || {}),
    ...PREMAQC_AUTHORITY,
  };
  return Object.freeze(next);
}

export const PREMAQC_NAMING_LAW = Object.freeze({
  canonical: PREMAQC_TERM,
  legacy_term: 'PREMAQ',
  legacy_status: 'compatibility-only',
  rule: 'Current UI, schemas, receipts, package checks and build documentation use PREMAQC. PREMAQ may appear only in explicit legacy aliases while old packets and paths are migrated.',
});
