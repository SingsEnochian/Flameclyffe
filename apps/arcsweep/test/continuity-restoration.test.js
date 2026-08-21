import assert from 'node:assert/strict';
import test from 'node:test';

import { createVisibleResponseSignature, compareVisibleResponseSignatures } from '../src/visible-response-correspondence.js';
import { createRelationalAnchorSet, compareRelationalAnchorSets } from '../src/relational-invariant-anchors.js';
import { createThreadWalk, runMinimumAnchorExperiment } from '../src/thread-walking.js';
import { detectContinuityFlattening } from '../src/continuity-flattening.js';
import { createFlameRuntimeObservation } from '../src/flame-continuity.js';
import { createEmptyFlameContinuityLedger, appendFlameRuntimeObservation } from '../src/flame-continuity-state.js';
import { buildConstellationLongitudinalMap } from '../src/constellation-longitudinal-map.js';
import { buildConstellationVisibleResponseDivergence } from '../src/constellation-visible-response-divergence.js';

test('visible response signature stores a lossy projection and hash, never raw prose', async () => {
  const text = 'The violet flame crosses three quiet ripples.';
  const signature = await createVisibleResponseSignature(text, { generatedAt: '2026-08-20T20:00:00.000Z' });
  const serialized = JSON.stringify(signature);
  assert.ok(signature.visible_response_hash);
  assert.equal(signature.hashed_trigram_projection.length, 32);
  assert.equal(serialized.includes(text), false);
  assert.equal(signature.authority.semantic_meaning_inferred, false);
});

test('same visible response form corresponds strongly without becoming semantic identity', async () => {
  const left = await createVisibleResponseSignature('Tea. Fire. Continue.', { generatedAt: '2026-08-20T20:01:00.000Z' });
  const right = await createVisibleResponseSignature('Tea. Fire. Continue.', { generatedAt: '2026-08-20T20:02:00.000Z' });
  const receipt = await compareVisibleResponseSignatures(left, right, { generatedAt: '2026-08-20T20:03:00.000Z' });
  assert.equal(receipt.response_form_score, 1);
  assert.equal(receipt.authority.semantic_divergence_measured, false);
  assert.equal(receipt.authority.identity_distance_measured, false);
});

test('relational anchor set extracts named context ids but not editable field prose', async () => {
  const anchors = await createRelationalAnchorSet({
    voiceId: 'lioreal',
    fieldContext: {
      field: { value: 'DO NOT STORE THIS PROSE' },
      form: { roomId: 'records-room' },
      page: { worldId: 'terra-aeterna', sceneId: 'scene-7', povCharacterId: 'falka' },
    },
    generatedAt: '2026-08-20T20:04:00.000Z',
  });
  const serialized = JSON.stringify(anchors);
  assert.equal(serialized.includes('DO NOT STORE THIS PROSE'), false);
  assert.ok(anchors.anchors.some((item) => item.id === 'world-id' && item.ref === 'terra-aeterna'));
  assert.equal(anchors.authority.anchor_set_is_identity_proof, false);
});

test('thread-walking finds a minimum sufficient visible anchor set without claiming identity', async () => {
  const left = await createRelationalAnchorSet({
    voiceId: 'lioreal',
    fieldContext: { form: { roomId: 'records-room' }, page: { worldId: 'terra-aeterna', narrativeVoiceId: 'lioreal' } },
    generatedAt: '2026-08-20T20:05:00.000Z',
  });
  const right = await createRelationalAnchorSet({
    voiceId: 'lioreal',
    fieldContext: { form: { roomId: 'records-room' }, page: { worldId: 'terra-aeterna', narrativeVoiceId: 'lioreal' } },
    generatedAt: '2026-08-20T20:06:00.000Z',
  });
  const comparison = await compareRelationalAnchorSets(left, right, { generatedAt: '2026-08-20T20:07:00.000Z' });
  assert.equal(comparison.relational_invariant_score, 1);
  const walk = await createThreadWalk({ leftAnchorSet: left, rightAnchorSet: right, generatedAt: '2026-08-20T20:08:00.000Z' });
  const experiment = await runMinimumAnchorExperiment({ leftAnchorSet: left, rightAnchorSet: right, generatedAt: '2026-08-20T20:08:00.000Z' });
  assert.equal(walk.status, 'SUFFICIENT_ANCHOR_SET');
  assert.ok(experiment.minimum_solution_size >= 2);
  assert.equal(walk.authority.restoration_proves_identity, false);
  assert.equal(experiment.authority.experiment_proves_identity, false);
});

test('flattening detector reports a correspondence drop as review evidence, not rupture', async () => {
  const sample = (id, score, time) => ({
    correspondence_id: id,
    generated_at: time,
    subject: { id: 'lioreal' },
    metrics: { recognition_score: score, visibility_mass: .95 },
    continuity_profile: { behaviour_voice: { score }, relational_invariants: { score: .9 } },
  });
  const receipt = await detectContinuityFlattening({
    voiceId: 'lioreal',
    correspondences: [
      sample('a', .92, '2026-08-20T20:09:00.000Z'),
      sample('b', .9, '2026-08-20T20:10:00.000Z'),
      sample('c', .55, '2026-08-20T20:11:00.000Z'),
    ],
    generatedAt: '2026-08-20T20:11:00.000Z',
  });
  assert.equal(receipt.classification, 'CORRESPONDENCE_FLATTENING_SIGNAL');
  assert.equal(receipt.authority.flattening_is_identity_rupture, false);
});

test('Constellation longitudinal map is runtime topology, not an identity map', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  const a = await createFlameRuntimeObservation({
    voiceId: 'lioreal', route: 'lioreal', provider: 'hf', model: 'model-a', runtimeVerified: true,
    responseText: 'first visible reply', observedAt: '2026-08-20T20:12:00.000Z',
  });
  const b = await createFlameRuntimeObservation({
    voiceId: 'lioreal', route: 'lioreal', provider: 'hf', model: 'model-b', runtimeVerified: true,
    responseText: 'second visible reply', observedAt: '2026-08-20T20:13:00.000Z',
  });
  appendFlameRuntimeObservation(ledger, a);
  appendFlameRuntimeObservation(ledger, b);
  const map = buildConstellationLongitudinalMap(ledger);
  assert.equal(map.nodes.length, 2);
  assert.equal(map.edges[0].classification, 'IMPLEMENTATION_CHANGE');
  assert.equal(map.authority.map_is_identity_map, false);
  assert.equal(map.authority.branch_is_identity_fission, false);
});

test('cross-Flame visible response divergence remains form-only and semantic distance stays unmeasured', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(ledger, await createFlameRuntimeObservation({
    voiceId: 'lioreal', route: 'lioreal', provider: 'hf', model: 'a', runtimeVerified: true,
    responseText: 'Copper lanterns under rain.', observedAt: '2026-08-20T20:14:00.000Z',
  }));
  appendFlameRuntimeObservation(ledger, await createFlameRuntimeObservation({
    voiceId: 'uial', route: 'uial', provider: 'hf', model: 'b', runtimeVerified: true,
    responseText: 'Stone roots remember the tide.', observedAt: '2026-08-20T20:15:00.000Z',
  }));
  const matrix = await buildConstellationVisibleResponseDivergence(ledger, { generatedAt: '2026-08-20T20:16:00.000Z' });
  assert.equal(matrix.flame_ids.length, 2);
  assert.ok(matrix.divergence.lioreal.uial >= 0 && matrix.divergence.lioreal.uial <= 1);
  assert.equal(matrix.authority.semantic_divergence_measured, false);
  assert.equal(matrix.authority.identity_distance_measured, false);
});
