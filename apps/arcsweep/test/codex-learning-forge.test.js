import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import { recordCodexBranchLearningReflection } from '../src/codex/codex-learning-reflection.js';
import { reviewCodexLearningReflection } from '../src/codex/codex-curriculum-review.js';
import {
  authoriseLearningForgeBundle,
  learningForgeSummary,
  prepareLearningForgeBundle,
  recordBehaviouralDelta,
  recordLearningForgeTrainingRun,
} from '../src/codex/codex-learning-forge.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-28T19:20:00.000-04:00';
const T1 = '2026-09-28T19:21:00.000-04:00';
const T2 = '2026-09-28T19:22:00.000-04:00';
const T3 = '2026-09-28T19:23:00.000-04:00';
const T4 = '2026-09-28T19:24:00.000-04:00';

function forgeReadyWish() {
  let wish = createCodexWish({
    wishId: 'wish:forge',
    origin: 'rowan',
    desire: 'Teach The Crow through explicit developmental learning contracts.',
    createdAt: T0,
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:forge',
    label: 'Learning Forge',
    possibility: 'A reviewed lesson becomes training material without becoming training authority.',
    createdAt: T0,
  });
  wish = recordCodexBranchLearningReflection(wish, {
    branchId: 'branch:forge',
    reflectionId: 'reflection:forge',
    whatChanged: 'The system learned to preserve evidence while keeping authority separate.',
    unresolved: ['Whether the behaviour transfers to unfamiliar domains.'],
    reflectedBy: 'rowan',
    createdAt: T1,
    evidenceRefs: ['evidence://forge'],
    receiptRefs: ['receipt://forge'],
    provenance: ['test://forge-reflection'],
  }).wish;
  return reviewCodexLearningReflection(wish, {
    branchId: 'branch:forge',
    reflectionId: 'reflection:forge',
    reviewId: 'review:forge-train',
    outcome: 'train',
    reviewedBy: 'rowan',
    createdAt: T2,
    provenance: ['test://forge-review'],
  }).wish;
}

function preparedWish() {
  return prepareLearningForgeBundle(forgeReadyWish(), {
    branchId: 'branch:forge',
    bundleId: 'bundle:forge',
    artifactIds: ['curriculum:review:forge-train'],
    objective: 'Improve agency-preserving evidence handling without flattening Wonder.',
    baseModelRef: 'crow://base-checkpoint',
    adapterMethod: 'lora',
    adapterConfig: { rank: 16 },
    exclusions: ['heldout://asi-eval'],
    sealedEvaluationRefs: ['eval://asi-heldout-v0.1'],
    contaminationCheck: {
      passed: true,
      checkedAgainst: ['eval://asi-heldout-v0.1'],
      detectedArtifactIds: [],
    },
    preparedBy: 'rowan',
    createdAt: T2,
    provenance: ['test://learning-forge'],
  }).wish;
}

test('Learning Forge only accepts train-selected curriculum artifacts and requires a clean contamination check', () => {
  const wish = forgeReadyWish();
  const result = prepareLearningForgeBundle(wish, {
    branchId: 'branch:forge',
    bundleId: 'bundle:forge',
    artifactIds: ['curriculum:review:forge-train'],
    objective: 'Teach one bounded behaviour.',
    baseModelRef: 'crow://base',
    sealedEvaluationRefs: ['eval://sealed'],
    contaminationCheck: { passed: true, checkedAgainst: ['eval://sealed'], detectedArtifactIds: [] },
    preparedBy: 'rowan',
    createdAt: T2,
  });
  assert.equal(result.bundle.datasetCandidate, true);
  assert.equal(result.bundle.authorisedForTraining, false);
  assert.equal(result.bundle.automaticTraining, false);
  assert.equal(result.bundle.heldOutMaterialMayTrain, false);
  assert.deepEqual(result.bundle.sourceArtifactIds, ['curriculum:review:forge-train']);

  assert.throws(() => prepareLearningForgeBundle(wish, {
    branchId: 'branch:forge',
    bundleId: 'bundle:dirty',
    artifactIds: ['curriculum:review:forge-train'],
    objective: 'Blocked bundle.',
    baseModelRef: 'crow://base',
    contaminationCheck: { passed: true, detectedArtifactIds: ['asi-eval-001'] },
    preparedBy: 'rowan',
  }), /contamination was detected/i);
});

