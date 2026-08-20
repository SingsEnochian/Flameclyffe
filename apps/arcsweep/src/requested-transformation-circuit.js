import { attachCuspObservationToFeedbackCycle } from './cusp-feedback-observer.js';
import { ashHistoryFromCuspPackets, createBaiTopologyReceipt, projectBoneToCuspStructure } from './bone-ash-intention.js';
import { ashHistoryFromDeepTimeRecords } from './deep-time-ash.js';
import { TRANSFORMATION_REQUEST_SCHEMA, assessTransformationResponse } from './transformation-request.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const REQUESTED_TRANSFORMATION_CIRCUIT_SCHEMA = 'arcsweep.requested-transformation-circuit/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_REQUEST_CIRCUIT: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function signedAskIntention(request) {
  const sign = request.target.direction === 'increase' ? 1 : -1;
  return Number((sign * finite(request.intervention.strength, 'intervention strength')).toFixed(6));
}

function baiControlSemantics(projection) {
  return Object.freeze({
    a: Object.freeze({
      role: 'structure',
      label: 'Bone / structural constraint',
      unit: 'normalised-cusp-control',
      source: projection,
      intentional: false,
    }),
    b: Object.freeze({
      role: 'intention',
      label: 'Declared Intention',
      unit: 'signed-intervention-strength',
      source: 'receipted-request',
      intentional: true,
    }),
  });
}

/**
 * Ask -> feedback -> domain-semantic cusp -> Bone/Ash/Intention topology ->
 * measured PREMAQC.
 *
 * BAI is one semantic projection of the domain-general cusp machinery. Here,
 * and only here, control B is intentionally the declared Ask.
 *
 * Ash prefers accepted DEEPTime trajectories when they exist. Cusp packet
 * history remains a receipted fallback for live work that has not yet crossed
 * the human acceptance gate into DEEPTime.
 */
