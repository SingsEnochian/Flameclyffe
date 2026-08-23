import {
  createCrossingEnvelope,
  createResponseAuthority,
  createStateSnapshot,
} from './bifrost-crossing-envelope.js';

export const BIFROST_REPLAY_SCHEMA = 'arcsweep.bifrost-replay/v1';
export const BIFROST_CONTROL_TRAJECTORY_SCHEMA = 'arcsweep.bifrost-control-trajectory/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`BIFROST_REPLAY: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  return value;
}

function stableReplayView(envelope) {
  invariant(envelope?.schema === 'arcsweep.bifrost-crossing-envelope/v1', 'canonical crossing envelope is required');
  return freeze({
    crossing_id: envelope.crossing_id,
    source_world: envelope.source.world_identity,
    source_state_id: envelope.source.state_id,
    source_state_hash: envelope.source.state_hash,
    destination_world: envelope.destination.world_identity,
    destination_state_id: envelope.destination.state_id,
    destination_state_hash: envelope.destination.state_hash,
    translation_profile_id: envelope.translation.profile_id,
    translation_profile_version: envelope.translation.profile_version,
    translation_status: envelope.translation.status,
    candidate_invariants: envelope.translation.candidate_invariants,
    transformed_fields: envelope.translation.transformed_fields,
    untranslatable: envelope.translation.untranslatable,
    response_authority: envelope.destination_response?.authority?.register ?? null,
    projection_types: (envelope.projections ?? []).map((receipt) => receipt.projection_type),
    receipt_id: envelope.lineage?.receipt_id ?? null,
  });
}

export function replayCrossingEnvelope(envelope) {
  const replay = stableReplayView(envelope);
  return freeze({
    schema: BIFROST_REPLAY_SCHEMA,
    replay_id: `replay:${envelope.crossing_id}`,
    source_crossing_id: envelope.crossing_id,
    exact: true,
    reconstructed: replay,
  });
}

export function compareReplayToEnvelope(replay, envelope) {
  invariant(replay?.schema === BIFROST_REPLAY_SCHEMA, 'Bifröst replay is required');
  const current = stableReplayView(envelope);
  const expected = replay.reconstructed;
  const fields = Object.keys(expected);
  const differences = fields.filter((field) => JSON.stringify(expected[field]) !== JSON.stringify(current[field]));
  return freeze({
    matches: differences.length === 0,
    differences,
    expected,
    current,
  });
}

export function createReturnCrossing({
  outboundEnvelope,
  returnStateId,
  returnStateHash,
  returnedAt,
  returnedPremaqc = null,
  returnedSpiral = null,
  translatedFields = ['tone', 'glyph_geometry', 'sound_palette', 'narrative_diction', 'temporal_rhythm'],
} = {}) {
  invariant(outboundEnvelope?.destination_response, 'completed outbound crossing is required');
  invariant(outboundEnvelope.source.world_identity === 'earth_prime', 'outbound source must be Earth/Terra Prime');
  invariant(outboundEnvelope.destination.world_identity === 'terra-aeterna', 'outbound destination must be Terra Aeterna');

  const destinationPost = createStateSnapshot({
    worldIdentity: 'terra-aeterna',
    frameworkLabel: 'Terra Aeterna',
    worldRevision: outboundEnvelope.destination.world_revision,
    stateId: outboundEnvelope.destination_response.post_state_id,
    stateHash: outboundEnvelope.destination_response.post_state_hash,
    effectiveAt: returnedAt,
    semanticProfileVersion: outboundEnvelope.destination.semantic_profile_version,
    premaqcVersion: outboundEnvelope.destination.premaqc_version,
    spiralSchemaVersion: outboundEnvelope.destination.spiral_schema_version,
    state: outboundEnvelope.destination_response.interpreted_state,
  });

  const primeReturn = createStateSnapshot({
    worldIdentity: 'Earth Prime',
    frameworkLabel: 'Terra Prime',
    worldRevision: outboundEnvelope.source.world_revision,
    stateId: returnStateId,
    stateHash: returnStateHash,
    effectiveAt: returnedAt,
    semanticProfileVersion: outboundEnvelope.source.semantic_profile_version,
    premaqcVersion: returnedPremaqc?.schema ?? outboundEnvelope.source.premaqc_version,
    spiralSchemaVersion: returnedSpiral?.schema ?? outboundEnvelope.source.spiral_schema_version,
    state: { premaqc: returnedPremaqc, spiral: returnedSpiral },
  });

  const returnAuthority = createResponseAuthority({
    register: 'DETERMINISTIC_ENGINE',
    producer: 'bifrost-return-compiler',
    producerVersion: 'v1',
  });

  return createCrossingEnvelope({
    crossingId: 'bridge-test-001:terra-aeterna-to-earth-prime',
    createdAt: returnedAt,
    source: destinationPost,
    destination: primeReturn,
    translation: {
      profile_id: 'terra-aeterna-to-earth-prime',
      profile_version: 'v1',
      declared_intention: 'bridge-test-001-return',
      candidate_invariants: outboundEnvelope.translation.candidate_invariants,
      transformed_fields: translatedFields,
      untranslatable: [],
      status: 'TRANSLATED',
    },
    destinationResponse: {
      response_id: 'bridge-test-001:earth-prime-return',
      authority: returnAuthority,
      producer: 'earth-prime-endpoint',
      producer_version: 'v1',
      message: 'Earth/Terra Prime received the return crossing.',
      interpreted_state: primeReturn.state,
      post_state_id: primeReturn.state_id,
      post_state_hash: primeReturn.state_hash,
    },
    projections: [],
    lineage: {
      receipt_id: 'crossing:bridge-test-001:return',
      previous_receipt: outboundEnvelope.lineage?.receipt_id ?? null,
      supersedes: null,
      evidence_register: 'ENGINE_DERIVED',
    },
  });
}

export function createControlTrajectory({ outboundEnvelope, returnEnvelope, baselinePrimeSnapshot } = {}) {
  invariant(outboundEnvelope?.source?.world_identity === 'earth_prime', 'Prime departure snapshot is required');
  invariant(returnEnvelope?.destination?.world_identity === 'earth_prime', 'Prime return snapshot is required');
  invariant(baselinePrimeSnapshot?.world_identity === 'earth_prime', 'Prime control snapshot is required');

  return freeze({
    schema: BIFROST_CONTROL_TRAJECTORY_SCHEMA,
    trajectory_id: 'bridge-test-001:control-trajectory',
    departure: outboundEnvelope.source,
    outbound_destination: outboundEnvelope.destination,
    return_state: returnEnvelope.destination,
    baseline_state: baselinePrimeSnapshot,
    path: Object.freeze(['earth_prime', 'terra-aeterna', 'earth_prime']),
    receipt_lineage: Object.freeze([
      outboundEnvelope.lineage?.receipt_id ?? null,
      returnEnvelope.lineage?.receipt_id ?? null,
    ]),
  });
}
