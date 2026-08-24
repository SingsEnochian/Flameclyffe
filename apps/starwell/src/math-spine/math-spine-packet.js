import { premaqToTemporalState } from '../arcsweep-temporal-quantum/engine.js';
import { advanceWorldCompressionRelease } from '../arcsweep-temporal-quantum/compression-release.js';
import { sha256Hex } from '../world-tone-fold-approval.js';

export const MATH_SPINE_PACKET_SCHEMA = 'hearthgate.math-spine-packet/v1';
export const MATH_SPINE_VERSION = 'hearthgate-braided-spine/1.8';
export const MATH_SPINE_ENGINE_VERSION = 'hearthgate-math-spine/1.0.0';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

function clone(value) {
  return structuredClone(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(`MATH_SPINE_PACKET: ${message}`);
}

function finiteMatrix(value) {
  invariant(Array.isArray(value) && value.length > 0, 'jacobian must contain rows');
  const width = value[0]?.length;
  invariant(Number.isInteger(width) && width > 0, 'jacobian rows must contain values');
  invariant(value.every((row) => Array.isArray(row) && row.length === width), 'jacobian rows must have equal width');
  invariant(value.flat().every(Number.isFinite), 'jacobian values must be finite');
  return clone(value);
}

function transitionProjection(transition) {
  return {
    world_id: transition.world_id,
    jacobian: transition.jacobian,
    fold: transition.fold,
    temporal_driver: transition.temporal_driver,
    released_state: {
      probabilities: transition.state.probabilities,
      derivatives: transition.state.derivatives,
      entropy: transition.state.entropy,
      normalisation: transition.state.normalisation,
      spiral: transition.state.spiral,
      compression_release: transition.state.compression_release,
    },
    tone_sequence: transition.tone_sequence,
    receipt: {
      action: transition.receipt.action,
      focus: transition.receipt.focus,
      compression_strength: transition.receipt.compression_strength,
      compression_gain: transition.receipt.compression_gain,
      release_fraction: transition.receipt.release_fraction,
      derivative_release: transition.receipt.derivative_release,
      memory_release: transition.receipt.memory_release,
      compression_probabilities: transition.receipt.compression_probabilities,
      release_probabilities: transition.receipt.release_probabilities,
      compression_distance: transition.receipt.compression_distance,
      outward_distance: transition.receipt.outward_distance,
      compression_potential: transition.receipt.compression_potential,
      entropy_change: transition.receipt.entropy_change,
      cycle: transition.receipt.cycle,
      next_operation: transition.receipt.next_operation,
    },
  };
}

function packetCore({ input, projection }) {
  return {
    schema: MATH_SPINE_PACKET_SCHEMA,
    schema_version: 1,
    spine_version: MATH_SPINE_VERSION,
    engine_version: MATH_SPINE_ENGINE_VERSION,
    world_id: input.world_profile.worldId,
    source: {
      premaq_id: input.premaq.id,
      premaq_receipt_id: input.premaq.receipt_id,
      premaq_sequence: input.premaq.sequence,
      observed_at: input.premaq.observed_at,
      registry_version: input.premaq.registry_version,
      model_version: input.premaq.model_version,
      provenance_refs: clone(input.premaq.provenance_refs ?? []),
    },
    input,
    projection,
    authority: {
      accepted_state_required: true,
      raw_evidence_mutable: false,
      projection_may_overwrite_source: false,
      release_feeds_next_compression: true,
      deterministic_replay_required: true,
    },
  };
}

function derive(input) {
  const observedAt = new Date(input.premaq.observed_at);
  invariant(!Number.isNaN(observedAt.getTime()), 'PREMAQC observed_at must be a date-time');
  const clock = () => new Date(observedAt);
  let idIndex = 0;
  const idFactory = () => `math-spine-${input.premaq.sequence}-${idIndex++}`;
  const state = premaqToTemporalState(input.premaq, { clock, idFactory });
  return advanceWorldCompressionRelease({
    state,
    jacobian: input.jacobian,
    worldProfile: input.world_profile,
    foldWasActive: input.fold_was_active,
    evolution: input.evolution,
    clock,
    idFactory,
  });
}

export async function createMathSpinePacket({
  premaq,
  jacobian,
  worldProfile,
  foldWasActive = false,
  evolution = {},
  generatedAt,
} = {}) {
  invariant(premaq && typeof premaq === 'object', 'accepted PREMAQC packet is required');
  invariant(worldProfile && typeof worldProfile === 'object', 'world profile is required');
  const input = {
    premaq: clone(premaq),
    jacobian: finiteMatrix(jacobian),
    world_profile: clone(worldProfile),
    fold_was_active: Boolean(foldWasActive),
    evolution: clone(evolution),
  };
  const projection = transitionProjection(derive(input));
  const core = packetCore({ input, projection });
  const packetFingerprint = await sha256Hex(core);
  const sourceFingerprint = await sha256Hex(core.source);
  return Object.freeze({
    ...core,
    packet_id: `math-spine-${packetFingerprint.slice(0, 24)}`,
    packet_fingerprint: packetFingerprint,
    source_fingerprint: sourceFingerprint,
    generated_at: generatedAt ?? new Date().toISOString(),
  });
}

export function validateMathSpinePacket(packet) {
  invariant(packet?.schema === MATH_SPINE_PACKET_SCHEMA, 'unsupported schema');
  invariant(packet.spine_version === MATH_SPINE_VERSION, 'unsupported spine version');
  invariant(packet.engine_version === MATH_SPINE_ENGINE_VERSION, 'unsupported engine version');
  invariant(typeof packet.world_id === 'string' && packet.world_id.length > 0, 'world_id is required');
  invariant(HASH_PATTERN.test(packet.packet_fingerprint), 'packet fingerprint must be SHA-256');
  invariant(HASH_PATTERN.test(packet.source_fingerprint), 'source fingerprint must be SHA-256');
  invariant(packet.input?.world_profile?.worldId === packet.world_id, 'world profile does not match packet world');
  invariant(packet.projection?.world_id === packet.world_id, 'projection does not match packet world');
  return clone(packet);
}

export async function replayMathSpinePacket(packetInput) {
  const packet = validateMathSpinePacket(packetInput);
  const projection = transitionProjection(derive(packet.input));
  const core = packetCore({ input: packet.input, projection });
  const replayFingerprint = await sha256Hex(core);
  return Object.freeze({
    schema: 'hearthgate.math-spine-replay-receipt/v1',
    packet_id: packet.packet_id,
    world_id: packet.world_id,
    expected_fingerprint: packet.packet_fingerprint,
    replay_fingerprint: replayFingerprint,
    matched: replayFingerprint === packet.packet_fingerprint,
    projection,
  });
}
