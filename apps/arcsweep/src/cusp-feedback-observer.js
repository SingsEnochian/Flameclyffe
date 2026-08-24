import { runFeedbackCycle } from './feedback-loop.js';
import {
  CUSP_OBSERVATION_PACKET_SCHEMA,
  createCuspObservationPacket,
  createCuspTraceReceipt,
  replayCuspObservationPacket,
} from '../../starwell/src/math-spine/cusp-observation-packet.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA = 'arcsweep.cusp-observed-feedback/v1';
export const ARCSWEEP_OBSERVER_EVENT_CANDIDATE_SCHEMA = 'arcsweep.observer-event-candidate/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_CUSP_OBSERVER: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function normaliseCuspInput(cusp, history) {
  invariant(cusp && typeof cusp === 'object', 'cusp controls are required');
  const previousObservation = cusp.previousObservation
    || history.at(-1)?.observation
    || null;
  const controlA = cusp.controlA ?? cusp.structure;
  const controlB = cusp.controlB ?? cusp.intention;
  return Object.freeze({
    controlA: finite(controlA, 'control a'),
    controlB: finite(controlB, 'control b'),
    controlSemantics: cusp.controlSemantics && typeof cusp.controlSemantics === 'object'
      ? structuredClone(cusp.controlSemantics)
      : null,
    orderParameter: cusp.orderParameter === null || cusp.orderParameter === undefined
      ? null
      : finite(cusp.orderParameter, 'orderParameter'),
    previousObservation,
  });
}

function validateHistory(history, worldId) {
  invariant(Array.isArray(history), 'cuspHistory must be an array');
  for (const packet of history) {
    invariant(packet?.schema === CUSP_OBSERVATION_PACKET_SCHEMA, 'cuspHistory entries must be cusp observation packets');
    invariant(packet.world_id === worldId, 'cuspHistory must remain inside the active world');
  }
  return history;
}

function buildObserverEventCandidates(cuspPacket, traceReceipt, observedAt) {
  const observation = cuspPacket.observation;
  if (!observation?.history?.branch_transition_candidate) return Object.freeze([]);
  const candidate = Object.freeze({
    schema: ARCSWEEP_OBSERVER_EVENT_CANDIDATE_SCHEMA,
    candidate_id: `observer-branch-snap-${cuspPacket.packet_fingerprint.slice(0, 20)}`,
    candidate_type: 'branch-snap',
    status: 'candidate',
    world_id: cuspPacket.world_id,
    observed_at: observedAt,
    controls: structuredClone(observation.controls),
    control_semantics: structuredClone(observation.control_semantics),
    selected_equilibrium: structuredClone(observation.selected_equilibrium),
    prior_branch: observation.history.prior_branch,
    branch_changed: observation.history.branch_changed,
    hysteresis_witnessed: Boolean(traceReceipt?.trace?.hysteresis_detected),
    source: Object.freeze({
      cusp_observation_packet_id: cuspPacket.packet_id,
      cusp_observation_packet_fingerprint: cuspPacket.packet_fingerprint,
      math_spine_packet_id: cuspPacket.source.math_spine_packet_id,
      math_spine_packet_fingerprint: cuspPacket.source.math_spine_packet_fingerprint,
    }),
    authority: Object.freeze({
      event_asserted: false,
      canon_commit: false,
      requires_evidence_review: true,
      may_drive_sound_automatically: false,
    }),
  });
  return Object.freeze([candidate]);
}

/**
 * Adds a cusp observation beside an already receipted feedback cycle.
 * The base feedback cycle and PREMAQC state are never rewritten by this layer.
 *
 * The cusp controls are domain-general. `structure` / `intention` remain valid
 * aliases for BAI callers, while `controlA` / `controlB` plus
 * `controlSemantics` allow non-intentional physical or computational domains.
 */
export async function attachCuspObservationToFeedbackCycle({
  cycle,
  cusp,
  cuspHistory = [],
  generatedAt,
} = {}) {
  invariant(cycle?.schema === 'arcsweep.feedback-cycle/v1', 'a receipted Arcsweep feedback cycle is required');
  const history = validateHistory(cuspHistory, cycle.world.id);
  const input = normaliseCuspInput(cusp, history);
  const cuspPacket = await createCuspObservationPacket({
    mathSpinePacket: cycle.math_spine_packet,
    controlA: input.controlA,
    controlB: input.controlB,
    controlSemantics: input.controlSemantics,
    orderParameter: input.orderParameter,
    previousObservation: input.previousObservation,
    generatedAt: generatedAt ?? cycle.created_at,
  });
  const cuspReplay = await replayCuspObservationPacket(cuspPacket);
  invariant(cuspReplay.matched, 'cusp observation deterministic replay did not match');
  const traceReceipt = await createCuspTraceReceipt([...history, cuspPacket], {
    generatedAt: generatedAt ?? cycle.created_at,
  });
  const candidates = buildObserverEventCandidates(cuspPacket, traceReceipt, generatedAt ?? cycle.created_at);

  const core = {
    schema: ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA,
    schema_version: 1,
    world: structuredClone(cycle.world),
    base_cycle_id: cycle.cycle_id,
    base_cycle_fingerprint: cycle.cycle_fingerprint,
    cusp_observation_packet: cuspPacket,
    cusp_replay_receipt: cuspReplay,
    cusp_trace_receipt: traceReceipt,
    observer_event_candidates: candidates,
    authority: {
      observational_only: true,
      base_cycle_mutable: false,
      premaqc_mutable: false,
      controls_are_domain_semantic: true,
      control_b_is_intention: Boolean(cuspPacket.observation.epistemic?.control_b_is_intention),
      intention_is_premaqc_agency: false,
      candidate_is_asserted_event: false,
      candidate_may_drive_sound_automatically: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    envelope_id: `arcsweep-cusp-${fingerprint.slice(0, 24)}`,
    envelope_fingerprint: fingerprint,
    feedback_cycle: cycle,
    created_at: generatedAt ?? cycle.created_at,
  });
}

/**
 * Convenience path for Arcsweep callers that explicitly provide cusp controls.
 * No controls are inferred from prose, PREMAQC, Agency, sound cues, or ambient data.
 */
export async function runCuspObservedFeedbackCycle({ cusp, cuspHistory = [], ...feedbackInput } = {}) {
  invariant(cusp && typeof cusp === 'object', 'explicit cusp controls are required');
  const cycle = await runFeedbackCycle(feedbackInput);
  return attachCuspObservationToFeedbackCycle({
    cycle,
    cusp,
    cuspHistory,
    generatedAt: feedbackInput.observedAt,
  });
}
