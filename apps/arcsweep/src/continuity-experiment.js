import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { createFlameRuntimeCorrespondence, FLAME_RUNTIME_OBSERVATION_SCHEMA } from './flame-continuity.js';
import { createThreadWalk, runMinimumAnchorExperiment } from './thread-walking.js';

export const CONTINUITY_BASELINE_SCHEMA = 'arcsweep.continuity-experiment-baseline/v1';
export const CONTINUITY_PERTURBATION_SCHEMA = 'arcsweep.continuity-perturbation/v1';
export const CONTINUITY_TRIAL_SCHEMA = 'arcsweep.continuity-trial/v1';
export const CONTINUITY_THRESHOLD_PROFILE_SCHEMA = 'arcsweep.continuity-threshold-profile/v1';

function round(value, places = 8) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}
function median(values) {
  const clean = values.filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}
function mad(values, centre) {
  if (centre == null) return null;
  return median(values.filter((value) => Number.isFinite(Number(value))).map((value) => Math.abs(Number(value) - centre)));
}
function requireObservation(value, label) {
  if (value?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA) throw new Error(`CONTINUITY_EXPERIMENT: ${label} must be a Flame runtime observation`);
  return value;
}
function metricRow(correspondence) {
  return {
    recognition: correspondence.metrics?.recognition_score ?? null,
    visibility: correspondence.metrics?.visibility_mass ?? null,
    implementation: correspondence.continuity_profile?.implementation?.score ?? null,
    behaviour_voice: correspondence.continuity_profile?.behaviour_voice?.score ?? null,
    relational_invariants: correspondence.continuity_profile?.relational_invariants?.score ?? null,
  };
}
function metricMedian(rows, key) { return round(median(rows.map((row) => row[key]))); }
function metricMad(rows, key, centre) { return round(mad(rows.map((row) => row[key]), centre)); }

