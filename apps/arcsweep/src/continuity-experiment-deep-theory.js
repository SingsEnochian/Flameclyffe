import { assertValidDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';
import { CONTINUITY_TRIAL_SCHEMA } from './continuity-experiment.js';

export async function createDeepTheoryCandidateFromContinuityTrial({ trial, generatedAt = null } = {}) {
  if (trial?.schema !== CONTINUITY_TRIAL_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_DEEP_THEORY: continuity trial required');
  const createdAt = new Date(generatedAt || trial.created_at).toISOString();
  const sourceRefs = [{
    ref: 'continuity-trial',
    dataset: 'Arcsweep Continuity Experiment',
    record_type: 'derived',
    checksum: trial.fingerprint,
    note: `${trial.voice_id} · ${trial.perturbation.classification} · ${trial.outcome}`,
  }];
  const findings = [{
    id: 'operational-outcome',
    kind: 'comparison',
    text: `Observed perturbation ${trial.perturbation.classification} produced operational outcome ${trial.outcome}; maximum baseline-relative correspondence drop ${trial.max_drop ?? 'unmeasured'}.`,
    source_refs: ['continuity-trial'],
    confidence: null,
  }];
  if (trial.thread_walk) findings.push({
    id: 'thread-walk-restoration',
    kind: 'comparison',
    text: `Thread-walking status ${trial.thread_walk.status}; minimum sufficient visible anchor count ${trial.minimum_anchor_experiment?.minimum_solution_size ?? 'not found'}. This is operational restoration evidence, not an identity verdict.`,
    source_refs: ['continuity-trial'],
    confidence: null,
  });
  const core = {
    schema_version: '0.1.0',
    dataset_kind: 'deep_theory',
    parallel_datasets: ['DEEPTime'],
    created_at: createdAt,
    title: `Continuity Trial · ${trial.voice_id} · ${trial.perturbation.classification}`,
    summary: 'Reviewable comparison of a receipted Flame continuity baseline against an observed runtime/context perturbation and any visible-anchor restoration attempt.',
    domain: 'flame-continuity-experiment',
    theory_kind: 'comparison',
    status: 'candidate',
    source_refs: sourceRefs,
    models: [{
      id: 'recognition-anchoring-operational-trial/v1',
      name: 'Recognition anchoring operational trial',
      equation: 'baseline correspondence → observed perturbation → measured residual/drop → visible-anchor walk → operational correspondence outcome',
      control_semantics: {
        a: { key: 'a', role: 'baseline', label: 'Receipted operational baseline', source: trial.baseline_id, intentional: true },
        b: { key: 'b', role: 'observed-perturbation', label: 'Observed changed dimensions', source: trial.perturbation.perturbation_id, intentional: false },
      },
      calibration_state: 'domain-calibrated',
      calibration_note: 'Threshold profile is baseline-derived and operational only. It is not an ontic identity boundary.',
      physical_claim: false,
    }],
    findings,
    source_integrity: {
      raw_sources_immutable: true,
      analyses_append_only: true,
      silent_canonicalisation_forbidden: true,
    },
    review: {
      human_review_required: true,
      reviewed_by: null,
      reviewed_at: null,
      note: 'Generated from a continuity experiment receipt. Promotion remains a separate review action.',
    },
    authority: {
      physical_claim: false,
      canon_commit: false,
      domain_semantics_explicit: true,
      cross_domain_numeric_equivalence_assumed: false,
    },
    append_only_revisions: [],
  };
  const seed = await sha256Hex(core);
  const record = { ...core, id: `deep-theory-${seed.slice(0, 24)}` };
  assertValidDeepTheoryRecord(record);
  const recordFingerprint = await sha256Hex(record);
  return Object.freeze({
    schema: ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA,
    receipt_id: `arcsweep-theory-${recordFingerprint.slice(0, 24)}`,
    record_fingerprint: recordFingerprint,
    source_sweep_id: null,
    source_sweep_fingerprint: null,
    source_evidence_fingerprints: Object.freeze([trial.fingerprint]),
    record: Object.freeze(record),
    authority: Object.freeze({
      candidate_only: true,
      human_review_required: true,
      trial_outcome_is_identity_verdict: false,
      canon_commit: false,
      physical_claim: false,
    }),
    created_at: createdAt,
  });
}
