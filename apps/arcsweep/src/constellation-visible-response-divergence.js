import { normaliseFlameContinuityLedger } from './flame-continuity-state.js';
import { compareVisibleResponseSignatures } from './visible-response-correspondence.js';

export const CONSTELLATION_VISIBLE_RESPONSE_DIVERGENCE_SCHEMA = 'arcsweep.constellation-visible-response-divergence/v1';

export async function buildConstellationVisibleResponseDivergence(ledgerInput, { generatedAt = new Date().toISOString() } = {}) {
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  const latest = new Map();
  for (const observation of [...ledger.observations].sort((a, b) => a.observed_at.localeCompare(b.observed_at))) {
    if (observation.context?.visible_response_signature) latest.set(observation.flame.voice_id, observation);
  }
  const flameIds = [...latest.keys()].sort();
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
      const left = latest.get(leftId).context.visible_response_signature;
      const right = latest.get(rightId).context.visible_response_signature;
      const receipt = await compareVisibleResponseSignatures(left, right, { generatedAt });
      correspondence[leftId][rightId] = receipt.response_form_score;
      divergence[leftId][rightId] = Number((1 - receipt.response_form_score).toFixed(8));
    }
  }
  return Object.freeze({
    schema: CONSTELLATION_VISIBLE_RESPONSE_DIVERGENCE_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    flame_ids: Object.freeze(flameIds),
    correspondence: Object.freeze(correspondence),
    divergence: Object.freeze(divergence),
    authority: Object.freeze({
      raw_response_stored: false,
      divergence_is_visible_response_form_only: true,
      semantic_divergence_measured: false,
      identity_distance_measured: false,
      synthesis_performed: false,
      canon_commit: false,
    }),
  });
}