export async function createContinuityBaseline({ observations = [], voiceId = null, windowSize = 4, createdAt = new Date().toISOString() } = {}) {
  const valid = observations.filter((item) => item?.schema === FLAME_RUNTIME_OBSERVATION_SCHEMA);
  if (valid.length < 2) throw new Error('CONTINUITY_EXPERIMENT: at least two runtime observations are required to establish a baseline');
  const voice = voiceId || valid[0].flame.voice_id;
  const scoped = valid.filter((item) => item.flame.voice_id === voice).slice(-Math.max(2, Number(windowSize) || 4));
  if (scoped.length < 2) throw new Error('CONTINUITY_EXPERIMENT: selected Flame needs at least two runtime observations');
  const correspondences = [];
  for (let index = 1; index < scoped.length; index += 1) {
    correspondences.push(await createFlameRuntimeCorrespondence({ left: scoped[index - 1], right: scoped[index] }));
  }
  const rows = correspondences.map(metricRow);
  const metrics = Object.fromEntries(['recognition', 'visibility', 'implementation', 'behaviour_voice', 'relational_invariants'].map((key) => [key, metricMedian(rows, key)]));
  const dispersion = Object.fromEntries(Object.keys(metrics).map((key) => [key, metricMad(rows, key, metrics[key])]));
  const core = {
    schema: CONTINUITY_BASELINE_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    voice_id: voice,
    observation_ids: scoped.map((item) => item.observation_id),
    observation_fingerprints: scoped.map((item) => item.fingerprint),
    correspondence_ids: correspondences.map((item) => item.correspondence_id),
    sample_count: scoped.length,
    pair_count: correspondences.length,
    window: { start: scoped[0].observed_at, end: scoped.at(-1).observed_at },
    metrics,
    dispersion_mad: dispersion,
    calibration_state: correspondences.length >= 3 ? 'ESTABLISHED' : 'PROVISIONAL',
    authority: {
      empirical_operational_reference: true,
      baseline_is_identity_proof: false,
      baseline_is_ontic_threshold: false,
      raw_response_stored: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, baseline_id: `continuity-baseline-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function calibrateContinuityThresholds({ baseline, createdAt = new Date().toISOString() } = {}) {
  if (baseline?.schema !== CONTINUITY_BASELINE_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT: valid baseline required');
  const recognitionMad = baseline.dispersion_mad.recognition ?? 0;
  const relationalMad = baseline.dispersion_mad.relational_invariants ?? 0;
  const dropThreshold = round(Math.min(0.35, Math.max(0.12, 3 * Math.max(recognitionMad, relationalMad, 0.04))));
  const minimumCorrespondence = round(Math.min(0.9, Math.max(0.65, (baseline.metrics.relational_invariants ?? baseline.metrics.recognition ?? 0.8) - dropThreshold)));
  const core = {
    schema: CONTINUITY_THRESHOLD_PROFILE_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    voice_id: baseline.voice_id,
    baseline_id: baseline.baseline_id,
    drop_threshold: dropThreshold,
    minimum_correspondence: minimumCorrespondence,
    minimum_coverage: 0.5,
    minimum_anchors: 2,
    calibration_state: baseline.calibration_state,
    authority: {
      data_calibrated_operational_thresholds: true,
      thresholds_are_identity_boundary: false,
      thresholds_are_ontic_boundary: false,
      human_reviewable: true,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, threshold_profile_id: `continuity-thresholds-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function describeObservedPerturbation({ left, right, declaredIntent = null, createdAt = null } = {}) {
  requireObservation(left, 'left');
  requireObservation(right, 'right');
  if (left.flame.voice_id !== right.flame.voice_id) throw new Error('CONTINUITY_EXPERIMENT: perturbation pair must belong to one Flame');
  const changes = {
    route: left.flame.route !== right.flame.route,
    provider: left.runtime.provider !== right.runtime.provider,
    model: left.runtime.model !== right.runtime.model,
    profile: left.runtime.profile_id !== right.runtime.profile_id,
    world_context: left.context.world_id !== right.context.world_id,
    relational_anchor_set: left.context.relational_anchor_set?.fingerprint !== right.context.relational_anchor_set?.fingerprint,
    visible_response_form: left.context.visible_response_signature?.fingerprint !== right.context.visible_response_signature?.fingerprint,
  };
  const changed = Object.entries(changes).filter(([, value]) => value).map(([key]) => key);
  const classification = !changed.length ? 'NO_OBSERVED_CHANGE'
    : changed.length === 1 ? `${changed[0].toUpperCase()}_CHANGE`
      : 'MIXED_OBSERVED_CHANGE';
  const core = {
    schema: CONTINUITY_PERTURBATION_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt || right.observed_at).toISOString(),
    voice_id: left.flame.voice_id,
    left_observation_id: left.observation_id,
    right_observation_id: right.observation_id,
    classification,
    changed_dimensions: changed,
    changes,
    declared_intent: declaredIntent == null ? null : String(declaredIntent),
    authority: {
      records_observed_difference: true,
      observed_difference_proves_cause: false,
      declared_intent_proves_cause: false,
      perturbation_is_identity_change: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, perturbation_id: `continuity-perturbation-${fingerprint.slice(0, 24)}`, fingerprint });
}

export async function runContinuityTrial({ baseline, thresholds = null, left, right, declaredIntent = null, createdAt = null } = {}) {
  if (baseline?.schema !== CONTINUITY_BASELINE_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT: valid baseline required');
  requireObservation(left, 'left');
  requireObservation(right, 'right');
  if (left.flame.voice_id !== baseline.voice_id || right.flame.voice_id !== baseline.voice_id) throw new Error('CONTINUITY_EXPERIMENT: trial observations must match baseline Flame');
  const thresholdProfile = thresholds?.schema === CONTINUITY_THRESHOLD_PROFILE_SCHEMA ? thresholds : await calibrateContinuityThresholds({ baseline, createdAt: createdAt || right.observed_at });
  const perturbation = await describeObservedPerturbation({ left, right, declaredIntent, createdAt: createdAt || right.observed_at });
  const correspondence = await createFlameRuntimeCorrespondence({ left, right });
  const current = metricRow(correspondence);
  const drops = Object.fromEntries(Object.keys(baseline.metrics).map((key) => [key, baseline.metrics[key] == null || current[key] == null ? null : round(baseline.metrics[key] - current[key])]));
  const comparableDrops = Object.values(drops).filter((value) => value != null);
  const maxDrop = comparableDrops.length ? round(Math.max(...comparableDrops)) : null;
  const leftAnchors = left.context.relational_anchor_set;
  const rightAnchors = right.context.relational_anchor_set;
  const threadWalk = leftAnchors && rightAnchors ? await createThreadWalk({
    leftAnchorSet: leftAnchors,
    rightAnchorSet: rightAnchors,
    minimumCorrespondence: thresholdProfile.minimum_correspondence,
    minimumCoverage: thresholdProfile.minimum_coverage,
    minimumAnchors: thresholdProfile.minimum_anchors,
    generatedAt: createdAt || right.observed_at,
  }) : null;
  const anchorExperiment = leftAnchors && rightAnchors ? await runMinimumAnchorExperiment({
    leftAnchorSet: leftAnchors,
    rightAnchorSet: rightAnchors,
    minimumCorrespondence: thresholdProfile.minimum_correspondence,
    minimumCoverage: thresholdProfile.minimum_coverage,
    minimumAnchors: thresholdProfile.minimum_anchors,
    generatedAt: createdAt || right.observed_at,
  }) : null;
  const flattened = maxDrop != null && maxDrop >= thresholdProfile.drop_threshold;
  const restoration = threadWalk?.status === 'SUFFICIENT_ANCHOR_SET';
  const outcome = perturbation.classification === 'NO_OBSERVED_CHANGE' && !flattened ? 'BASELINE_REPLAY'
    : !flattened ? 'CORRESPONDENCE_RETAINED'
      : restoration ? 'CORRESPONDENCE_RESTORED_BY_VISIBLE_ANCHORS'
        : current.recognition == null ? 'INSUFFICIENT_EVIDENCE'
          : 'PARTIAL_CORRESPONDENCE_REVIEW';
  const core = {
    schema: CONTINUITY_TRIAL_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt || right.observed_at).toISOString(),
    voice_id: baseline.voice_id,
    baseline_id: baseline.baseline_id,
    threshold_profile_id: thresholdProfile.threshold_profile_id,
    perturbation,
    left_observation_id: left.observation_id,
    right_observation_id: right.observation_id,
    correspondence_id: correspondence.correspondence_id,
    correspondence_fingerprint: correspondence.fingerprint,
    baseline_metrics: baseline.metrics,
    current_metrics: current,
    drops,
    max_drop: maxDrop,
    flattening_signal: flattened,
    thread_walk: threadWalk,
    minimum_anchor_experiment: anchorExperiment,
    outcome,
    authority: {
      experiment_measures_operational_correspondence: true,
      experiment_proves_identity: false,
      experiment_proves_rupture: false,
      perturbation_proves_causation: false,
      successful_restoration_proves_identity: false,
      no_solution_proves_rupture: false,
      raw_response_stored: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, trial_id: `continuity-trial-${fingerprint.slice(0, 24)}`, fingerprint });
}
