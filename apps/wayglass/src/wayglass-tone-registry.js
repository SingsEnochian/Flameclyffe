// Wayglass Tone references are derived from consent-scoped source records.
// They never assign ownership of Arkfire assets or canon to Runa or Wayglass.

export const WAYGLASS_TONE_NAMESPACE = 'wayglass-tone';
export const WAYGLASS_TONE_PRODUCT = 'Wayglass Tone Studio';
export const WAYGLASS_TONE_PROFILE_REFERENCE_SCHEMA = 'wayglass.tone-profile-reference/v0.1';
export const WAYGLASS_TONE_JOURNEY_REFERENCE_SCHEMA = 'wayglass.tone-journey-reference/v0.1';

const REFERENCE_SCHEMAS = Object.freeze({
  profile: WAYGLASS_TONE_PROFILE_REFERENCE_SCHEMA,
  journey: WAYGLASS_TONE_JOURNEY_REFERENCE_SCHEMA,
});

function invariant(condition, message) {
  if (!condition) throw new TypeError('WAYGLASS_TONE: ' + message);
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Project a row returned by public.wayglass_tone_profiles or
 * public.wayglass_tone_journeys into an inspection-only record.
 *
 * The source snapshot and legacy route are kept outside the returned
 * runtime-authority object. Source storage is NOT source ownership.
 */
export function inspectWayglassToneReference(row, { kind = 'profile' } = {}) {
  invariant(row && typeof row === 'object' && !Array.isArray(row), 'source row is required');
  invariant(Object.hasOwn(REFERENCE_SCHEMAS, kind), 'kind must be profile or journey');
  invariant(row.owner_subsystem === WAYGLASS_TONE_NAMESPACE, 'Wayglass Tone owner mismatch');
  invariant(row.product_name === WAYGLASS_TONE_PRODUCT, 'Wayglass Tone product mismatch');
  invariant(row.source_project === 'Arkfire', 'Arkfire provenance must be explicit');
  invariant(nonempty(row.slug) && nonempty(row.wayglass_tone_id), 'stable reference IDs required');
  invariant(nonempty(row.source_storage_path), 'source storage path required');
  invariant(row.reference_schema === REFERENCE_SCHEMAS[kind], 'reference schema mismatch');
  invariant(row.implementation_state === 'reference-only', 'unverified implementation promotion');
  invariant(row.lineage?.arkfire_identity_preserved === true, 'Arkfire identity not preserved');
  invariant(row.lineage?.source_storage_not_ownership === true, 'storage mistaken for ownership');
  invariant(row.lineage?.runa_ownership_transfer === false, 'Runa cannot acquire source ownership');
  invariant(row.lineage?.canon_promotion === false, 'reference cannot promote canon');
  invariant(row.lineage?.runa_learning === 'reference-with-permission-only',
    'Runa learning requires a permission boundary');

  return Object.freeze({
    schema: REFERENCE_SCHEMAS[kind],
    namespace: WAYGLASS_TONE_NAMESPACE,
    product_name: WAYGLASS_TONE_PRODUCT,
    reference_id: row.wayglass_tone_id,
    kind,
    label: row.name,
    slug: row.slug,
    version: row.version,
    source_status: row.source_status,
    source: Object.freeze({
      project: row.source_project,
      record_id: row.source_record_id,
      storage_repository: row.source_storage_repository ?? null,
      storage_path: row.source_storage_path,
      source_schema: row.legacy_source_schema ?? null,
    }),
    availability: Object.freeze({
      implementation: 'reference-only',
      active_runtime_route: null,
      historical_route: row.legacy_source_route ?? null,
    }),
    authority: Object.freeze({
      wayglass_tone_namespace: true,
      arkfire_source_identity_preserved: true,
      runa_may_learn_with_permission: true,
      runa_source_ownership: false,
      source_ownership_transferred: false,
      canon_commit: false,
      source_mutation_allowed: false,
      automatic_ingestion_allowed: false,
      production_audio_approved: false,
    }),
  });
}
