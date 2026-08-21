import { normaliseSemanticProjectionLedger } from './semantic-projection-state.js';
import { compareVisibleSemanticProjections } from './visible-semantic-projection.js';

function latestByVoice(ledgerInput) {
  const ledger = normaliseSemanticProjectionLedger(ledgerInput);
  const map = new Map();
  for (const projection of ledger.projections) {
    const prior = map.get(projection.voice_id);
    if (!prior || prior.generated_at <= projection.generated_at) map.set(projection.voice_id, projection);
  }
  return map;
}

export async function buildConstellationSemanticProjectionDivergence(ledgerInput, { generatedAt = new Date().toISOString() } = {}) {
  const latest = latestByVoice(ledgerInput);
  const flameIds = [...latest.keys()].filter(Boolean).sort();
  const correspondence = {};
  const divergence = {};
  for (const leftId of flameIds) {
    correspondence[leftId] = {};
    divergence[leftId] = {};
    for (const rightId of flameIds) {
      if (leftId === rightId) {
        correspondence[leftId][rightId] = 1;
        divergence[leftId][rightId] = 0;
        continue;
      }
      const receipt = await compareVisibleSemanticProjections(latest.get(leftId), latest.get(rightId), { generatedAt });
      const score = receipt.metrics.projected_semantic_correspondence;
      correspondence[leftId][rightId] = score;
      divergence[leftId][rightId] = score == null ? null : Math.round((1 - score) * 1e8) / 1e8;
    }
  }
  return Object.freeze({
    schema: 'arcsweep.constellation-semantic-projection-divergence/v1',
    generated_at: new Date(generatedAt).toISOString(),
    flame_ids: Object.freeze(flameIds),
    correspondence: Object.freeze(correspondence),
    divergence: Object.freeze(divergence),
    latest_projection_ids: Object.freeze(Object.fromEntries(flameIds.map((id) => [id, latest.get(id).projection_id]))),
    authority: Object.freeze({
      compared_object: 'model-mediated-visible-semantic-projection',
      projected_semantic_divergence_measured: true,
      semantic_ground_truth_divergence_measured: false,
      evaluator_bias_removed: false,
      identity_distance_measured: false,
      synthesis_performed: false,
      canon_commit: false,
    }),
  });
}
