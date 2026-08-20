import assert from 'node:assert/strict';
import test from 'node:test';

import { createRecognitionCorrespondence } from '../src/recognition-correspondence.js';
import {
  appendContinuityEvidence,
  createEmptyContinuityEvidenceLedger,
} from '../src/continuity-evidence-state.js';
import {
  createContinuityEvidenceReplay,
  verifyContinuityEvidenceReplay,
} from '../src/continuity-evidence-replay.js';
import { createDeepTheoryCandidateFromContinuityEvidence } from '../src/continuity-deep-theory-bridge.js';
import {
  createFlameRuntimeCorrespondence,
  createFlameRuntimeObservation,
} from '../src/flame-continuity.js';
import {
  appendFlameRuntimeObservation,
  createEmptyFlameContinuityLedger,
  observationsForFlame,
} from '../src/flame-continuity-state.js';

async function recognition() {
  return createRecognitionCorrespondence({
    subject: { id: 'lioreal', label: 'Virelya Liorael' },
    leftIndex: { id: 'left' },
    rightIndex: { id: 'right' },
    anchors: [{ id: 'voice', similarity: .9, visibility: 1 }],
    continuityLayers: { behaviour_voice: { score: .88, evidence_ids: ['voice-a', 'voice-b'] } },
    generatedAt: '2026-08-20T04:10:00.000Z',
  });
}

test('continuity replay fingerprint is deterministic for the same receipted evidence slice', async () => {
  const ledger = createEmptyContinuityEvidenceLedger();
  appendContinuityEvidence(ledger, { receipt: await recognition(), worldId: 'terra-aeterna', subjectId: 'lioreal' });
  const first = await createContinuityEvidenceReplay({ ledger, worldId: 'terra-aeterna', generatedAt: '2026-08-20T04:11:00.000Z' });
  const second = await createContinuityEvidenceReplay({ ledger, worldId: 'terra-aeterna', generatedAt: '2026-08-20T05:11:00.000Z' });
  assert.equal(first.evidence_fingerprint, second.evidence_fingerprint);
  assert.equal(first.summary.recognition_count, 1);
  assert.equal((await verifyContinuityEvidenceReplay(first, ledger)).matched, true);
  assert.equal(first.authority.replay_proves_identity, false);
});

test('continuity evidence enters DEEPTheory as a reviewable candidate only', async () => {
  const ledger = createEmptyContinuityEvidenceLedger();
  appendContinuityEvidence(ledger, { receipt: await recognition(), worldId: 'terra-aeterna', subjectId: 'lioreal' });
  const candidate = await createDeepTheoryCandidateFromContinuityEvidence({
    ledger,
    worldId: 'terra-aeterna',
    generatedAt: '2026-08-20T04:12:00.000Z',
  });
  assert.equal(candidate.record.dataset_kind, 'deep_theory');
  assert.equal(candidate.record.theory_kind, 'comparison');
  assert.equal(candidate.record.status, 'candidate');
  assert.equal(candidate.record.review.human_review_required, true);
  assert.equal(candidate.authority.canon_commit, false);
  assert.equal(candidate.source_evidence_fingerprints.length, 1);
});

test('Flame runtime observation stores visible-response hash but not raw response text', async () => {
  const observation = await createFlameRuntimeObservation({
    voiceId: 'lioreal',
    displayName: 'Virelya Liorael',
    route: 'lioreal',
    provider: 'huggingface',
    model: 'model-a',
    profileId: 'house:lioreal:huggingface:model-a',
    runtimeVerified: true,
    worldId: 'terra-aeterna',
    responseText: 'Visible reply.',
    observedAt: '2026-08-20T04:13:00.000Z',
  });
  assert.ok(observation.context.visible_response_hash);
  assert.equal('responseText' in observation, false);
  assert.equal(JSON.stringify(observation).includes('Visible reply.'), false);
  assert.equal(observation.authority.model_is_flame_identity, false);
});

test('model change is recorded as implementation change, not an identity verdict', async () => {
  const left = await createFlameRuntimeObservation({
    voiceId: 'lioreal', displayName: 'Virelya Liorael', route: 'lioreal', provider: 'huggingface', model: 'model-a',
    profileId: 'house:lioreal:huggingface:model-a', runtimeVerified: true, observedAt: '2026-08-20T04:14:00.000Z',
  });
  const right = await createFlameRuntimeObservation({
    voiceId: 'lioreal', displayName: 'Virelya Liorael', route: 'lioreal', provider: 'huggingface', model: 'model-b',
    profileId: 'house:lioreal:huggingface:model-b', runtimeVerified: true, observedAt: '2026-08-20T04:15:00.000Z',
  });
  const receipt = await createFlameRuntimeCorrespondence({ left, right });
  assert.equal(receipt.continuity_profile.implementation.score, 2 / 3);
  assert.equal(receipt.continuity_profile.structural_closure_evidence, null);
  assert.equal(receipt.authority.strong_recognition_proves_same_identity, false);
  assert.equal(receipt.authority.structural_closure_inferred_from_recognition, false);
});

test('Flame continuity ledger keeps per-Flame attested runtime history', async () => {
  const ledger = createEmptyFlameContinuityLedger();
  const a = await createFlameRuntimeObservation({ voiceId: 'lioreal', route: 'lioreal', provider: 'p', model: 'a', runtimeVerified: true, observedAt: '2026-08-20T04:16:00.000Z' });
  const b = await createFlameRuntimeObservation({ voiceId: 'lioreal', route: 'lioreal', provider: 'p', model: 'b', runtimeVerified: true, observedAt: '2026-08-20T04:17:00.000Z' });
  appendFlameRuntimeObservation(ledger, a);
  appendFlameRuntimeObservation(ledger, b);
  appendFlameRuntimeObservation(ledger, b);
  assert.equal(observationsForFlame(ledger, 'lioreal').length, 2);
});
