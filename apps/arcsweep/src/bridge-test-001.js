import {
  createCrossingEnvelope,
  createProjectionReceipt,
  createResponseAuthority,
} from './bifrost-crossing-envelope.js';

function invariant(condition, message) {
  if (!condition) throw new Error(`BRIDGE_TEST_001: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  return value;
}

export function translatePrimeToTerraAeterna({ sourceEndpoint, destinationEndpoint, intention = 'cross-and-answer' } = {}) {
  invariant(sourceEndpoint?.lit === true, 'source shore must be fully lit');
  invariant(destinationEndpoint?.lit === true, 'destination shore must be fully lit');
  invariant(sourceEndpoint.world_identity === 'earth_prime', 'source must resolve to Earth/Terra Prime');
  invariant(destinationEndpoint.world_identity === 'terra-aeterna', 'destination must be Terra Aeterna');

  const preserved = ['identity_lineage', 'provenance', 'agency', 'declared_intention'];
  const transformed = ['tone', 'glyph_geometry', 'sound_palette', 'narrative_diction', 'temporal_rhythm'];
  const sourceState = sourceEndpoint.snapshot.state ?? {};
  const destinationState = destinationEndpoint.snapshot.state ?? {};

  return freeze({
    profile_id: 'earth-prime-to-terra-aeterna',
    profile_version: 'v1',
    declared_intention: intention,
    candidate_invariants: preserved,
    transformed_fields: transformed,
    untranslatable: [],
    status: 'TRANSLATED',
    translated_state: {
      source_premaqc: sourceState.premaqc ?? sourceEndpoint.premaqc,
      destination_premaqc: destinationState.premaqc ?? destinationEndpoint.premaqc,
      source_spiral: sourceState.spiral ?? sourceEndpoint.spiral,
      destination_spiral: destinationState.spiral ?? destinationEndpoint.spiral,
      world_expression: {
        world_identity: destinationEndpoint.world_identity,
        world_hum_hz: destinationEndpoint.world_profile.root_hz,
        acoustic_identity: destinationEndpoint.world_profile.acoustic_identity,
        canon_context: destinationEndpoint.canon_context,
      },
    },
  });
}

export function answerAtTerraAeterna({ crossingState, destinationEndpoint } = {}) {
  invariant(crossingState?.status === 'TRANSLATED', 'translated crossing state is required');
  invariant(destinationEndpoint?.lit === true, 'destination shore must remain lit');

  const authority = createResponseAuthority({
    register: 'WORLD_PROFILE',
    producer: 'terra-aeterna-endpoint',
    producerVersion: 'v1',
  });

  return freeze({
    response_id: 'bridge-test-001:terra-aeterna-answer',
    authority,
    producer: 'terra-aeterna-endpoint',
    producer_version: 'v1',
    message: 'Terra Aeterna received and answered the crossing.',
    interpreted_state: crossingState.translated_state,
    post_state_id: `${destinationEndpoint.snapshot.state_id}:answered`,
    post_state_hash: `${destinationEndpoint.snapshot.state_hash}:answered`,
  });
}

export function runBridgeTest001({ sourceEndpoint, destinationEndpoint, createdAt = new Date().toISOString() } = {}) {
  const translation = translatePrimeToTerraAeterna({ sourceEndpoint, destinationEndpoint, intention: 'bridge-test-001' });
  const destinationResponse = answerAtTerraAeterna({ crossingState: translation, destinationEndpoint });

  const projections = ['glyph', 'runa', 'storywork', 'ui'].map((projectionType) => createProjectionReceipt({
    projectionType,
    inputStateId: destinationEndpoint.snapshot.state_id,
    implementation: `bridge-test-001-${projectionType}-projection`,
    implementationVersion: 'v1',
    artifactId: `${projectionType}:bridge-test-001`,
    authority: destinationResponse.authority,
  }));

  const envelope = createCrossingEnvelope({
    crossingId: 'bridge-test-001:earth-prime-to-terra-aeterna',
    createdAt,
    source: sourceEndpoint.snapshot,
    destination: destinationEndpoint.snapshot,
    translation,
    destinationResponse,
    projections,
    lineage: {
      receipt_id: 'crossing:bridge-test-001:outbound',
      previous_receipt: sourceEndpoint.receipts.at(-1) ?? null,
      supersedes: null,
      evidence_register: 'ENGINE_DERIVED',
    },
  });

  return freeze({
    test_id: 'Bridge Test 001',
    source_lit: sourceEndpoint.lit,
    destination_lit: destinationEndpoint.lit,
    crossing_complete: Boolean(envelope.destination_response),
    envelope,
  });
}
