export const CODEX_TRAINING_EXECUTION_SCHEMA = 'hearthweave.codex-training-execution-envelope/v0.1';

function text(value, label = 'value') {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function list(values = []) {
  const source = Array.isArray(values) ? values : [values];
  return Object.freeze([...new Set(source.map((value) => String(value || '').trim()).filter(Boolean))]);
}

function findBranch(wish, branchId) {
  const id = text(branchId, 'branchId');
  const index = (wish?.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
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

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({ ...branch, updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || '') });
  return Object.freeze({ ...wish, possibilityBranches: Object.freeze(branches), updatedAt: String(createdAt || wish.updatedAt || '') });
}

export function materialiseTrainingExecutionEnvelope(wish, {
  branchId,
  bundleId,
  authorityId,
  executionId,
  executorTarget,
  runtimeProfile = {},
  preparedBy,
  createdAt = '',
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const bundle = findBundle(branch, bundleId);
  const authority = findAuthority(branch, authorityId);
  if (authority.bundleId !== bundle.bundleId) throw new Error('Training authority does not match the selected bundle.');
  if ((branch.trainingRuns || []).some((row) => row.authorityId === authority.authorityId)) {
    throw new Error(`Training authority already consumed: ${authority.authorityId}`);
  }

  const id = text(executionId, 'executionId');
  if ((branch.trainingExecutionEnvelopes || []).some((row) => row.executionId === id)) throw new Error(`Duplicate training execution envelope: ${id}`);
  if ((branch.trainingExecutionEnvelopes || []).some((row) => row.authorityId === authority.authorityId)) {
    throw new Error(`Training execution envelope already exists for authority: ${authority.authorityId}`);
  }

  const envelope = Object.freeze({
    schema: CODEX_TRAINING_EXECUTION_SCHEMA,
    executionId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    bundleId: bundle.bundleId,
    authorityId: authority.authorityId,
    executorTarget: text(executorTarget, 'executorTarget'),
    trainingInput: Object.freeze({
      sourceArtifactIds: bundle.sourceArtifactIds,
      objective: bundle.objective,
      baseModelRef: bundle.baseModelRef,
      adapterMethod: bundle.adapterMethod,
      adapterConfig: bundle.adapterConfig,
      exclusions: bundle.exclusions,
      sealedEvaluationRefs: bundle.sealedEvaluationRefs,
    }),
    runtimeProfile: Object.freeze({ ...(runtimeProfile || {}) }),
    preparedBy: text(preparedBy, 'preparedBy'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    exactBundleBinding: true,
    exactAuthorityBinding: true,
    autoStart: false,
    automaticDeployment: false,
    automaticEvaluation: false,
    automaticCanonPromotion: false,
    allowsDatasetMutation: false,
    allowsHeldOutTraining: false,
    allowsAuthorityExpansion: false,
    grantsAdditionalAuthority: false,
    productionEffects: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    trainingExecutionEnvelopes: Object.freeze([...(branch.trainingExecutionEnvelopes || []), envelope]),
  });

  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), bundle, authority, envelope });
}

export function trainingExecutionSummary(wish = {}) {
  const envelopes = (wish.possibilityBranches || []).flatMap((branch) => branch.trainingExecutionEnvelopes || []);
  return Object.freeze({
    schema: CODEX_TRAINING_EXECUTION_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    envelopeCount: envelopes.length,
    doctrine: Object.freeze({
      materialisedExecutionIsNotStartedExecution: true,
      trainingAuthorityDoesNotAuthoriseDeployment: true,
      executorMayNotMutateDataset: true,
      heldOutMaterialMayNotTrain: true,
    }),
  });
}
