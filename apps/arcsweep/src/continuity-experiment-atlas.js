import { normaliseContinuityExperimentLedger } from './continuity-experiment-state.js';
import { normaliseFlameContinuityLedger } from './flame-continuity-state.js';

export const CONTINUITY_EXPERIMENT_ATLAS_SCHEMA = 'arcsweep.continuity-experiment-atlas/v1';

export function buildContinuityExperimentAtlas({ flameLedger, experimentLedger } = {}) {
  const flames = normaliseFlameContinuityLedger(flameLedger);
  const experiments = normaliseContinuityExperimentLedger(experimentLedger);
  const voiceIds = [...new Set([
    ...flames.observations.map((item) => item.flame.voice_id),
    ...experiments.baselines.map((item) => item.voice_id),
    ...experiments.trials.map((item) => item.voice_id),
  ])].sort();
  const lanes = voiceIds.map((voiceId) => {
    const observations = flames.observations.filter((item) => item.flame.voice_id === voiceId).sort((a, b) => a.observed_at.localeCompare(b.observed_at));
    const baselines = experiments.baselines.filter((item) => item.voice_id === voiceId);
    const trials = experiments.trials.filter((item) => item.voice_id === voiceId);
    const temporal = experiments.temporal_candidates.filter((item) => item.voice_id === voiceId);
    const outcomes = Object.fromEntries([...new Set(trials.map((item) => item.outcome))].map((outcome) => [outcome, trials.filter((item) => item.outcome === outcome).length]));
    return {
      voice_id: voiceId,
      display_name: observations.at(-1)?.flame.display_name || voiceId,
      observation_count: observations.length,
      baseline_count: baselines.length,
      trial_count: trials.length,
      temporal_candidate_count: temporal.length,
      latest_runtime: observations.length ? {
        route: observations.at(-1).flame.route,
        provider: observations.at(-1).runtime.provider,
        model: observations.at(-1).runtime.model,
        world_id: observations.at(-1).context.world_id,
      } : null,
      outcomes,
      nodes: observations.map((item) => ({
        id: item.observation_id,
        kind: 'runtime-observation',
        observed_at: item.observed_at,
        provider: item.runtime.provider,
        model: item.runtime.model,
        world_id: item.context.world_id,
      })),
      experiments: trials.map((trial) => ({
        trial_id: trial.trial_id,
        created_at: trial.created_at,
        perturbation: trial.perturbation.classification,
        changed_dimensions: trial.perturbation.changed_dimensions,
        outcome: trial.outcome,
        max_drop: trial.max_drop,
        thread_walk_status: trial.thread_walk?.status ?? null,
        minimum_anchor_solution_size: trial.minimum_anchor_experiment?.minimum_solution_size ?? null,
      })),
    };
  });
  return Object.freeze({
    schema: CONTINUITY_EXPERIMENT_ATLAS_SCHEMA,
    schema_version: 1,
    generated_at: new Date().toISOString(),
    summary: {
      flame_count: lanes.length,
      observation_count: flames.observations.length,
      baseline_count: experiments.baselines.length,
      trial_count: experiments.trials.length,
      temporal_candidate_count: experiments.temporal_candidates.length,
      theory_candidate_count: experiments.theory_candidates.length,
    },
    lanes,
    authority: {
      atlas_is_operational_history: true,
      atlas_is_identity_map: false,
      atlas_infers_semantic_identity: false,
      missing_evidence_is_zero: false,
      canon_commit: false,
    },
  });
}