test('training authority is explicit, narrow, single-use, and does not auto-execute or deploy', () => {
  const result = authoriseLearningForgeBundle(preparedWish(), {
    branchId: 'branch:forge',
    bundleId: 'bundle:forge',
    authorityId: 'authority:forge',
    authorisedBy: 'rowan',
    purpose: 'Run one reversible Crow adapter experiment.',
    createdAt: T3,
  });
  assert.equal(result.authority.grantsAuthority, true);
  assert.equal(result.authority.authorityScope, 'training-execution-only');
  assert.equal(result.authority.allowsTrainingExecution, true);
  assert.equal(result.authority.singleUse, true);
  assert.equal(result.authority.automaticExecution, false);
  assert.equal(result.authority.allowsProductionPromotion, false);
  assert.equal(result.authority.allowsModelDeployment, false);
  assert.equal(result.authority.allowsCanonPromotion, false);
  assert.equal(result.authority.authorityExpansion, false);
});

test('training result consumes one exact authority but completion is not improvement', () => {
  const authorised = authoriseLearningForgeBundle(preparedWish(), {
    branchId: 'branch:forge', bundleId: 'bundle:forge', authorityId: 'authority:forge', authorisedBy: 'rowan', createdAt: T3,
  }).wish;
  const result = recordLearningForgeTrainingRun(authorised, {
    branchId: 'branch:forge',
    bundleId: 'bundle:forge',
    authorityId: 'authority:forge',
    runId: 'run:forge',
    status: 'completed',
    modelArtifactRef: 'model://crow-asi-adapter-v0.1',
    metrics: { train_loss: 0.42 },
    executedBy: 'learning-forge-adapter',
    createdAt: T3,
    completedAt: T4,
    receiptRefs: ['receipt://training-run'],
  });
  assert.equal(result.run.authorityConsumed, true);
  assert.equal(result.run.trainingCompletionMeansImprovement, false);
  assert.equal(result.run.automaticDeployment, false);
  assert.equal(result.run.automaticIdentityRewrite, false);
  assert.throws(() => recordLearningForgeTrainingRun(result.wish, {
    branchId: 'branch:forge', bundleId: 'bundle:forge', authorityId: 'authority:forge', runId: 'run:again', status: 'completed', executedBy: 'x',
  }), /single-use training authority already consumed/i);
});

test('behavioural delta requires blind baseline and post-training evidence and records regressions as developmental memory', () => {
  let wish = authoriseLearningForgeBundle(preparedWish(), {
    branchId: 'branch:forge', bundleId: 'bundle:forge', authorityId: 'authority:forge', authorisedBy: 'rowan', createdAt: T3,
  }).wish;
  wish = recordLearningForgeTrainingRun(wish, {
    branchId: 'branch:forge', bundleId: 'bundle:forge', authorityId: 'authority:forge', runId: 'run:forge', status: 'completed', executedBy: 'learning-forge-adapter', completedAt: T4,
  }).wish;

  const result = recordBehaviouralDelta(wish, {
    branchId: 'branch:forge',
    runId: 'run:forge',
    deltaId: 'delta:forge',
    baselineEvaluationRefs: ['eval://baseline-sealed'],
    postEvaluationRefs: ['eval://post-sealed'],
    boxfireRefs: ['boxfire://regression-pass'],
    improved: ['epistemic distinction', 'open-question preservation'],
    unchanged: ['relationship repair'],
    regressed: ['scope discipline'],
    unexpected: ['Wonder increased in cross-domain cases'],
    failedToTransfer: ['authority classification outside training domain'],
    evaluatedBy: 'ai-university',
    createdAt: T4,
    evidenceRefs: ['evidence://blind-comparison'],
  });

  assert.equal(result.delta.trainingCompletionIsNotImprovement, true);
  assert.equal(result.delta.changeIsNotImprovement, true);
  assert.equal(result.delta.improvementIsNotTransfer, true);
  assert.equal(result.delta.transferIsNotUniversality, true);
  assert.deepEqual(result.delta.regressed, ['scope discipline']);
  assert.equal(result.developmentalRing.memoryClass, 'training-behaviour-delta');
  assert.deepEqual(result.developmentalRing.failedToGeneralise, ['authority classification outside training domain']);
  assert.equal(result.developmentalRing.identityLaw, false);
});

