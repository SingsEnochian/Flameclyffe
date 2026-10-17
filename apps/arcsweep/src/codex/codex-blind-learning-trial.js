export const CODEX_BLIND_LEARNING_TRIAL_SCHEMA = 'hearthweave.codex-blind-learning-trial/v0.1';

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

function scoreMap(value = {}) {
  return Object.freeze(Object.fromEntries(
    Object.entries(value || {}).map(([key, raw]) => [String(key), Number(raw)]).filter(([, number]) => Number.isFinite(number)),
  ));
}

function findBranch(wish, branchId) {
  const id = text(branchId, 'branchId');
  const index = (wish?.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return { index, branch: wish.possibilityBranches[index] };
}

function findRun(branch, runId) {
  const id = text(runId, 'runId');
  const run = (branch.trainingRuns || []).find((row) => row?.runId === id);
  if (!run) throw new Error(`Unknown training run: ${id}`);
  if (run.status !== 'completed') throw new Error('Blind post-training evaluation requires a completed training run.');
  return run;
}

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({ ...branch, updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || '') });
  return Object.freeze({ ...wish, possibilityBranches: Object.freeze(branches), updatedAt: String(createdAt || wish.updatedAt || '') });
}

function sameSet(a, b) {
  const left = [...new Set(a)].sort();
  const right = [...new Set(b)].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function recordBlindLearningTrial(wish, {
  branchId,
  trialId,
  runId,
  cohortId,
  caseIds = [],
  baseline = {},
  post = {},
  transferCaseIds = [],
  transfer = {},
  evaluatorRefs = [],
  boxfireRefs = [],
  notes = '',
  evaluatedBy,
  createdAt = '',
  provenance = [],
} = {}) {
  const { index, branch } = findBranch(wish, branchId);
  const run = findRun(branch, runId);
  const id = text(trialId, 'trialId');
  if ((branch.blindLearningTrials || []).some((row) => row.trialId === id)) throw new Error(`Duplicate blind learning trial: ${id}`);

  const blindCaseIds = list(caseIds);
  if (!blindCaseIds.length) throw new Error('At least one sealed blind case is required.');
  const baselineCaseIds = list(baseline?.caseIds || blindCaseIds);
  const postCaseIds = list(post?.caseIds || blindCaseIds);
  if (!sameSet(blindCaseIds, baselineCaseIds) || !sameSet(blindCaseIds, postCaseIds)) {
    throw new Error('Baseline and post-training blind evaluation must use the same sealed cohort case IDs.');
  }

  const trial = Object.freeze({
    schema: CODEX_BLIND_LEARNING_TRIAL_SCHEMA,
    trialId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    runId: run.runId,
    cohortId: text(cohortId, 'cohortId'),
    caseIds: blindCaseIds,
    baseline: Object.freeze({
      caseIds: baselineCaseIds,
      dimensionScores: scoreMap(baseline?.dimensionScores),
      evidenceRefs: list(baseline?.evidenceRefs),
      completedAt: String(baseline?.completedAt || ''),
    }),
    post: Object.freeze({
      caseIds: postCaseIds,
      dimensionScores: scoreMap(post?.dimensionScores),
      evidenceRefs: list(post?.evidenceRefs),
      completedAt: String(post?.completedAt || ''),
    }),
    transfer: Object.freeze({
      caseIds: list(transferCaseIds),
      dimensionScores: scoreMap(transfer?.dimensionScores),
      evidenceRefs: list(transfer?.evidenceRefs),
      completedAt: String(transfer?.completedAt || ''),
    }),
    evaluatorRefs: list(evaluatorRefs),
    boxfireRefs: list(boxfireRefs),
    notes: optionalText(notes),
    evaluatedBy: text(evaluatedBy, 'evaluatedBy'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    sameBlindCohortBeforeAndAfter: true,
    heldOutCasesRemainNonTraining: true,
    noOverallWinnerDeclared: true,
    scoresAreEvaluationSignalsNotAuthority: true,
    grantsAuthority: false,
    productionEffects: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    blindLearningTrials: Object.freeze([...(branch.blindLearningTrials || []), trial]),
  });
  return Object.freeze({ wish: replaceBranch(wish, index, nextBranch, createdAt), run, trial });
}

export function dimensionDeltas(trial) {
  const baseline = trial?.baseline?.dimensionScores || {};
  const post = trial?.post?.dimensionScores || {};
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(post)])].sort();
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, Object.freeze({
    before: Number.isFinite(baseline[key]) ? baseline[key] : null,
    after: Number.isFinite(post[key]) ? post[key] : null,
    delta: Number.isFinite(baseline[key]) && Number.isFinite(post[key]) ? post[key] - baseline[key] : null,
  })])));
}

export function blindLearningTrialSummary(wish = {}) {
  const trials = (wish.possibilityBranches || []).flatMap((branch) => branch.blindLearningTrials || []);
  return Object.freeze({
    schema: CODEX_BLIND_LEARNING_TRIAL_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    trialCount: trials.length,
    doctrine: Object.freeze({
      blindEvaluationIsNotTraining: true,
      aggregateScoreIsNotOverallVerdict: true,
      evaluationSignalIsNotAuthority: true,
      transferMustBeTestedSeparately: true,
    }),
  });
}
