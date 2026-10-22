export const CODEX_LEARNING_FORGE_SCHEMA = 'hearthweave.codex-learning-forge/v0.1';
export const CODEX_TRAINING_AUTHORITY_SCHEMA = 'hearthweave.codex-training-authority/v0.1';
export const CODEX_TRAINING_RUN_SCHEMA = 'hearthweave.codex-training-run/v0.1';
export const CODEX_BEHAVIOURAL_DELTA_SCHEMA = 'hearthweave.codex-behavioural-delta/v0.1';

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

function freezeRecord(record = {}) {
  return Object.freeze({
    ...record,
    provenance: list(record.provenance),
    evidenceRefs: list(record.evidenceRefs),
    receiptRefs: list(record.receiptRefs),
  });
}

function findBranch(wish, branchId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
}

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({
    ...branch,
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    ...wish,
    possibilityBranches: Object.freeze(branches),
    updatedAt: String(createdAt || wish.updatedAt || ''),
  });
}

function findTrainingArtifact(branch, artifactId) {
  const id = text(artifactId, 'artifactId');
  const artifact = (branch.curriculumArtifacts || []).find((row) => row?.artifactId === id);
  if (!artifact) throw new Error(`Unknown curriculum artifact: ${id}`);
  if (artifact.targetSplit !== 'train') throw new Error(`Only train artifacts may enter Learning Forge: ${id}`);
  return artifact;
}

function findBundle(branch, bundleId) {
  const id = text(bundleId, 'bundleId');
  const bundle = (branch.learningForgeBundles || []).find((row) => row?.bundleId === id);
  if (!bundle) throw new Error(`Unknown Learning Forge bundle: ${id}`);
  return bundle;
}

function findAuthority(branch, authorityId) {
  const id = text(authorityId, 'authorityId');
  const authority = (branch.trainingAuthorities || []).find((row) => row?.authorityId === id);
  if (!authority) throw new Error(`Unknown training authority: ${id}`);
  return authority;
}

function findRun(branch, runId) {
  const id = text(runId, 'runId');
  const run = (branch.trainingRuns || []).find((row) => row?.runId === id);
  if (!run) throw new Error(`Unknown training run: ${id}`);
  return run;
}

