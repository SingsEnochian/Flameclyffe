import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { CONTINUITY_TRIAL_SCHEMA } from './continuity-experiment.js';
import { CONTINUITY_TEMPORAL_CANDIDATE_SCHEMA } from './continuity-experiment-state.js';

function secondsBetween(left, right) {
  const delta = (Date.parse(right) - Date.parse(left)) / 1000;
  return Number.isFinite(delta) && delta >= 0 ? delta : null;
}

export async function createContinuityTemporalCandidate({ trial, leftObservedAt, rightObservedAt, createdAt = null } = {}) {
  if (trial?.schema !== CONTINUITY_TRIAL_SCHEMA) throw new Error('CONTINUITY_TEMPORAL: continuity trial required');
  const start = leftObservedAt || trial.perturbation?.created_at || trial.created_at;
  const end = rightObservedAt || trial.created_at;
  const core = {
    schema: CONTINUITY_TEMPORAL_CANDIDATE_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt || end).toISOString(),
    dataset_target: 'DEEPTime',
    record_class: 'continuity-temporal-evidence-candidate',
    voice_id: trial.voice_id,
    trial_id: trial.trial_id,
    baseline_id: trial.baseline_id,
    time: {
      utc_start: new Date(start).toISOString(),
      utc_end: new Date(end).toISOString(),
      elapsed_seconds: secondsBetween(start, end),
    },
    event: {
      perturbation_classification: trial.perturbation.classification,
      changed_dimensions: trial.perturbation.changed_dimensions,
      outcome: trial.outcome,
      flattening_signal: trial.flattening_signal,
      max_drop: trial.max_drop,
      minimum_anchor_solution_size: trial.minimum_anchor_experiment?.minimum_solution_size ?? null,
      thread_walk_status: trial.thread_walk?.status ?? null,
    },
    source_receipts: {
      trial_fingerprint: trial.fingerprint,
      correspondence_fingerprint: trial.correspondence_fingerprint,
      perturbation_fingerprint: trial.perturbation.fingerprint,
      thread_walk_fingerprint: trial.thread_walk?.fingerprint ?? null,
      anchor_experiment_fingerprint: trial.minimum_anchor_experiment?.fingerprint ?? null,
    },
    authority: {
      candidate_only: true,
      accepted_deep_time_record: false,
      premaqc_state_implied: false,
      temporal_order_is_observed_receipt_order: true,
      perturbation_proves_causation: false,
      continuity_outcome_is_identity_verdict: false,
      human_review_required_before_deep_time_promotion: true,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, candidate_id: `continuity-time-${fingerprint.slice(0, 24)}`, fingerprint });
}
