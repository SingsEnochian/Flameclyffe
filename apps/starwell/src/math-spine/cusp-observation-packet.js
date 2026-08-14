import {
  analyseCuspCatastrophe,
  analyseCuspTrace,
  normaliseCuspControlSemantics,
} from '../arcsweep-temporal-quantum/cusp-catastrophe.js';
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

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function validateMathSpineSource(packet) {
  invariant(packet?.schema === 'hearthgate.math-spine-packet/v1', 'source must be a Math Spine packet');
  invariant(typeof packet.packet_id === 'string' && packet.packet_id.length > 0, 'source packet_id is required');
  invariant(HASH_PATTERN.test(packet.packet_fingerprint), 'source packet fingerprint must be SHA-256');
  invariant(typeof packet.world_id === 'string' && packet.world_id.length > 0, 'source world_id is required');
  return packet;
}

function resolveControls({ controlA, controlB, structure, intention }) {
  const a = controlA === null || controlA === undefined
    ? finite(structure, 'control a')
    : finite(controlA, 'control a');
  const b = controlB === null || controlB === undefined
    ? finite(intention, 'control b')
    : finite(controlB, 'control b');
  return { a, b };
}

function legacyObservationProjection(observation) {
  return {
    schema: observation.schema,
    model: observation.model,
    controls: {
      structure: observation.controls.structure,
      intention: observation.controls.intention,
    },
    order_parameter: observation.order_parameter,
    potential: {
      form: 'x^4/4 + structure*x^2/2 + intention*x',
      equilibrium_equation: 'x^3 + structure*x + intention = 0',
    },
    fold_polynomial: observation.fold_polynomial,
    cubic_discriminant: observation.cubic_discriminant,
    regime: observation.regime,
    equilibria: clone(observation.equilibria),
    selected_equilibrium: clone(observation.selected_equilibrium),
    history: {
      intention_direction: observation.history.control_b_direction,
      prior_branch: observation.history.prior_branch,
      branch_changed: observation.history.branch_changed,
      path_dependence_possible: observation.history.path_dependence_possible,
      branch_transition_candidate: observation.history.branch_transition_candidate,
    },
    epistemic: {
      observational_model: true,
      physical_claim: false,
      intention_is_premaqc_agency: false,
      hysteresis_requires_trace: true,
    },
  };
}

function packetCore({ source, input, observation, legacy = false }) {
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
    authority: legacy ? {
      observational_only: true,
      physical_claim: false,
      canon_commit: false,
      intention_is_premaqc_agency: false,
      branch_snap_is_event_candidate_only: true,
    } : {
      observational_only: true,
      physical_claim: false,
      canon_commit: false,
      controls_are_domain_semantic: true,
      control_b_is_intention: Boolean(observation.epistemic?.control_b_is_intention),
      intention_is_premaqc_agency: false,
      branch_snap_is_event_candidate_only: true,
    },
  };
}

export async function createCuspObservationPacket({
  mathSpinePacket,
  controlA = null,
  controlB = null,
  structure = null,
  intention = null,
  controlSemantics = null,
  orderParameter = null,
  previousObservation = null,
  generatedAt,
} = {}) {
  const math = validateMathSpineSource(mathSpinePacket);
  const controls = resolveControls({ controlA, controlB, structure, intention });
  const semantics = normaliseCuspControlSemantics(controlSemantics);
  const input = {
    control_a: controls.a,
    control_b: controls.b,
    control_semantics: clone(semantics),
    structure: controls.a,
    intention: controls.b,
    order_parameter: orderParameter === null || orderParameter === undefined ? null : finite(orderParameter, 'orderParameter'),
    previous_observation: previousObservation ? clone(previousObservation) : null,
  };
  const observation = analyseCuspCatastrophe({
    controlA: input.control_a,
    controlB: input.control_b,
    controlSemantics: input.control_semantics,
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
  const legacy = input.control_a === undefined && input.control_b === undefined && input.control_semantics === undefined;
  const analysed = analyseCuspCatastrophe({
    controlA: input.control_a ?? input.structure,
    controlB: input.control_b ?? input.intention,
    controlSemantics: input.control_semantics ?? null,
    orderParameter: input.order_parameter,
    previous: input.previous_observation,
  });
  const observation = legacy ? legacyObservationProjection(analysed) : analysed;
  const core = packetCore({ source: packetInput.source, input, observation, legacy });
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
  const semanticPairs = packets.map((packet) => JSON.stringify(packet.observation?.control_semantics || null));
  const mixedSemantics = new Set(semanticPairs).size > 1;
  const core = {
    schema: CUSP_TRACE_RECEIPT_SCHEMA,
    schema_version: 1,
    world_id: worldIds[0],
    source_packet_ids: packets.map((packet) => packet.packet_id),
    source_packet_fingerprints: packets.map((packet) => packet.packet_fingerprint),
    trace,
    control_semantics: clone(packets.at(-1)?.observation?.control_semantics ?? normaliseCuspControlSemantics()),
    authority: {
      observational_only: true,
      physical_claim: false,
      canon_commit: false,
      controls_are_domain_semantic: true,
      mixed_control_semantics: mixedSemantics,
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
