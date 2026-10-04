export const CODEX_CURRICULUM_REVIEW_SCHEMA = 'hearthweave.codex-curriculum-review/v0.1';
export const CODEX_DEVELOPMENTAL_MEMORY_SCHEMA = 'hearthweave.codex-developmental-memory/v0.1';

export const CURRICULUM_REVIEW_OUTCOMES = Object.freeze([
  'train',
  'held-out',
  'boxfire',
  'archive',
  'keep-open',
]);

const PROMOTED_OUTCOMES = new Set(['train', 'held-out', 'boxfire']);

function text(value, label = 'value') {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function optionalText(value) {
  const result = String(value || '').trim();
  return result || null;
}

function list(values = []) {
  const source = Array.isArray(values) ? values : [values];
  return Object.freeze([...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))]);
}

function findBranch(wish, branchId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
}

function findReflection(branch, reflectionId) {
  const id = text(reflectionId, 'reflectionId');
  const reflection = (branch.learningReflections || []).find((row) => row?.reflectionId === id);
  if (!reflection) throw new Error(`Unknown learning reflection: ${id}`);
  return reflection;
}

function promotedArtifact({ wish, branch, reflection, review }) {
  if (!PROMOTED_OUTCOMES.has(review.outcome)) return null;
  return Object.freeze({
    schema: 'hearthweave.asi-curriculum-artifact/v0.1',
    artifactId: `curriculum:${review.reviewId}`,
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceReflectionId: reflection.reflectionId,
    sourceReviewId: review.reviewId,
    targetSplit: review.outcome,
    teachingRecord: Object.freeze({
      whatChanged: reflection.whatChanged,
      unresolved: list(reflection.unresolved),
      relationshipChanges: list(reflection.relationshipChanges),
      failedAssumptions: list(reflection.failedAssumptions),
      surprises: list(reflection.surprises),
      becameMoreInteresting: list(reflection.becameMoreInteresting),
      deservesAnotherLook: list(reflection.deservesAnotherLook),
      beliefBefore: reflection.beliefBefore || null,
      beliefNow: reflection.beliefNow || null,
      possibilitiesToPreserve: list(reflection.possibilitiesToPreserve),
    }),
    sourceEvidenceRefs: list(reflection.evidenceRefs),
    sourceReceiptRefs: list(reflection.receiptRefs),
    provenance: list([...(reflection.provenance || []), ...(review.provenance || [])]),
    selectionOnly: true,
    automaticTraining: false,
    automaticEvaluationExecution: false,
    canonicalTruth: false,
    grantsAuthority: false,
    productionEffects: false,
    createdAt: review.createdAt,
  });
}

function developmentalRing({ wish, branch, reflection, review, artifact }) {
  if (!artifact) return null;
  return Object.freeze({
    schema: CODEX_DEVELOPMENTAL_MEMORY_SCHEMA,
    ringId: `developmental:${review.reviewId}`,
    memoryClass: 'cognitive-change',
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceReflectionId: reflection.reflectionId,
    sourceCurriculumArtifactId: artifact.artifactId,
    sourceReviewId: review.reviewId,
    whatChanged: reflection.whatChanged,
    remainedUnresolved: list(reflection.unresolved),
    transferredTo: list(review.transferredTo),
    failedToGeneralise: list(review.failedToGeneralise),
    scopeNotes: list(review.scopeNotes),
    failedAssumptions: list(reflection.failedAssumptions),
    relationshipChanges: list(reflection.relationshipChanges),
    surprises: list(reflection.surprises),
    beliefBefore: reflection.beliefBefore || null,
    beliefNow: reflection.beliefNow || null,
    possibilitiesPreserved: list(reflection.possibilitiesToPreserve),
    provenance: list([...(reflection.provenance || []), ...(review.provenance || [])]),
    explicitDevelopmentalMemoryWrite: true,
    automaticIdentityRewrite: false,
    identityLaw: false,
    canonicalTruth: false,
    grantsAuthority: false,
    productionEffects: false,
    createdAt: review.createdAt,
  });
}

export function reviewCodexLearningReflection(wish, {
  branchId,
  reflectionId,
  reviewId,
  outcome,
  reason = '',
  reviewedBy,
  createdAt = '',
  transferredTo = [],
  failedToGeneralise = [],
  scopeNotes = [],
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const reflection = findReflection(branch, reflectionId);
  const id = text(reviewId, 'reviewId');
  const nextOutcome = text(outcome, 'outcome');
  if (!CURRICULUM_REVIEW_OUTCOMES.includes(nextOutcome)) throw new Error(`Unknown curriculum review outcome: ${nextOutcome}`);
  if ((branch.curriculumReviews || []).some((row) => row?.reviewId === id)) throw new Error(`Duplicate curriculum review: ${id}`);

  const review = Object.freeze({
    schema: CODEX_CURRICULUM_REVIEW_SCHEMA,
    reviewId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    reflectionId: reflection.reflectionId,
    outcome: nextOutcome,
    reason: optionalText(reason),
    reviewedBy: text(reviewedBy, 'reviewedBy'),
    createdAt: String(createdAt || ''),
    transferredTo: list(transferredTo),
    failedToGeneralise: list(failedToGeneralise),
    scopeNotes: list(scopeNotes),
    provenance: list(provenance),
    candidateIsNotSelection: true,
    selectionIsNotTrainingExecution: true,
    teachingArtifactIsNotCanonicalTruth: true,
    grantsAuthority: false,
    productionEffects: false,
  });

  const artifact = promotedArtifact({ wish, branch, reflection, review });
  const ring = developmentalRing({ wish, branch, reflection, review, artifact });

  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({
    ...branch,
    curriculumReviews: Object.freeze([...(branch.curriculumReviews || []), review]),
    curriculumArtifacts: Object.freeze(artifact ? [...(branch.curriculumArtifacts || []), artifact] : [...(branch.curriculumArtifacts || [])]),
    developmentalMemory: Object.freeze(ring ? [...(branch.developmentalMemory || []), ring] : [...(branch.developmentalMemory || [])]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });

  return Object.freeze({
    wish: Object.freeze({
      ...wish,
      possibilityBranches: Object.freeze(branches),
      updatedAt: String(createdAt || wish.updatedAt || ''),
    }),
    review,
    artifact,
    developmentalRing: ring,
  });
}

export function developmentalMemorySummary(wish = {}) {
  const branches = wish.possibilityBranches || [];
  const reviews = branches.flatMap((branch) => branch.curriculumReviews || []);
  const artifacts = branches.flatMap((branch) => branch.curriculumArtifacts || []);
  const rings = branches.flatMap((branch) => branch.developmentalMemory || []);
  return Object.freeze({
    schema: CODEX_DEVELOPMENTAL_MEMORY_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    reviewCount: reviews.length,
    selectedArtifactCount: artifacts.length,
    developmentalRingCount: rings.length,
    doctrine: Object.freeze({
      eventMemoryIsNotConclusionMemory: true,
      conclusionMemoryIsNotCognitiveChangeMemory: true,
      developmentalMemoryDoesNotBecomeIdentityLaw: true,
      curriculumSelectionDoesNotExecuteTraining: true,
      teachingArtifactDoesNotBecomeCanonicalTruth: true,
    }),
  });
}
