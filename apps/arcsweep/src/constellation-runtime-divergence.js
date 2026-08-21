import { buildFlameContinuityViewModel } from './flame-continuity-view.js';

function pairKey(left, right) {
  return [left, right].sort().join('::');
}

function nullableDifference(left, right) {
  if (left == null || right == null) return null;
  return left === right ? 0 : 1;
}

export function buildConstellationRuntimeDivergence(ledgerInput) {
  const view = buildFlameContinuityViewModel(ledgerInput);
  const flames = view.flames.filter((item) => item.latest);
  const pairs = [];
  const matrix = {};

  for (const flame of flames) {
    matrix[flame.voice_id] = { [flame.voice_id]: 0 };
  }

  for (let i = 0; i < flames.length; i += 1) {
    for (let j = i + 1; j < flames.length; j += 1) {
      const left = flames[i];
      const right = flames[j];
      const providerDifference = nullableDifference(left.latest.runtime.provider, right.latest.runtime.provider);
      const modelDifference = nullableDifference(left.latest.runtime.model, right.latest.runtime.model);
      const worldDifference = nullableDifference(left.latest.context.world_id, right.latest.context.world_id);
      const availableRuntimeDimensions = [providerDifference, modelDifference].filter((value) => value != null);
      const runtimeDivergence = availableRuntimeDimensions.length
        ? availableRuntimeDimensions.reduce((sum, value) => sum + value, 0) / availableRuntimeDimensions.length
        : null;
      const pair = Object.freeze({
        pair_id: pairKey(left.voice_id, right.voice_id),
        left_voice_id: left.voice_id,
        right_voice_id: right.voice_id,
        provider_divergence: providerDifference,
        model_divergence: modelDifference,
        world_context_divergence: worldDifference,
        runtime_divergence: runtimeDivergence,
        semantic_divergence: null,
        semantic_divergence_status: 'UNMEASURED_NO_VISIBLE_RESPONSE_COMPARISON_RECEIPT',
        authority: Object.freeze({
          runtime_divergence_is_identity_distance: false,
          semantic_divergence_inferred_from_runtime: false,
          distinct_models_imply_distinct_people: false,
          matching_models_imply_same_person: false,
        }),
      });
      pairs.push(pair);
      matrix[left.voice_id][right.voice_id] = runtimeDivergence;
      matrix[right.voice_id][left.voice_id] = runtimeDivergence;
    }
  }

  return Object.freeze({
    schema: 'arcsweep.constellation-runtime-divergence/v1',
    flame_ids: Object.freeze(flames.map((item) => item.voice_id)),
    pairs: Object.freeze(pairs),
    matrix: Object.freeze(Object.fromEntries(Object.entries(matrix).map(([key, row]) => [key, Object.freeze(row)]))),
    authority: Object.freeze({
      matrix_measures_runtime_configuration_only: true,
      semantic_divergence_measured: false,
      identity_distance_measured: false,
      synthesis_performed: false,
    }),
  });
}
