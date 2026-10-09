import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { branchCodexWish, createCodexWish } from '../src/codex/codex-wish-lineage.js';
import { recordCodexBranchLearningReflection } from '../src/codex/codex-learning-reflection.js';
import {
  developmentalMemorySummary,
  reviewCodexLearningReflection,
} from '../src/codex/codex-curriculum-review.js';
import { createCodexWishStore } from '../src/codex/codex-wish-store.js';

const T0 = '2026-09-28T18:50:00.000-04:00';
const T1 = '2026-09-28T18:51:00.000-04:00';
const T2 = '2026-09-28T18:52:00.000-04:00';

function reflectedWish() {
  let wish = createCodexWish({
    wishId: 'wish:curriculum',
    origin: 'rowan',
    desire: 'Let the Tree remember how learning changed it.',
    createdAt: T0,
  });
  wish = branchCodexWish(wish, {
    branchId: 'branch:curriculum',
    label: 'Curriculum branch',
    possibility: 'A reflection becomes reviewed teaching material without automatic training.',
    createdAt: T0,
  });
  return recordCodexBranchLearningReflection(wish, {
    branchId: 'branch:curriculum',
    reflectionId: 'reflection:one',
    whatChanged: 'The system now separates accepted evidence from the training decision.',
    unresolved: ['Whether the lesson transfers beyond this experiment family.'],
    relationshipChanges: ['Boxfire becomes an adversarial evaluator rather than a silent validator.'],
    failedAssumptions: ['Useful reflection should automatically become training data.'],
    surprises: ['The unresolved part is more informative than the success metric.'],
    becameMoreInteresting: ['Transfer failure as a developmental signal.'],
    deservesAnotherLook: ['Whether disagreement improves generalisation.'],
    beliefBefore: 'Good reflections probably belonged directly in training.',
    beliefNow: 'Reflections need review and split-aware promotion first.',
    possibilitiesToPreserve: ['A held-out evaluation role for the same lesson family.'],
    reflectedBy: 'rowan',
    createdAt: T1,
    evidenceRefs: ['evidence://curriculum'],
    receiptRefs: ['receipt://curriculum'],
    provenance: ['test://reflection'],
  }).wish;
}

test('promoted reflection creates a selected artifact and developmental ring without training', () => {
  const result = reviewCodexLearningReflection(reflectedWish(), {
    branchId: 'branch:curriculum',
    reflectionId: 'reflection:one',
    reviewId: 'review:train',
    outcome: 'train',
    reason: 'Useful teaching pattern with explicit provenance.',
    reviewedBy: 'rowan',
    transferredTo: ['sandbox authority cases'],
    failedToGeneralise: ['cross-world identity cases'],
    scopeNotes: ['Do not infer universality from one family.'],
    createdAt: T2,
    provenance: ['test://curriculum-review'],
  });

  assert.equal(result.review.outcome, 'train');
  assert.equal(result.review.selectionIsNotTrainingExecution, true);
  assert.equal(result.artifact.targetSplit, 'train');
  assert.equal(result.artifact.selectionOnly, true);
  assert.equal(result.artifact.automaticTraining, false);
  assert.equal(result.artifact.canonicalTruth, false);
  assert.equal(result.developmentalRing.memoryClass, 'cognitive-change');
  assert.deepEqual(result.developmentalRing.transferredTo, ['sandbox authority cases']);
  assert.deepEqual(result.developmentalRing.failedToGeneralise, ['cross-world identity cases']);
  assert.equal(result.developmentalRing.identityLaw, false);
  assert.equal(result.developmentalRing.automaticIdentityRewrite, false);
});

test('keep-open and archive record review without manufacturing teaching artifacts or developmental rings', () => {
  for (const outcome of ['keep-open', 'archive']) {
    const result = reviewCodexLearningReflection(reflectedWish(), {
      branchId: 'branch:curriculum',
      reflectionId: 'reflection:one',
      reviewId: `review:${outcome}`,
      outcome,
      reviewedBy: 'rowan',
      createdAt: T2,
    });
    assert.equal(result.artifact, null);
    assert.equal(result.developmentalRing, null);
    const branch = result.wish.possibilityBranches[0];
    assert.equal(branch.curriculumReviews.length, 1);
    assert.equal(branch.curriculumArtifacts.length, 0);
    assert.equal(branch.developmentalMemory.length, 0);
  }
});

test('held-out and Boxfire selections stay split-aware and non-authoritative', () => {
  for (const outcome of ['held-out', 'boxfire']) {
    const result = reviewCodexLearningReflection(reflectedWish(), {
      branchId: 'branch:curriculum',
      reflectionId: 'reflection:one',
      reviewId: `review:${outcome}`,
      outcome,
      reviewedBy: 'rowan',
      createdAt: T2,
    });
    assert.equal(result.artifact.targetSplit, outcome);
    assert.equal(result.artifact.automaticEvaluationExecution, false);
    assert.equal(result.artifact.grantsAuthority, false);
    assert.equal(result.developmentalRing.canonicalTruth, false);
  }
});

test('developmental summary keeps event, conclusion and cognitive-change memory distinct', () => {
  const result = reviewCodexLearningReflection(reflectedWish(), {
    branchId: 'branch:curriculum',
    reflectionId: 'reflection:one',
    reviewId: 'review:summary',
    outcome: 'train',
    reviewedBy: 'rowan',
    createdAt: T2,
  });
  const summary = developmentalMemorySummary(result.wish);
  assert.equal(summary.reviewCount, 1);
  assert.equal(summary.selectedArtifactCount, 1);
  assert.equal(summary.developmentalRingCount, 1);
  assert.equal(summary.doctrine.eventMemoryIsNotConclusionMemory, true);
  assert.equal(summary.doctrine.conclusionMemoryIsNotCognitiveChangeMemory, true);
  assert.equal(summary.doctrine.developmentalMemoryDoesNotBecomeIdentityLaw, true);
});

test('wish store persists curriculum review, selected artifact and developmental ring', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
  const store = createCodexWishStore({ storage });
  store.createWish({ wishId: 'wish:store-curriculum', origin: 'rowan', desire: 'Persist developmental learning.', createdAt: T0 });
  store.branchWish('wish:store-curriculum', { branchId: 'branch:store', label: 'Store', possibility: 'Persistence.', createdAt: T0 });
  store.recordLearningReflection('wish:store-curriculum', {
    branchId: 'branch:store', reflectionId: 'reflection:store', whatChanged: 'A persistence seam exists.', reflectedBy: 'rowan', createdAt: T1,
  });
  store.reviewLearningReflection('wish:store-curriculum', {
    branchId: 'branch:store', reflectionId: 'reflection:store', reviewId: 'review:store', outcome: 'train', reviewedBy: 'rowan', createdAt: T2,
  });
  const fresh = createCodexWishStore({ storage }).snapshot();
  const branch = fresh.wishes[0].possibilityBranches[0];
  assert.equal(branch.curriculumReviews.length, 1);
  assert.equal(branch.curriculumArtifacts.length, 1);
  assert.equal(branch.developmentalMemory.length, 1);
});

test('browser runtime mounts Curriculum Review as a separate explicit gate', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/wish-grove-curriculum-review-sidecar.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /wish-grove-curriculum-review-sidecar\.js/);
  assert.match(source, /Curriculum Review/);
  assert.match(source, /Train candidate/);
  assert.match(source, /Held-out/);
  assert.match(source, /Boxfire/);
  assert.match(source, /Keep Open/);
  assert.match(source, /Archive/);
  assert.match(source, /Selection does not execute training/);
  assert.match(source, /Developmental Memory/);
});
