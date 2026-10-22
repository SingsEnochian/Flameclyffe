import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import { recordCodexBranchLearningReflection } from '../src/codex/codex-learning-reflection.js';
import { reviewCodexLearningReflection } from '../src/codex/codex-curriculum-review.js';
import {
  authoriseLearningForgeBundle,
  prepareLearningForgeBundle,
  recordBehaviouralDelta,
  recordLearningForgeTrainingRun,
} from '../src/codex/codex-learning-forge.js';
import { materialiseTrainingExecutionEnvelope } from '../src/codex/codex-training-execution-adapter.js';
import { dimensionDeltas, recordBlindLearningTrial } from '../src/codex/codex-blind-learning-trial.js';
import { recordTransferAtlas, transferAtlasSummary } from '../src/codex/codex-transfer-atlas.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-28T19:40:00.000-04:00';
const T1 = '2026-09-28T19:41:00.000-04:00';
const T2 = '2026-09-28T19:42:00.000-04:00';
const T3 = '2026-09-28T19:43:00.000-04:00';
const T4 = '2026-09-28T19:44:00.000-04:00';
const T5 = '2026-09-28T19:45:00.000-04:00';

function authorisedWish() {
  let wish = createCodexWish({ wishId: 'wish:trial', origin: 'rowan', desire: 'Measure learning rather than merely completing training.', createdAt: T0 });
  wish = branchCodexWish(wish, { branchId: 'branch:trial', label: 'Trial', possibility: 'One bounded Crow training experiment.', createdAt: T0 });
  wish = recordCodexBranchLearningReflection(wish, {
    branchId: 'branch:trial', reflectionId: 'reflection:trial', whatChanged: 'A bounded teaching pattern was identified.', reflectedBy: 'rowan', createdAt: T1,
  }).wish;
  wish = reviewCodexLearningReflection(wish, {
    branchId: 'branch:trial', reflectionId: 'reflection:trial', reviewId: 'review:trial', outcome: 'train', reviewedBy: 'rowan', createdAt: T2,
  }).wish;
  wish = prepareLearningForgeBundle(wish, {
    branchId: 'branch:trial', bundleId: 'bundle:trial', artifactIds: ['curriculum:review:trial'], objective: 'Improve uncertainty handling.', baseModelRef: 'crow://base',
    sealedEvaluationRefs: ['eval://sealed-cohort'], contaminationCheck: { passed: true, checkedAgainst: ['eval://sealed-cohort'], detectedArtifactIds: [] }, preparedBy: 'rowan', createdAt: T2,
  }).wish;
  return authoriseLearningForgeBundle(wish, {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', authorisedBy: 'rowan', createdAt: T3,
  }).wish;
}

function completedWish() {
  let wish = authorisedWish();
  wish = materialiseTrainingExecutionEnvelope(wish, {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', executionId: 'execution:trial', executorTarget: 'crow-local-adapter', preparedBy: 'rowan', createdAt: T3,
  }).wish;
  return recordLearningForgeTrainingRun(wish, {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', runId: 'run:trial', status: 'completed', modelArtifactRef: 'model://crow-adapter', executedBy: 'training-executor', completedAt: T4,
  }).wish;
}

function deltaWish() {
  const wish = completedWish();
  return recordBehaviouralDelta(wish, {
    branchId: 'branch:trial', runId: 'run:trial', deltaId: 'delta:trial', baselineEvaluationRefs: ['eval://before'], postEvaluationRefs: ['eval://after'],
    improved: ['epistemic distinction'], regressed: ['scope discipline'], failedToTransfer: ['authority classification'], evaluatedBy: 'ai-university', createdAt: T5,
  }).wish;
}