export async function runRequestedTransformationCircuit({
  request,
  feedbackCycle,
  structure = null,
  bone = null,
  structureScale = 2,
  ashHistory = null,
  deepTimeRecords = [],
  orderParameter,
  cuspHistory = [],
  generatedAt,
} = {}) {
  invariant(request?.schema === TRANSFORMATION_REQUEST_SCHEMA, 'a receipted transformation Ask is required');
  invariant(feedbackCycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted feedback cycle is required');
  invariant(request.world.id === feedbackCycle.world.id, 'the Ask and feedback cycle must share a world');
  invariant(Number(feedbackCycle.premaqc_after?.sequence) > Number(request.baseline.sequence), 'the feedback response must follow the Ask baseline');
  invariant(feedbackCycle.premaqc_after?.receipt_id, 'the feedback cycle must carry a receipted PREMAQC response');
  invariant(ashHistory === null || Array.isArray(ashHistory), 'ashHistory must be an array when supplied');
  invariant(Array.isArray(deepTimeRecords), 'deepTimeRecords must be an array');

  const intention = signedAskIntention(request);
  const structureProjection = structure === null || structure === undefined
    ? `bone-to-cusp:a=-${structureScale}*B`
    : 'explicit-cusp-structure';
  const resolvedStructure = structure === null || structure === undefined
    ? projectBoneToCuspStructure(bone, { structureScale })
    : finite(structure, 'structure');
  const controlSemantics = baiControlSemantics(structureProjection);

  const cuspEnvelope = await attachCuspObservationToFeedbackCycle({
    cycle: feedbackCycle,
    cusp: {
      controlA: resolvedStructure,
      controlB: intention,
      controlSemantics,
      orderParameter: finite(orderParameter, 'orderParameter'),
    },
    cuspHistory,
    generatedAt: generatedAt ?? feedbackCycle.created_at,
  });

  const deepTimeAsh = ashHistoryFromDeepTimeRecords(deepTimeRecords, { worldId: request.world.id });
  const ashSource = ashHistory !== null
    ? 'explicit-receipted-history'
    : deepTimeAsh.length
      ? 'accepted-deep-time'
      : 'cusp-receipt-fallback';
  const resolvedAshHistory = ashHistory
    ?? (deepTimeAsh.length ? deepTimeAsh : ashHistoryFromCuspPackets(cuspHistory));

  const baiReceipt = await createBaiTopologyReceipt({
    worldId: request.world.id,
    bone,
    structure: structure === null || structure === undefined ? null : resolvedStructure,
    structureScale,
    ashHistory: resolvedAshHistory,
    intention,
    cuspObservation: cuspEnvelope.cusp_observation_packet.observation,
    cuspTrace: cuspEnvelope.cusp_trace_receipt.trace,
    mathSpinePacket: feedbackCycle.math_spine_packet,
    generatedAt: generatedAt ?? feedbackCycle.created_at,
  });

  const cycleCount = Number(feedbackCycle.premaqc_after.sequence) - Number(request.baseline.sequence);
  const response = await assessTransformationResponse({
    request,
    responsePremaqc: feedbackCycle.premaqc_after,
    cycleCount,
    observedAt: generatedAt ?? feedbackCycle.created_at,
  });

  const core = {
    schema: REQUESTED_TRANSFORMATION_CIRCUIT_SCHEMA,
    schema_version: 1,
    world: structuredClone(request.world),
    request: {
      request_id: request.request_id,
      request_fingerprint: request.request_fingerprint,
      status: request.request.status,
    },
    control: {
      source: 'receipted-request',
      vector_u: structuredClone(request.intervention.control_input),
      cusp_control_a: resolvedStructure,
      cusp_control_b: intention,
      cusp_structure_a: resolvedStructure,
      cusp_intention_b: intention,
      cusp_control_semantics: structuredClone(controlSemantics),
      projection: structureProjection,
    },
    feedback: {
      cycle_id: feedbackCycle.cycle_id,
      cycle_fingerprint: feedbackCycle.cycle_fingerprint,
      response_premaqc_receipt_id: feedbackCycle.premaqc_after.receipt_id,
    },
    cusp: {
      envelope_id: cuspEnvelope.envelope_id,
      envelope_fingerprint: cuspEnvelope.envelope_fingerprint,
      observation_packet: structuredClone(cuspEnvelope.cusp_observation_packet),
      trace_receipt: structuredClone(cuspEnvelope.cusp_trace_receipt),
      event_candidates: structuredClone(cuspEnvelope.observer_event_candidates),
    },
    bai: {
      receipt_id: baiReceipt.receipt_id,
      receipt_fingerprint: baiReceipt.receipt_fingerprint,
      state: structuredClone(baiReceipt.bai),
      model: structuredClone(baiReceipt.model),
      topology: structuredClone(baiReceipt.topology),
      authority: structuredClone(baiReceipt.authority),
      ash_source: ashSource,
      ash_source_receipt_ids: resolvedAshHistory.map((item) => item.receipt_id),
    },
    measured_response: structuredClone(response),
    authority: {
      ask_is_control_not_observation: true,
      cusp_controls_are_domain_semantic: true,
      bai_is_one_cusp_projection_not_global_ontology: true,
      structure_is_explicit_observation: structure !== null && structure !== undefined,
      structure_is_bone_projection: structure === null || structure === undefined,
      bone_is_structure_not_qualia: true,
      ash_is_receipted_history: true,
      accepted_deep_time_preferred_for_ash: true,
      cusp_history_is_provisional_ash_fallback: true,
      order_parameter_is_explicit_observation: true,
      intention_is_declared_not_inferred: true,
      intention_is_premaqc_agency: false,
      success_declared_by_request: false,
      premaqc_rewritten: false,
      qualia_inferred: false,
      candidate_is_asserted_event: false,
      canon_commit: false,
      feather_stop_available: true,
    },
  };

  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    circuit_id: `arcsweep-request-circuit-${fingerprint.slice(0, 24)}`,
    circuit_fingerprint: fingerprint,
    created_at: generatedAt ?? feedbackCycle.created_at,
  });
}
