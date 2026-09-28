import { runIgnitionCycle } from './ignition-loop.js';
import { adaptObserverEvent } from './observer-event-adapter.js';
import { createPremaqcPossibilityEvaluator } from './premaqc-possibility-adapter.js';

export const PREMAQC_OBSERVER_IGNITION_SCHEMA = 'arcsweep.premaqc-observer-ignition/v0.1';
export const PREMAQC_FEEDBACK_EVIDENCE_SCHEMA = 'arcsweep.premaqc-feedback-evidence/v0.1';

export function buildIgnitionFeedbackEvidence({ cycle, observation, premaqc }) {
  if (!cycle?.feedbackObservation || !cycle?.receipt) return null;
  return Object.freeze({
    schema: PREMAQC_FEEDBACK_EVIDENCE_SCHEMA,
    source_kind: 'arcsweep-ignition-cycle',
    source_id: cycle.feedbackObservation.id,
    observed_at: cycle.feedbackObservation.occurredAt || null,
    trajectory_id: cycle.trajectory?.id || null,
    observer_ref: observation?.id || null,
    premaqc_ref: premaqc?.id || premaqc?.receipt_id || null,
    premaqc_sequence: Number.isFinite(Number(premaqc?.sequence)) ? Number(premaqc.sequence) : null,
    capability_request_id: cycle.request?.id || null,
    capability: cycle.request?.capability || null,
    authority: cycle.decision?.authority || null,
    route: cycle.decision?.route || null,
    execution_receipt_id: cycle.receipt.id,
    execution_status: cycle.receipt.status,
    evidence_refs: Object.freeze([...(cycle.receipt.evidenceRefs || [])]),
    changes: Object.freeze([...(cycle.receipt.changes || [])]),
    provenance: Object.freeze({
      observer_schema: observation?.schema || null,
      possibility_schema: cycle.possibility?.schema || null,
      receipt_schema: cycle.receipt?.schema || null,
      raw_observer_preserved: observation?.rawField != null,
      transformation_receipts_preserved: Array.isArray(observation?.transformations),
      premaqc_mutated_by_adapter: false,
    }),
  });
}

export async function runPremaqcObserverIgnition({
  trajectory,
  observerPayload,
  observerOptions = {},
  premaqc,
  possibilityOptions = {},
  cognition,
  negotiate,
  execute,
  idFactory,
  now,
} = {}) {
  if (!premaqc?.state) throw new Error('premaqc-state-required');
  const observation = adaptObserverEvent(observerPayload, observerOptions);
  const possibilityEvaluator = createPremaqcPossibilityEvaluator({
    premaqc,
    ...possibilityOptions,
  });

  const cycle = await runIgnitionCycle({
    trajectory,
    observation,
    possibilityEvaluator,
    cognition,
    negotiate,
    execute,
    ...(idFactory ? { idFactory } : {}),
    ...(now ? { now } : {}),
  });

  const feedbackEvidence = buildIgnitionFeedbackEvidence({ cycle, observation, premaqc });

  return Object.freeze({
    schema: PREMAQC_OBSERVER_IGNITION_SCHEMA,
    observation,
    premaqcRef: premaqc.id || premaqc.receipt_id || null,
    premaqcSequence: Number.isFinite(Number(premaqc.sequence)) ? Number(premaqc.sequence) : null,
    cycle,
    feedbackEvidence,
    premaqcMutation: 'none',
  });
}