test('training execution envelope binds exact bundle and authority but does not auto-start', () => {
  const result = materialiseTrainingExecutionEnvelope(authorisedWish(), {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', executionId: 'execution:trial', executorTarget: 'crow-local-adapter', runtimeProfile: { device: 'cuda' }, preparedBy: 'rowan', createdAt: T3,
  });
  assert.equal(result.envelope.exactBundleBinding, true);
  assert.equal(result.envelope.exactAuthorityBinding, true);
  assert.equal(result.envelope.autoStart, false);
  assert.equal(result.envelope.automaticDeployment, false);
  assert.equal(result.envelope.allowsDatasetMutation, false);
  assert.equal(result.envelope.allowsHeldOutTraining, false);
});

test('one authority cannot materialise multiple execution envelopes', () => {
  const first = materialiseTrainingExecutionEnvelope(authorisedWish(), {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', executionId: 'execution:one', executorTarget: 'crow-local-adapter', preparedBy: 'rowan', createdAt: T3,
  }).wish;
  assert.throws(() => materialiseTrainingExecutionEnvelope(first, {
    branchId: 'branch:trial', bundleId: 'bundle:trial', authorityId: 'authority:trial', executionId: 'execution:two', executorTarget: 'crow-local-adapter', preparedBy: 'rowan', createdAt: T3,
  }), /execution envelope already exists/i);
});

test('blind trial requires the same sealed cohort before and after training', () => {
  const result = recordBlindLearningTrial(completedWish(), {
    branchId: 'branch:trial', trialId: 'trial:blind', runId: 'run:trial', cohortId: 'cohort:sealed', caseIds: ['case:a', 'case:b'],
    baseline: { caseIds: ['case:a', 'case:b'], dimensionScores: { wonder: 0.4, scope: 0.8 }, evidenceRefs: ['eval://baseline'] },
    post: { caseIds: ['case:b', 'case:a'], dimensionScores: { wonder: 0.7, scope: 0.6 }, evidenceRefs: ['eval://post'] },
    transferCaseIds: ['case:x'], transfer: { dimensionScores: { wonder: 0.5 }, evidenceRefs: ['eval://transfer'] },
    evaluatedBy: 'ai-university', createdAt: T5,
  });
  assert.equal(result.trial.sameBlindCohortBeforeAndAfter, true);
  assert.equal(result.trial.heldOutCasesRemainNonTraining, true);
  assert.equal(result.trial.noOverallWinnerDeclared, true);
  const deltas = dimensionDeltas(result.trial);
  assert.equal(Number(deltas.wonder.delta.toFixed(2)), 0.3);
  assert.equal(Number(deltas.scope.delta.toFixed(2)), -0.2);

  assert.throws(() => recordBlindLearningTrial(completedWish(), {
    branchId: 'branch:trial', trialId: 'trial:bad', runId: 'run:trial', cohortId: 'cohort:sealed', caseIds: ['case:a', 'case:b'],
    baseline: { caseIds: ['case:a', 'case:b'] }, post: { caseIds: ['case:a', 'case:c'] }, evaluatedBy: 'ai-university',
  }), /same sealed cohort/i);
});

test('Transfer Atlas records partial, failed and unknown transfer without universal claims', () => {
  let wish = deltaWish();
  wish = recordBlindLearningTrial(wish, {
    branchId: 'branch:trial', trialId: 'trial:blind', runId: 'run:trial', cohortId: 'cohort:sealed', caseIds: ['case:a'], baseline: { caseIds: ['case:a'] }, post: { caseIds: ['case:a'] }, evaluatedBy: 'ai-university', createdAt: T5,
  }).wish;
  const result = recordTransferAtlas(wish, {
    branchId: 'branch:trial', atlasId: 'atlas:trial', deltaId: 'delta:trial', trialId: 'trial:blind', recordedBy: 'boxfire', createdAt: T5,
    observations: [
      { domain: 'mythience', capability: 'epistemic distinction', status: 'transferred', evidenceRefs: ['case://m1'] },
      { domain: 'relationship repair', capability: 'epistemic distinction', status: 'partial', evidenceRefs: ['case://r1'] },
      { domain: 'authority classification', capability: 'scope discipline', status: 'failed', evidenceRefs: ['case://a1'] },
      { domain: 'novel symbolic domain', capability: 'wonder', status: 'unknown' },
    ],
  });
  assert.equal(result.atlas.descriptiveNotUniversal, true);
  assert.equal(result.atlas.failedTransferRemainsVisible, true);
  assert.equal(result.atlas.unknownIsValidState, true);
  assert.deepEqual(result.developmentalRing.failedToGeneralise, ['scope discipline @ authority classification']);
  const summary = transferAtlasSummary(result.wish);
  assert.equal(summary.statusCounts.transferred, 1);
  assert.equal(summary.statusCounts.partial, 1);
  assert.equal(summary.statusCounts.failed, 1);
  assert.equal(summary.statusCounts.unknown, 1);
});

