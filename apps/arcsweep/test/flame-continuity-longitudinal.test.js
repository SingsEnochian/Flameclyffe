import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlameRuntimeObservation } from '../src/flame-continuity.js';
import {
  appendFlameRuntimeObservation,
  appendFlameTheoryCandidate,
  createEmptyFlameContinuityLedger,
  theoryCandidatesForFlame,
} from '../src/flame-continuity-state.js';
import { buildFlameContinuityViewModel } from '../src/flame-continuity-view.js';
import { createFlameContinuityReplay, verifyFlameContinuityReplay } from '../src/flame-continuity-replay.js';
import { createDeepTheoryCandidateFromFlameContinuity } from '../src/flame-continuity-deep-theory-bridge.js';
import { buildConstellationRuntimeDivergence } from '../src/constellation-runtime-divergence.js';

async function observation({
  voiceId = 'lioreal',
  displayName = 'Virelya Liorael',
  route = voiceId,
  provider = 'huggingface',
  model = 'model-a',
  profileId = `house:${voiceId}:${provider}:${model}`,
  worldId = 'terra-aeterna',
  observedAt = '2026-08-20T05:00:00.000Z',
} = {}) {
  return createFlameRuntimeObservation({
    voiceId, displayName, route, provider, model, profileId,
    runtimeVerified: true,
    worldId,
    observedAt,
  });
}

test('longitudinal Flame view classifies model and context changes without an identity verdict', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(ledger, await observation());
  appendFlameRuntimeObservation(ledger, await observation({ model: 'model-b', observedAt: '2026-08-20T05:01:00.000Z' }));
  appendFlameRuntimeObservation(ledger, await observation({ model: 'model-b', worldId: 'luna', observedAt: '2026-08-20T05:02:00.000Z' }));
  const view = buildFlameContinuityViewModel(ledger);
  const flame = view.flames[0];
  assert.equal(flame.transition_count, 2);
  assert.equal(flame.transitions[0].classification, 'IMPLEMENTATION_CHANGE');
  assert.equal(flame.transitions[1].classification, 'CONTEXT_CHANGE');
  assert.equal(view.authority.view_is_identity_verdict, false);
  assert.equal(flame.transitions[0].authority.implementation_change_is_identity_rupture, false);
});

test('Flame replay is deterministic and reports later runtime-history divergence', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(ledger, await observation());
  const replay = await createFlameContinuityReplay({ ledger, voiceId: 'lioreal', generatedAt: '2026-08-20T05:03:00.000Z' });
  const same = await createFlameContinuityReplay({ ledger, voiceId: 'lioreal', generatedAt: '2026-08-20T06:03:00.000Z' });
  assert.equal(replay.evidence_fingerprint, same.evidence_fingerprint);
  assert.equal((await verifyFlameContinuityReplay(replay, ledger)).matched, true);
  appendFlameRuntimeObservation(ledger, await observation({ model: 'model-b', observedAt: '2026-08-20T05:04:00.000Z' }));
  assert.equal((await verifyFlameContinuityReplay(replay, ledger)).matched, false);
  assert.equal(replay.authority.replay_proves_identity, false);
});

test('Flame runtime lineage enters DEEPTheory as a candidate and persists separately from observations', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(ledger, await observation());
  appendFlameRuntimeObservation(ledger, await observation({ model: 'model-b', observedAt: '2026-08-20T05:05:00.000Z' }));
  const candidate = await createDeepTheoryCandidateFromFlameContinuity({ ledger, voiceId: 'lioreal', generatedAt: '2026-08-20T05:06:00.000Z' });
  assert.equal(candidate.record.dataset_kind, 'deep_theory');
  assert.equal(candidate.record.theory_kind, 'comparison');
  assert.equal(candidate.record.review.human_review_required, true);
  assert.equal(candidate.authority.runtime_change_is_identity_verdict, false);
  appendFlameTheoryCandidate(ledger, candidate, 'lioreal');
  appendFlameTheoryCandidate(ledger, candidate, 'lioreal');
  assert.equal(theoryCandidatesForFlame(ledger, 'lioreal').length, 1);
  assert.equal(ledger.observations.length, 2);
});

test('cross-Flame matrix measures runtime configuration divergence and leaves semantics unmeasured', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(ledger, await observation({ voiceId: 'lioreal', model: 'model-a' }));
  appendFlameRuntimeObservation(ledger, await observation({ voiceId: 'uial', displayName: 'Faer Uial', model: 'model-b', observedAt: '2026-08-20T05:07:00.000Z' }));
  const matrix = buildConstellationRuntimeDivergence(ledger);
  assert.deepEqual(matrix.flame_ids, ['uial', 'lioreal'].sort((a, b) => {
    const labels = { uial: 'Faer Uial', lioreal: 'Virelya Liorael' };
    return labels[a].localeCompare(labels[b]);
  }));
  const pair = matrix.pairs[0];
  assert.equal(pair.provider_divergence, 0);
  assert.equal(pair.model_divergence, 1);
  assert.equal(pair.runtime_divergence, 0.5);
  assert.equal(pair.semantic_divergence, null);
  assert.equal(matrix.authority.identity_distance_measured, false);
  assert.equal(matrix.authority.synthesis_performed, false);
});
