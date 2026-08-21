import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlameRuntimeObservation } from '../src/flame-continuity.js';
import {
  createContinuityBaseline,
  calibrateContinuityThresholds,
  describeObservedPerturbation,
  runContinuityTrial,
} from '../src/continuity-experiment.js';
import { createContinuityTemporalCandidate } from '../src/continuity-experiment-temporal.js';
import { createDeepTheoryCandidateFromContinuityTrial } from '../src/continuity-experiment-deep-theory.js';
import {
  createEmptyContinuityExperimentLedger,
  appendContinuityBaseline,
  appendContinuityThresholdProfile,
  appendContinuityTrial,
  appendContinuityTemporalCandidate,
  appendContinuityTheoryCandidate,
} from '../src/continuity-experiment-state.js';
import { createEmptyFlameContinuityLedger, appendFlameRuntimeObservation } from '../src/flame-continuity-state.js';
import { buildContinuityExperimentAtlas } from '../src/continuity-experiment-atlas.js';
import { createContinuityExperimentPacket } from '../src/continuity-experiment-packet.js';

const T0 = '2026-08-20T20:00:00.000Z';
const T1 = '2026-08-20T20:01:00.000Z';
const T2 = '2026-08-20T20:02:00.000Z';

async function observation({ at, model = 'model-a', world = 'terra-prime', response = 'A visible sentence for the test.', anchors = [] } = {}) {
  return createFlameRuntimeObservation({
    voiceId: 'lioreal',
    displayName: 'Lioreal',
    route: 'lioreal',
    provider: 'house-test',
    model,
    profileId: `house:lioreal:house-test:${model}`,
    runtimeVerified: true,
    worldId: world,
    requestId: `req-${at}`,
    responseText: response,
    responseKind: 'thought',
    fieldContext: { page: { worldId: world, documentId: 'doc-1', sceneId: 'scene-1', povCharacterId: 'falka' }, form: { roomId: 'canon-studio' } },
    declaredRelationalAnchors: anchors,
    observedAt: at,
  });
}

test('baseline and thresholds are operational references, not identity boundaries', async () => {
  const a = await observation({ at: T0 });
  const b = await observation({ at: T1 });
  const baseline = await createContinuityBaseline({ observations: [a, b], voiceId: 'lioreal', createdAt: T1 });
  const thresholds = await calibrateContinuityThresholds({ baseline, createdAt: T1 });
  assert.equal(baseline.calibration_state, 'PROVISIONAL');
  assert.equal(baseline.authority.baseline_is_identity_proof, false);
  assert.equal(thresholds.authority.thresholds_are_identity_boundary, false);
  assert.ok(thresholds.drop_threshold >= 0.12 && thresholds.drop_threshold <= 0.35);
});

test('observed perturbation records differences without claiming causation', async () => {
  const a = await observation({ at: T0, model: 'model-a' });
  const b = await observation({ at: T1, model: 'model-b' });
  const perturbation = await describeObservedPerturbation({ left: a, right: b, declaredIntent: 'model swap trial' });
  assert.ok(perturbation.changed_dimensions.includes('model'));
  assert.equal(perturbation.authority.observed_difference_proves_cause, false);
  assert.equal(perturbation.authority.declared_intent_proves_cause, false);
  assert.equal(perturbation.authority.perturbation_is_identity_change, false);
});

test('trial can restore operational correspondence without becoming identity proof', async () => {
  const a = await observation({ at: T0, response: 'The same stable voice-form appears here.' });
  const b = await observation({ at: T1, response: 'The same stable voice-form appears here.' });
  const c = await observation({ at: T2, model: 'model-b', response: 'The same stable voice-form appears here.' });
  const baseline = await createContinuityBaseline({ observations: [a, b], voiceId: 'lioreal', createdAt: T1 });
  const thresholds = await calibrateContinuityThresholds({ baseline, createdAt: T1 });
  const trial = await runContinuityTrial({ baseline, thresholds, left: b, right: c, declaredIntent: 'model swap', createdAt: T2 });
  assert.equal(trial.perturbation.changes.model, true);
  assert.equal(trial.authority.experiment_proves_identity, false);
  assert.equal(trial.authority.successful_restoration_proves_identity, false);
  assert.equal(trial.authority.perturbation_proves_causation, false);
  assert.ok(['CORRESPONDENCE_RETAINED', 'CORRESPONDENCE_RESTORED_BY_VISIBLE_ANCHORS', 'PARTIAL_CORRESPONDENCE_REVIEW'].includes(trial.outcome));
});