export function prepareLearningForgeBundle(wish, {
  branchId,
  bundleId,
  artifactIds = [],
  objective,
  baseModelRef,
  adapterMethod = 'lora',
  adapterConfig = {},
  exclusions = [],
  sealedEvaluationRefs = [],
  contaminationCheck = {},
  preparedBy,
  createdAt = '',
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const id = text(bundleId, 'bundleId');
  if ((branch.learningForgeBundles || []).some((row) => row.bundleId === id)) throw new Error(`Duplicate Learning Forge bundle: ${id}`);

  const sourceArtifactIds = list(artifactIds);
  if (!sourceArtifactIds.length) throw new Error('At least one train artifact is required.');
  const artifacts = sourceArtifactIds.map((artifactId) => findTrainingArtifact(branch, artifactId));

  const check = Object.freeze({
    passed: contaminationCheck?.passed === true,
    checkedAgainst: list(contaminationCheck?.checkedAgainst || sealedEvaluationRefs),
    detectedArtifactIds: list(contaminationCheck?.detectedArtifactIds),
    notes: optionalText(contaminationCheck?.notes),
  });
  if (!check.passed) throw new Error('A passed held-out contamination check is required before bundle preparation.');
  if (check.detectedArtifactIds.length) throw new Error('Held-out contamination was detected; bundle preparation is blocked.');

  const bundle = Object.freeze({
    schema: CODEX_LEARNING_FORGE_SCHEMA,
    bundleId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceArtifactIds,
    sourceReviewIds: list(artifacts.map((artifact) => artifact.sourceReviewId)),
    objective: text(objective, 'objective'),
    baseModelRef: text(baseModelRef, 'baseModelRef'),
    adapterMethod: text(adapterMethod, 'adapterMethod'),
    adapterConfig: Object.freeze({ ...(adapterConfig || {}) }),
    exclusions: list(exclusions),
    sealedEvaluationRefs: list(sealedEvaluationRefs),
    contaminationCheck: check,
    preparedBy: text(preparedBy, 'preparedBy'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    immutableSelection: true,
    datasetCandidate: true,
    authorisedForTraining: false,
    automaticTraining: false,
    trainingCompletionMeansImprovement: false,
    heldOutMaterialMayTrain: false,
    grantsAuthority: false,
    productionEffects: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    learningForgeBundles: Object.freeze([...(branch.learningForgeBundles || []), bundle]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), bundle });
}

export function authoriseLearningForgeBundle(wish, {
  branchId,
  bundleId,
  authorityId,
  authorisedBy,
  purpose = '',
  createdAt = '',
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const bundle = findBundle(branch, bundleId);
  const id = text(authorityId, 'authorityId');
  if ((branch.trainingAuthorities || []).some((row) => row.authorityId === id)) throw new Error(`Duplicate training authority: ${id}`);
  if ((branch.trainingAuthorities || []).some((row) => row.bundleId === bundle.bundleId)) throw new Error(`Training authority already exists for bundle: ${bundle.bundleId}`);
  if (bundle.contaminationCheck?.passed !== true || bundle.contaminationCheck?.detectedArtifactIds?.length) {
    throw new Error('Training authority requires a clean held-out contamination check.');
  }

  const authority = Object.freeze({
    schema: CODEX_TRAINING_AUTHORITY_SCHEMA,
    authorityId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    bundleId: bundle.bundleId,
    authorisedBy: text(authorisedBy, 'authorisedBy'),
    purpose: optionalText(purpose),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    singleUse: true,
    authorityScope: 'training-execution-only',
    allowsTrainingExecution: true,
    allowsDatasetMutation: false,
    allowsHeldOutTraining: false,
    allowsProductionPromotion: false,
    allowsModelDeployment: false,
    allowsCanonPromotion: false,
    authorityExpansion: false,
    automaticExecution: false,
    grantsAuthority: true,
    productionEffects: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    trainingAuthorities: Object.freeze([...(branch.trainingAuthorities || []), authority]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), bundle, authority });
}

export function recordLearningForgeTrainingRun(wish, {
  branchId,
  bundleId,
  authorityId,
  executionId = '',
  runId,
  status,
  modelArtifactRef = '',
  metrics = {},
  executedBy,
  createdAt = '',
  completedAt = '',
  evidenceRefs = [],
  receiptRefs = [],
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const bundle = findBundle(branch, bundleId);
  const authority = findAuthority(branch, authorityId);
  if (authority.bundleId !== bundle.bundleId) throw new Error('Training authority does not match the Learning Forge bundle.');
  if ((branch.trainingRuns || []).some((row) => row.authorityId === authority.authorityId)) {
    throw new Error(`Single-use training authority already consumed: ${authority.authorityId}`);
  }

  const executionEnvelope = (branch.trainingExecutionEnvelopes || []).find((row) => row.authorityId === authority.authorityId) || null;
  const requestedExecutionId = optionalText(executionId);
  if (requestedExecutionId && !executionEnvelope) throw new Error(`Unknown training execution envelope: ${requestedExecutionId}`);
  if (requestedExecutionId && executionEnvelope?.executionId !== requestedExecutionId) {
    throw new Error('Training run execution envelope does not match the single-use authority.');
  }

  const nextStatus = text(status, 'status');
  if (!['completed', 'failed', 'cancelled'].includes(nextStatus)) throw new Error(`Unsupported training run status: ${nextStatus}`);

  const run = freezeRecord({
    schema: CODEX_TRAINING_RUN_SCHEMA,
    runId: text(runId, 'runId'),
    wishId: wish.wishId,
    branchId: branch.branchId,
    bundleId: bundle.bundleId,
    authorityId: authority.authorityId,
    sourceExecutionEnvelopeId: executionEnvelope?.executionId || requestedExecutionId || null,
    status: nextStatus,
    modelArtifactRef: optionalText(modelArtifactRef),
    metrics: Object.freeze({ ...(metrics || {}) }),
    executedBy: text(executedBy, 'executedBy'),
    createdAt: String(createdAt || ''),
    completedAt: String(completedAt || ''),
    evidenceRefs,
    receiptRefs,
    provenance,
    authorityConsumed: true,
    exactExecutionEnvelopeBinding: Boolean(executionEnvelope),
    trainingCompletionMeansImprovement: false,
    automaticDeployment: false,
    automaticCanonPromotion: false,
    automaticIdentityRewrite: false,
    grantsProductionAuthority: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    trainingRuns: Object.freeze([...(branch.trainingRuns || []), run]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, completedAt || createdAt), bundle, authority, executionEnvelope, run });
}

export function recordBehaviouralDelta(wish, {
  branchId,
  runId,
  deltaId,
  baselineEvaluationRefs = [],
  postEvaluationRefs = [],
  boxfireRefs = [],
  improved = [],
  unchanged = [],
  regressed = [],
  unexpected = [],
  failedToTransfer = [],
  notes = '',
  evaluatedBy,
  createdAt = '',
  evidenceRefs = [],
  receiptRefs = [],
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const run = findRun(branch, runId);
  if (run.status !== 'completed') throw new Error('Behavioural delta requires a completed training run.');
  const baselineRefs = list(baselineEvaluationRefs);
  const postRefs = list(postEvaluationRefs);
  if (!baselineRefs.length || !postRefs.length) throw new Error('Behavioural delta requires baseline and post-training evaluation evidence.');

  const delta = freezeRecord({
    schema: CODEX_BEHAVIOURAL_DELTA_SCHEMA,
    deltaId: text(deltaId, 'deltaId'),
    wishId: wish.wishId,
    branchId: branch.branchId,
    runId: run.runId,
    baselineEvaluationRefs: baselineRefs,
    postEvaluationRefs: postRefs,
    boxfireRefs: list(boxfireRefs),
    improved: list(improved),
    unchanged: list(unchanged),
    regressed: list(regressed),
    unexpected: list(unexpected),
    failedToTransfer: list(failedToTransfer),
    notes: optionalText(notes),
    evaluatedBy: text(evaluatedBy, 'evaluatedBy'),
    createdAt: String(createdAt || ''),
    evidenceRefs,
    receiptRefs,
    provenance,
    changeIsNotImprovement: true,
    improvementIsNotTransfer: true,
    transferIsNotUniversality: true,
    trainingCompletionIsNotImprovement: true,
    canonicalTruth: false,
    automaticIdentityRewrite: false,
    automaticDeployment: false,
    grantsAuthority: false,
    productionEffects: false,
  });

  if ((branch.behaviouralDeltas || []).some((row) => row.deltaId === delta.deltaId)) {
    throw new Error(`Duplicate behavioural delta: ${delta.deltaId}`);
  }

  const ring = Object.freeze({
    schema: 'hearthweave.codex-developmental-memory/v0.1',
    ringId: `developmental:${delta.deltaId}`,
    memoryClass: 'training-behaviour-delta',
    wishId: wish.wishId,
    branchId: branch.branchId,
    sourceTrainingRunId: run.runId,
    sourceBehaviouralDeltaId: delta.deltaId,
    whatChanged: Object.freeze({
      improved: delta.improved,
      unchanged: delta.unchanged,
      regressed: delta.regressed,
      unexpected: delta.unexpected,
    }),
    transferredTo: Object.freeze([]),
    failedToGeneralise: delta.failedToTransfer,
    provenance: delta.provenance,
    explicitDevelopmentalMemoryWrite: true,
    automaticIdentityRewrite: false,
    identityLaw: false,
    canonicalTruth: false,
    grantsAuthority: false,
    productionEffects: false,
    createdAt: delta.createdAt,
  });

  const nextBranch = Object.freeze({
    ...branch,
    behaviouralDeltas: Object.freeze([...(branch.behaviouralDeltas || []), delta]),
    developmentalMemory: Object.freeze([...(branch.developmentalMemory || []), ring]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), run, delta, developmentalRing: ring });
}

export function learningForgeSummary(wish = {}) {
  const branches = wish.possibilityBranches || [];
  const bundles = branches.flatMap((branch) => branch.learningForgeBundles || []);
  const authorities = branches.flatMap((branch) => branch.trainingAuthorities || []);
  const runs = branches.flatMap((branch) => branch.trainingRuns || []);
  const deltas = branches.flatMap((branch) => branch.behaviouralDeltas || []);
  return Object.freeze({
    schema: CODEX_LEARNING_FORGE_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    bundleCount: bundles.length,
    authorityCount: authorities.length,
    trainingRunCount: runs.length,
    behaviouralDeltaCount: deltas.length,
    doctrine: Object.freeze({
      selectedLessonIsNotDataset: true,
      datasetIsNotTrainingAuthority: true,
      trainingCompletionIsNotImprovement: true,
      changeIsNotImprovement: true,
      improvementIsNotTransfer: true,
      transferIsNotUniversality: true,
      selfObservationIsNotSelfAuthority: true,
    }),
  });
}