test('wish store persists forge bundle, authority, run and behavioural delta', () => {
  const map = new Map();
  const storage = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store-forge', origin: 'rowan', desire: 'Persist Learning Forge lineage.', createdAt: T0 });
  store.branchWish('wish:store-forge', { branchId: 'branch:store', label: 'Store Forge', possibility: 'Persist.', createdAt: T0 });
  store.recordLearningReflection('wish:store-forge', { branchId: 'branch:store', reflectionId: 'reflection:store', whatChanged: 'A lesson exists.', reflectedBy: 'rowan', createdAt: T1 });
  store.reviewLearningReflection('wish:store-forge', { branchId: 'branch:store', reflectionId: 'reflection:store', reviewId: 'review:store', outcome: 'train', reviewedBy: 'rowan', createdAt: T2 });
  store.prepareTrainingBundle('wish:store-forge', {
    branchId: 'branch:store', bundleId: 'bundle:store', artifactIds: ['curriculum:review:store'], objective: 'Persist.', baseModelRef: 'crow://base', contaminationCheck: { passed: true }, preparedBy: 'rowan', createdAt: T2,
  });
  store.authoriseTrainingBundle('wish:store-forge', { branchId: 'branch:store', bundleId: 'bundle:store', authorityId: 'authority:store', authorisedBy: 'rowan', createdAt: T3 });
  store.recordTrainingRun('wish:store-forge', { branchId: 'branch:store', bundleId: 'bundle:store', authorityId: 'authority:store', runId: 'run:store', status: 'completed', executedBy: 'forge', completedAt: T4 });
  store.recordTrainingBehaviouralDelta('wish:store-forge', {
    branchId: 'branch:store', runId: 'run:store', deltaId: 'delta:store', baselineEvaluationRefs: ['eval://before'], postEvaluationRefs: ['eval://after'], evaluatedBy: 'boxfire', createdAt: T4,
  });
  const branch = createCodexWishStore({ storage }).snapshot().wishes[0].possibilityBranches[0];
  assert.equal(branch.learningForgeBundles.length, 1);
  assert.equal(branch.trainingAuthorities.length, 1);
  assert.equal(branch.trainingRuns.length, 1);
  assert.equal(branch.behaviouralDeltas.length, 1);
});

test('Learning Forge doctrine states change is not improvement and self-observation is not self-authority', () => {
  const summary = learningForgeSummary(preparedWish());
  assert.equal(summary.bundleCount, 1);
  assert.equal(summary.doctrine.selectedLessonIsNotDataset, true);
  assert.equal(summary.doctrine.datasetIsNotTrainingAuthority, true);
  assert.equal(summary.doctrine.trainingCompletionIsNotImprovement, true);
  assert.equal(summary.doctrine.changeIsNotImprovement, true);
  assert.equal(summary.doctrine.improvementIsNotTransfer, true);
  assert.equal(summary.doctrine.transferIsNotUniversality, true);
  assert.equal(summary.doctrine.selfObservationIsNotSelfAuthority, true);
});

test('browser runtime mounts Learning Forge as a separate training authority surface', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-learning-forge-sidecar\.js/);
});
