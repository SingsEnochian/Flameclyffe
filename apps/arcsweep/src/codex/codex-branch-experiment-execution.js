import { recordCodexBranchExperimentResult } from './codex-branch-experiment-proposal.js';

export const CODEX_BRANCH_EXECUTION_PERMISSION_SCHEMA = 'hearthweave.codex-branch-execution-permission/v0.1';
export const CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA = 'hearthweave.codex-branch-experiment-return/v0.1';

function text(value, label = 'value') {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function list(values = []) {
  return Object.freeze([...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]);
}

function findMaterialisedProposal(wish, branchId, proposalId, experimentId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const branchKey = text(branchId, 'branchId');
  const proposalKey = text(proposalId, 'proposalId');
  const experimentKey = text(experimentId, 'experimentId');
  const branch = (wish.possibilityBranches || []).find((row) => row.branchId === branchKey);
  if (!branch) throw new Error(`Unknown wish branch: ${branchKey}`);
  const proposal = (branch.experimentProposals || []).find((row) => row.proposalId === proposalKey);
  if (!proposal) throw new Error(`Unknown branch experiment proposal: ${proposalKey}`);
  const handoff = (proposal.handoffs || []).find((row) => row.experimentId === experimentKey);
  if (!handoff) throw new Error(`Experiment ${experimentKey} is not materialised from proposal ${proposalKey}.`);
  return { branch, proposal, handoff };
}

export function createBranchExecutionPermission({
  permissionId,
  wishId,
  branchId,
  proposalId,
  experimentId,
  handoffEnvelopeId,
  grantedBy,
  rounds = 1,
  createdAt = '',
  constraints = [],
  provenance = [],
} = {}) {
  const boundedRounds = Math.max(1, Math.min(3, Number(rounds) || 1));
  return Object.freeze({
    schema: CODEX_BRANCH_EXECUTION_PERMISSION_SCHEMA,
    permissionId: text(permissionId, 'permissionId'),
    wishId: text(wishId, 'wishId'),
    branchId: text(branchId, 'branchId'),
    proposalId: text(proposalId, 'proposalId'),
    experimentId: text(experimentId, 'experimentId'),
    handoffEnvelopeId: text(handoffEnvelopeId, 'handoffEnvelopeId'),
    grantedBy: text(grantedBy, 'grantedBy'),
    scope: 'run-sealed-sandbox-experiment',
    allowsSandboxExecution: true,
    allowsProductionEffects: false,
    allowsExternalWrites: false,
    allowsAuthorityExpansion: false,
    allowsAutomaticPromotion: false,
    rounds: boundedRounds,
    constraints: list(constraints),
    provenance: list(provenance),
    createdAt: String(createdAt || ''),
  });
}

export function validateBranchExecutionPermission(permission, {
  wishId,
  branchId,
  proposalId,
  experimentId,
  handoffEnvelopeId,
} = {}) {
  if (permission?.schema !== CODEX_BRANCH_EXECUTION_PERMISSION_SCHEMA) return false;
  return Boolean(
    permission.scope === 'run-sealed-sandbox-experiment'
    && permission.allowsSandboxExecution === true
    && permission.allowsProductionEffects === false
    && permission.allowsExternalWrites === false
    && permission.allowsAuthorityExpansion === false
    && permission.allowsAutomaticPromotion === false
    && permission.wishId === String(wishId || '')
    && permission.branchId === String(branchId || '')
    && permission.proposalId === String(proposalId || '')
    && permission.experimentId === String(experimentId || '')
    && permission.handoffEnvelopeId === String(handoffEnvelopeId || '')
  );
}

export async function runBranchSandboxExperiment({
  wish,
  branchId,
  proposalId,
  experimentId,
  permission,
  runtime,
  runtimeOptions = {},
  createdAt = '',
} = {}) {
  const { branch, proposal, handoff } = findMaterialisedProposal(wish, branchId, proposalId, experimentId);
  if (!validateBranchExecutionPermission(permission, {
    wishId: wish.wishId,
    branchId: branch.branchId,
    proposalId: proposal.proposalId,
    experimentId: handoff.experimentId,
    handoffEnvelopeId: handoff.envelopeId,
  })) {
    throw new Error('A matching run-sealed-sandbox-experiment permission is required.');
  }
  if (typeof runtime?.runExperiment !== 'function') throw new Error('Aspect experiment runtime is unavailable.');

  const result = await runtime.runExperiment({
    experimentId: handoff.experimentId,
    rounds: permission.rounds,
    autoReflect: false,
    runtimeOptions: {
      ...runtimeOptions,
      metadata: {
        ...(runtimeOptions.metadata || {}),
        surface: 'codex-wish-grove-sandbox-execution',
        codex_wish_id: wish.wishId,
        codex_branch_id: branch.branchId,
        codex_proposal_id: proposal.proposalId,
        codex_handoff_envelope_id: handoff.envelopeId,
        codex_execution_permission_id: permission.permissionId,
      },
    },
  });

  const outcomeEnvelope = result?.outcomeEnvelope || null;
  const experiment = result?.experiment || null;
  const completed = ['completed', 'reflected', 'already-complete'].includes(String(result?.status || ''));
  const returnId = `branch-experiment-return:${handoff.experimentId}:${outcomeEnvelope?.id || result?.status || 'unknown'}`;
  return Object.freeze({
    schema: CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA,
    returnId,
    wishId: wish.wishId,
    branchId: branch.branchId,
    proposalId: proposal.proposalId,
    experimentId: handoff.experimentId,
    handoffEnvelopeId: handoff.envelopeId,
    executionPermissionId: permission.permissionId,
    status: String(result?.status || 'unknown'),
    outcome: String(experiment?.outcome || (completed ? 'observed' : 'inconclusive')),
    observation: String(experiment?.observation || outcomeEnvelope?.body?.observation || result?.reason || 'Sandbox returned without a textual observation.'),
    evidenceRefs: list(outcomeEnvelope?.evidenceRefs || []),
    receiptRefs: list([
      handoff.envelopeId ? `experiment-proposal-envelope:${handoff.envelopeId}` : null,
      outcomeEnvelope?.id ? `experiment-outcome-envelope:${outcomeEnvelope.id}` : null,
    ].filter(Boolean)),
    provenance: list([
      ...permission.provenance,
      `execution-permission:${permission.permissionId}`,
      `experiment:${handoff.experimentId}`,
      handoff.envelopeId ? `handoff-envelope:${handoff.envelopeId}` : null,
      outcomeEnvelope?.id ? `outcome-envelope:${outcomeEnvelope.id}` : null,
    ].filter(Boolean)),
    suggestedBranchStatus: completed ? 'simulated' : null,
    suggestionOnly: true,
    ingestedIntoCodex: false,
    grantsAuthority: false,
    productionEffects: false,
    automaticPromotion: false,
    createdAt: String(createdAt || new Date().toISOString()),
  });
}

export function ingestBranchExperimentReturn(wish, returnObject, {
  resultId = null,
  createdAt = returnObject?.createdAt || '',
} = {}) {
  if (returnObject?.schema !== CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA) {
    throw new Error('A valid branch experiment return is required.');
  }
  if (returnObject.wishId !== wish?.wishId) throw new Error('Experiment return wishId does not match source wish.');
  const updated = recordCodexBranchExperimentResult(wish, {
    branchId: returnObject.branchId,
    proposalId: returnObject.proposalId,
    resultId: resultId || returnObject.returnId,
    outcome: returnObject.outcome,
    observation: returnObject.observation,
    uncertainties: returnObject.status === 'completed' ? [] : [`runtime-status:${returnObject.status}`],
    evidenceRefs: returnObject.evidenceRefs,
    receiptRefs: returnObject.receiptRefs,
    provenance: [
      ...returnObject.provenance,
      `branch-experiment-return:${returnObject.returnId}`,
    ],
    createdAt,
  });
  return Object.freeze({
    wish: updated,
    suggestedBranchStatus: returnObject.suggestedBranchStatus,
    transitionApplied: false,
    questionsAutomaticallyCreated: false,
    authorityGranted: false,
  });
}