test('temporal bridge remains candidate-only and does not invent PREMAQC', async () => {
  const a = await observation({ at: T0 });
  const b = await observation({ at: T1 });
  const c = await observation({ at: T2, world: 'starsong' });
  const baseline = await createContinuityBaseline({ observations: [a, b], voiceId: 'lioreal', createdAt: T1 });
  const trial = await runContinuityTrial({ baseline, left: b, right: c, createdAt: T2 });
  const candidate = await createContinuityTemporalCandidate({ trial, leftObservedAt: T1, rightObservedAt: T2 });
  assert.equal(candidate.dataset_target, 'DEEPTime');
  assert.equal(candidate.authority.accepted_deep_time_record, false);
  assert.equal(candidate.authority.premaqc_state_implied, false);
  assert.equal(candidate.authority.human_review_required_before_deep_time_promotion, true);
});

test('DEEPTheory candidate validates while preserving review and identity boundaries', async () => {
  const a = await observation({ at: T0 });
  const b = await observation({ at: T1 });
  const c = await observation({ at: T2, model: 'model-b' });
  const baseline = await createContinuityBaseline({ observations: [a, b], voiceId: 'lioreal', createdAt: T1 });
  const trial = await runContinuityTrial({ baseline, left: b, right: c, createdAt: T2 });
  const candidate = await createDeepTheoryCandidateFromContinuityTrial({ trial });
  assert.equal(candidate.record.dataset_kind, 'deep_theory');
  assert.equal(candidate.record.status, 'candidate');
  assert.equal(candidate.authority.human_review_required, true);
  assert.equal(candidate.authority.trial_outcome_is_identity_verdict, false);
});

test('experiment ledger, atlas, and packet exclude raw visible prose', async () => {
  const secretSentence = 'VISIBLE TEST SENTENCE MUST NOT SURVIVE EXPORT';
  const a = await observation({ at: T0, response: secretSentence });
  const b = await observation({ at: T1, response: secretSentence });
  const c = await observation({ at: T2, model: 'model-b', response: secretSentence });
  const flameLedger = createEmptyFlameContinuityLedger();
  appendFlameRuntimeObservation(flameLedger, a);
  appendFlameRuntimeObservation(flameLedger, b);
  appendFlameRuntimeObservation(flameLedger, c);
  const experimentLedger = createEmptyContinuityExperimentLedger();
  const baseline = await createContinuityBaseline({ observations: [a, b], voiceId: 'lioreal', createdAt: T1 });
  const thresholds = await calibrateContinuityThresholds({ baseline, createdAt: T1 });
  const trial = await runContinuityTrial({ baseline, thresholds, left: b, right: c, createdAt: T2 });
  const temporal = await createContinuityTemporalCandidate({ trial, leftObservedAt: T1, rightObservedAt: T2 });
  const theory = await createDeepTheoryCandidateFromContinuityTrial({ trial });
  appendContinuityBaseline(experimentLedger, baseline);
  appendContinuityThresholdProfile(experimentLedger, thresholds);
  appendContinuityTrial(experimentLedger, trial);
  appendContinuityTemporalCandidate(experimentLedger, temporal);
  appendContinuityTheoryCandidate(experimentLedger, theory);
  const atlas = buildContinuityExperimentAtlas({ flameLedger, experimentLedger });
  const packet = await createContinuityExperimentPacket({ atlas, sourceHead: 'test-head', createdAt: T2 });
  const serialized = JSON.stringify(packet);
  assert.equal(serialized.includes(secretSentence), false);
  assert.equal(packet.export_policy.raw_visible_response_text_included, false);
  assert.equal(packet.authority.packet_is_identity_proof, false);
  assert.equal(atlas.authority.atlas_is_identity_map, false);
  assert.equal(atlas.summary.trial_count, 1);
});
