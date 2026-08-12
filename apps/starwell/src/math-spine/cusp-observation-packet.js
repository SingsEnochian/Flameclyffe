import { analyseCuspCatastrophe, analyseCuspTrace } from '../arcsweep-temporal-quantum/cusp-catastrophe.js';
import { sha256Hex } from '../world-tone-fold-approval.js';

export const CUSP_OBSERVATION_PACKET_SCHEMA = 'hearthgate.cusp-observation-packet/v1';
export const CUSP_TRACE_RECEIPT_SCHEMA = 'hearthgate.cusp-hysteresis-trace-receipt/v1';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

function invariant(condition, message) {
  if (!condition) throw new Error(`CUSP_OBSERVATION_PACKET: ${message}`);
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateMathSpineSource(packet) {
  invariant(packet?.schema === 'hearthgate.math-spine-packet/v1', 'source must be a Math Spine packet');
  invariant(typeof packet.packet_id === 'string' && packet.packet_id.length > 0, 'source packet_id is required');
  invariant(HASH_PATTERN.test(packet.packet_fingerprint), 'source packet fingerprint must be SHA-256');
  invariant(typeof packet.world_id === 'string' && packet.world_id.length > 0, 'source world_id is required');
  return packet;
}

function packetCore({ source, input, observation }) {
  return {
    schema: CUSP_OBSERVATION_PACKET_SCHEMA,
    schema_version: 1,
    world_id: source.world_id,
    source: {
      world_id: source.world_id,
      math_spine_packet_id: source.math_spine_packet_id,
      math_spine_packet_fingerprint: source.math_spine_packet_fingerprint,
    },
    input,
    observation,
    authority: {
      observational_only: true,
      physical_claim: false,
      canon_commit: false,
      intention_is_premaqc_agency: false,
      branch_snap_is_event_candidate_only: true,
    },
  };
}

export async function createCuspObservationPacket({
  mathSpinePacket,
  structure,
  intention,
  orderParameter = null,
  previousObservation = null,
  generatedAt,
} = {}) {
  const math = validateMathSpineSource(mathSpinePacket);
  const input = {
    structure: Number(structure),
    intention: Number(intention),
    order_parameter: orderParameter === null || orderParameter === undefined ? null : Number(orderParameter),
    previous_observation: previousObservation ? clone(previousObservation) : null,
  };
  const observation = analyseCuspCatastrophe({
    structure: input.structure,
    intention: input.intention,
    orderParameter: input.order_parameter,
    previous: input.previous_observation,
  });
  const source = {
    world_id: math.world_id,
    math_spine_packet_id: math.packet_id,
    math_spine_packet_fingerprint: math.packet_fingerprint,
  };
  const core = packetCore({ source, input, observation });
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    packet_id: `cusp-observation-${fingerprint.slice(0, 24)}`,
    packet_fingerprint: fingerprint,
    generated_at: generatedAt ?? new Date().toISOString(),
  });
}

export async function replayCuspObservationPacket(packetInput) {
  invariant(packetInput?.schema === CUSP_OBSERVATION_PACKET_SCHEMA, 'unsupported schema');
  invariant(HASH_PATTERN.test(packetInput.packet_fingerprint), 'packet fingerprint must be SHA-256');
  const input = clone(packetInput.input);
  const observation = analyseCuspCatastrophe({
    structure: input.structure,
    intention: input.intention,
    orderParameter: input.order_parameter,
    previous: input.previous_observation,
  });
  const core = packetCore({ source: packetInput.source, input, observation });
  const replayFingerprint = await sha256Hex(core);
  return deepFreeze({
    schema: 'hearthgate.cusp-observation-replay-receipt/v1',
    packet_id: packetInput.packet_id,
    world_id: packetInput.world_id,
    expected_fingerprint: packetInput.packet_fingerprint,
    replay_fingerprint: replayFingerprint,
    matched: replayFingerprint === packetInput.packet_fingerprint,
    observation,
  });
}

export async function createCuspTraceReceipt(cuspPackets, { generatedAt } = {}) {
  invariant(Array.isArray(cuspPackets) && cuspPackets.length > 0, 'at least one cusp packet is required');
  const packets = cuspPackets.map((packet) => {
    invariant(packet?.schema === CUSP_OBSERVATION_PACKET_SCHEMA, 'trace inputs must be cusp observation packets');
    invariant(HASH_PATTERN.test(packet.packet_fingerprint), 'trace packet fingerprint must be SHA-256');
    return packet;
  });
  const worldIds = [...new Set(packets.map((packet) => packet.world_id))];
  invariant(worldIds.length === 1, 'hysteresis traces must remain world-scoped');
  const trace = analyseCuspTrace(packets.map((packet) => packet.observation));
  const core = {
    schema: CUSP_TRACE_RECEIPT_SCHEMA,
    schema_version: 1,
    world_id: worldIds[0],
    source_packet_ids: packets.map((packet) => packet.packet_id),
    source_packet_fingerprints: packets.map((packet) => packet.packet_fingerprint),
    trace,
    authority: {
      observational_only: true,
      physical_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    receipt_id: `cusp-trace-${fingerprint.slice(0, 24)}`,
    receipt_fingerprint: fingerprint,
    generated_at: generatedAt ?? new Date().toISOString(),
  });
}
