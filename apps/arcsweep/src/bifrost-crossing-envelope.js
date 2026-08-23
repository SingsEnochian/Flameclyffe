export const EARTH_PRIME_WORLD_ID = 'earth_prime';
export const CROSSING_ENVELOPE_SCHEMA = 'arcsweep.bifrost-crossing-envelope/v1';
export const RESPONSE_AUTHORITY_SCHEMA = 'arcsweep.bifrost-response-authority/v1';
export const PROJECTION_RECEIPT_SCHEMA = 'arcsweep.bifrost-projection-receipt/v1';

export const WORLD_LABELS = Object.freeze({
  [EARTH_PRIME_WORLD_ID]: Object.freeze({
    universal_horizon: 'Earth Prime',
    flameclyffe: 'Terra Prime',
    aliases: Object.freeze(['Earth Prime', 'Terra Prime', 'earth-prime', 'terra-prime']),
  }),
});

function invariant(condition, message) {
  if (!condition) throw new Error(`BIFROST_CROSSING: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  }
  return value;
}

export function resolveWorldIdentity(labelOrId) {
  invariant(typeof labelOrId === 'string' && labelOrId.trim(), 'world identity or label is required');
  const raw = labelOrId.trim();
  if (raw === EARTH_PRIME_WORLD_ID) return EARTH_PRIME_WORLD_ID;
  const earth = WORLD_LABELS[EARTH_PRIME_WORLD_ID];
  if (earth.aliases.some((alias) => alias.toLowerCase() === raw.toLowerCase())) return EARTH_PRIME_WORLD_ID;
  return raw;
}

export function createStateSnapshot({
  worldIdentity,
  frameworkLabel = null,
  worldRevision,
  stateId,
  stateHash,
  effectiveAt,
  observationWatermark = null,
  semanticProfileVersion = null,
  premaqcVersion = null,
  spiralSchemaVersion = null,
  state = null,
} = {}) {
  const world_identity = resolveWorldIdentity(worldIdentity);
  invariant(typeof stateId === 'string' && stateId.trim(), 'stateId is required');
  invariant(typeof stateHash === 'string' && stateHash.trim(), 'stateHash is required');
  invariant(worldRevision !== undefined && worldRevision !== null, 'worldRevision is required');
  invariant(!Number.isNaN(new Date(effectiveAt).getTime()), 'effectiveAt must be a valid date-time');
  return freeze({
    world_identity,
    framework_label: frameworkLabel,
    world_revision: worldRevision,
    state_id: stateId,
    state_hash: stateHash,
    effective_at: new Date(effectiveAt).toISOString(),
    observation_watermark: observationWatermark,
    semantic_profile_version: semanticProfileVersion,
    premaqc_version: premaqcVersion,
    spiral_schema_version: spiralSchemaVersion,
    state,
  });
}

export function createResponseAuthority({ register, producer, producerVersion = null } = {}) {
  invariant(typeof register === 'string' && register.trim(), 'authority register is required');
  invariant(typeof producer === 'string' && producer.trim(), 'authority producer is required');
  return freeze({ schema: RESPONSE_AUTHORITY_SCHEMA, register, producer, producer_version: producerVersion });
}

export function createProjectionReceipt({ projectionType, inputStateId, implementation, implementationVersion = null, artifactId, authority } = {}) {
  invariant(typeof projectionType === 'string' && projectionType.trim(), 'projectionType is required');
  invariant(typeof inputStateId === 'string' && inputStateId.trim(), 'inputStateId is required');
  invariant(typeof implementation === 'string' && implementation.trim(), 'implementation is required');
  invariant(typeof artifactId === 'string' && artifactId.trim(), 'artifactId is required');
  invariant(authority?.schema === RESPONSE_AUTHORITY_SCHEMA, 'response authority is required');
  return freeze({
    schema: PROJECTION_RECEIPT_SCHEMA,
    projection_type: projectionType,
    input_state_id: inputStateId,
    implementation,
    implementation_version: implementationVersion,
    artifact_id: artifactId,
    authority,
  });
}

export function createCrossingEnvelope({
  crossingId,
  createdAt = new Date().toISOString(),
  source,
  destination,
  translation,
  destinationResponse = null,
  projections = [],
  returnCrossing = null,
  lineage = {},
} = {}) {
  invariant(typeof crossingId === 'string' && crossingId.trim(), 'crossingId is required');
  invariant(source?.state_id && source?.state_hash, 'immutable source snapshot is required');
  invariant(destination?.state_id && destination?.state_hash, 'destination pre-state snapshot is required');
  invariant(typeof translation?.profile_id === 'string' && translation.profile_id.trim(), 'translation profile is required');
  invariant(Array.isArray(translation?.candidate_invariants), 'candidate_invariants must be an array');
  invariant(Array.isArray(translation?.transformed_fields), 'transformed_fields must be an array');
  invariant(Array.isArray(translation?.untranslatable), 'untranslatable must be an array');
  invariant(!Number.isNaN(new Date(createdAt).getTime()), 'createdAt must be a valid date-time');

  return freeze({
    schema: CROSSING_ENVELOPE_SCHEMA,
    crossing_id: crossingId,
    created_at: new Date(createdAt).toISOString(),
    source,
    destination,
    translation: {
      profile_id: translation.profile_id,
      profile_version: translation.profile_version ?? null,
      declared_intention: translation.declared_intention ?? null,
      candidate_invariants: translation.candidate_invariants,
      transformed_fields: translation.transformed_fields,
      untranslatable: translation.untranslatable,
      status: translation.status ?? 'PENDING',
    },
    destination_response: destinationResponse,
    projections,
    return: returnCrossing,
    lineage,
  });
}
