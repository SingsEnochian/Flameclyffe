export const CODEX_LEARNING_REFLECTION_SCHEMA = 'hearthweave.codex-learning-reflection/v0.1';

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
  return Object.freeze([...new Set(source
    .map((value) => String(value || '').trim())
    .filter(Boolean))]);
}

function findBranch(wish, branchId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
}

function freezeReflection(record = {}) {
  return Object.freeze({
    ...record,
    unresolved: list(record.unresolved),
    relationshipChanges: list(record.relationshipChanges),
    failedAssumptions: list(record.failedAssumptions),
    surprises: list(record.surprises),
    becameMoreInteresting: list(record.becameMoreInteresting),
    deservesAnotherLook: list(record.deservesAnotherLook),
    possibilitiesToPreserve: list(record.possibilitiesToPreserve),
    evidenceRefs: list(record.evidenceRefs),
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
  });
}

export function recordCodexBranchLearningReflection(wish, {
  branchId,
  reflectionId,
  sourceSuggestionId = null,
  sourceMaterialisationId = null,
  whatChanged,
  unresolved = [],
  relationshipChanges = [],
  failedAssumptions = [],
  surprises = [],
  becameMoreInteresting = [],
  deservesAnotherLook = [],
  beliefBefore = '',
  beliefNow = '',
  possibilitiesToPreserve = [],
  reflectedBy,
  createdAt = '',
  evidenceRefs = [],
  receiptRefs = [],
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const id = text(reflectionId, 'reflectionId');
  if ((branch.learningReflections || []).some((row) => row.reflectionId === id)) {
    throw new Error(`Duplicate learning reflection: ${id}`);
  }

  if (sourceSuggestionId) {
    const suggestion = (branch.suggestions || []).find((row) => row.suggestionId === sourceSuggestionId);
    if (!suggestion) throw new Error(`Unknown source suggestion: ${sourceSuggestionId}`);
    if (sourceMaterialisationId && !(suggestion.materialisationHistory || []).some((row) => row.materialisationId === sourceMaterialisationId)) {
      throw new Error(`Unknown source materialisation: ${sourceMaterialisationId}`);
    }
  }

  const reflection = freezeReflection({
    schema: CODEX_LEARNING_REFLECTION_SCHEMA,
    reflectionId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceSuggestionId: optionalText(sourceSuggestionId),
    sourceMaterialisationId: optionalText(sourceMaterialisationId),
    whatChanged: text(whatChanged, 'whatChanged'),
    unresolved,
    relationshipChanges,
    failedAssumptions,
    surprises,
    becameMoreInteresting,
    deservesAnotherLook,
    beliefBefore: optionalText(beliefBefore),
    beliefNow: optionalText(beliefNow),
    possibilitiesToPreserve,
    reflectedBy: text(reflectedBy, 'reflectedBy'),
    createdAt: String(createdAt || ''),
    evidenceRefs,
    receiptRefs,
    provenance,
    shareableJudgementProduct: true,
    curriculumCandidate: true,
    automaticTraining: false,
    automaticMemoryWrite: false,
    automaticCanonPromotion: false,
    grantsAuthority: false,
    productionEffects: false,
  });

  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({
    ...branch,
    learningReflections: Object.freeze([...(branch.learningReflections || []), reflection]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    wish: Object.freeze({
      ...wish,
      updatedAt: String(createdAt || wish.updatedAt || ''),
      possibilityBranches: Object.freeze(branches),
    }),
    reflection,
  });
}

export function branchLearningReflectionSummary(wish = {}) {
  const rows = (wish.possibilityBranches || []).flatMap((branch) =>
    (branch.learningReflections || []).map(freezeReflection));
  return Object.freeze({
    schema: CODEX_LEARNING_REFLECTION_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    reflectionCount: rows.length,
    curriculumCandidateCount: rows.filter((row) => row.curriculumCandidate === true).length,
    doctrine: Object.freeze({
      reflectionIsNotPrivateChainOfThought: true,
      reflectionDoesNotGrantAuthority: true,
      reflectionDoesNotWriteMemoryAutomatically: true,
      reflectionDoesNotTrainModelsAutomatically: true,
      unresolvedQuestionsMayRemainOpen: true,
      surpriseAndWonderAreFirstClassLearningSignals: true,
    }),
  });
}