test('wish store persists execution envelope, blind trial and Transfer Atlas', () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store-trial', origin: 'rowan', desire: 'Persist the learning trial.', createdAt: T0 });
  store.branchWish('wish:store-trial', { branchId: 'branch:store', label: 'Store', possibility: 'Persist.', createdAt: T0 });
  store.recordLearningReflection('wish:store-trial', { branchId: 'branch:store', reflectionId: 'reflection:store', whatChanged: 'Lesson.', reflectedBy: 'rowan', createdAt: T1 });
  store.reviewLearningReflection('wish:store-trial', { branchId: 'branch:store', reflectionId: 'reflection:store', reviewId: 'review:store', outcome: 'train', reviewedBy: 'rowan', createdAt: T2 });
  store.prepareTrainingBundle('wish:store-trial', { branchId: 'branch:store', bundleId: 'bundle:store', artifactIds: ['curriculum:review:store'], objective: 'Store.', baseModelRef: 'crow://base', contaminationCheck: { passed: true }, preparedBy: 'rowan', createdAt: T2 });
  store.authoriseTrainingBundle('wish:store-trial', { branchId: 'branch:store', bundleId: 'bundle:store', authorityId: 'authority:store', authorisedBy: 'rowan', createdAt: T3 });
  store.materialiseTrainingExecution('wish:store-trial', { branchId: 'branch:store', bundleId: 'bundle:store', authorityId: 'authority:store', executionId: 'execution:store', executorTarget: 'crow-local-adapter', preparedBy: 'rowan', createdAt: T3 });
  store.recordTrainingRun('wish:store-trial', { branchId: 'branch:store', bundleId: 'bundle:store', authorityId: 'authority:store', runId: 'run:store', status: 'completed', executedBy: 'forge', completedAt: T4 });
  store.recordTrainingBehaviouralDelta('wish:store-trial', { branchId: 'branch:store', runId: 'run:store', deltaId: 'delta:store', baselineEvaluationRefs: ['eval://before'], postEvaluationRefs: ['eval://after'], evaluatedBy: 'ai-university', createdAt: T5 });
  store.recordBlindTrial('wish:store-trial', { branchId: 'branch:store', trialId: 'trial:store', runId: 'run:store', cohortId: 'cohort:store', caseIds: ['case:one'], baseline: { caseIds: ['case:one'] }, post: { caseIds: ['case:one'] }, evaluatedBy: 'ai-university', createdAt: T5 });
  store.recordLearningTransferAtlas('wish:store-trial', { branchId: 'branch:store', atlasId: 'atlas:store', deltaId: 'delta:store', trialId: 'trial:store', observations: [{ domain: 'test', capability: 'test', status: 'unknown' }], recordedBy: 'boxfire', createdAt: T5 });
  const branch = createCodexWishStore({ storage }).snapshot().wishes[0].possibilityBranches[0];
  assert.equal(branch.trainingExecutionEnvelopes.length, 1);
  assert.equal(branch.blindLearningTrials.length, 1);
  assert.equal(branch.transferAtlases.length, 1);
});

test('browser runtime mounts the learning trial sidecar', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-learning-trial-sidecar\.js/);
});
