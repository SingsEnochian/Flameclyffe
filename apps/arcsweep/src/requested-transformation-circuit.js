import { attachCuspObservationToFeedbackCycle } from './cusp-feedback-observer.js';
import {
  TRANSFORMATION_REQUEST_SCHEMA,
  assessTransformationResponse,
} from './transformation-request.js';
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

/**
 * Closes Ask -> feedback -> cusp observation -> PREMAQC measurement as one
 * replayable receipt. The Ask supplies only the bounded control input. It
 * cannot supply structure, order parameter, response state, or success.
 */
export async function runRequestedTransformationCircuit({
  request,
  feedbackCycle,
  structure,
  orderParameter,
  cuspHistory = [],
  generatedAt,
} = {}) {
  invariant(request?.schema === TRANSFORMATION_REQUEST_SCHEMA, 'a receipted transformation Ask is required');
  invariant(feedbackCycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted feedback cycle is required');
  invariant(request.world.id === feedbackCycle.world.id, 'the Ask and feedback cycle must share a world');
  invariant(Number(feedbackCycle.premaqc_after?.sequence) > Number(request.baseline.sequence), 'the feedback response must follow the Ask baseline');
  invariant(feedbackCycle.premaqc_after?.receipt_id, 'the feedback cycle must carry a receipted PREMAQC response');

  const intention = signedAskIntention(request);
  const cuspEnvelope = await attachCuspObservationToFeedbackCycle({
    cycle: feedbackCycle,
    cusp: {
      structure: finite(structure, 'structure'),
      intention,
      orderParameter: finite(orderParameter, 'orderParameter'),
    },
    cuspHistory,
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
      cusp_intention_b: intention,
      projection: 'signed-intervention-strength',
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
    measured_response: structuredClone(response),
    authority: {
      ask_is_control_not_observation: true,
      structure_is_explicit_observation: true,
      order_parameter_is_explicit_observation: true,
      intention_is_premaqc_agency: false,
      success_declared_by_request: false,
      premaqc_rewritten: false,
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
