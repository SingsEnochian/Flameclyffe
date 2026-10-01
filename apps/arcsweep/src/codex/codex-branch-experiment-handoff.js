export const CODEX_BRANCH_EXPERIMENT_PERMISSION_SCHEMA = 'hearthweave.codex-branch-experiment-permission/v0.1';
export const CODEX_BRANCH_EXPERIMENT_HANDOFF_SCHEMA = 'hearthweave.codex-branch-experiment-handoff/v0.1';

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

function findProposal(wish, branchId, proposalId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const branchKey = text(branchId, 'branchId');
  const proposalKey = text(proposalId, 'proposalId');
  const branch = (wish.possibilityBranches || []).find((row) => row.branchId === branchKey);
  if (!branch) throw new Error(`Unknown wish branch: ${branchKey}`);
  const proposal = (branch.experimentProposals || []).find((row) => row.proposalId === proposalKey);
  if (!proposal) throw new Error(`Unknown branch experiment proposal: ${proposalKey}`);
  return { branch, proposal };
}

export function createBranchExperimentPermission({
  permissionId,
  wishId,
  branchId,
  proposalId,
  grantedBy,
  createdAt = '',
  constraints = [],
  provenance = [],
} = {}) {
  return Object.freeze({
    schema: CODEX_BRANCH_EXPERIMENT_PERMISSION_SCHEMA,
    permissionId: text(permissionId, 'permissionId'),
    wishId: text(wishId, 'wishId'),
    branchId: text(branchId, 'branchId'),
    proposalId: text(proposalId, 'proposalId'),
    grantedBy: text(grantedBy, 'grantedBy'),
    scope: 'materialise-sandbox-proposal',
    allowsProposalMaterialisation: true,
    allowsExperimentExecution: false,
    allowsProductionEffects: false,
    allowsExternalWrites: false,
    allowsAuthorityExpansion: false,
    constraints: list(constraints),
    provenance: list(provenance),
    createdAt: String(createdAt || ''),
  });
}

export function validateBranchExperimentPermission(permission, { wishId, branchId, proposalId } = {}) {
  if (permission?.schema !== CODEX_BRANCH_EXPERIMENT_PERMISSION_SCHEMA) return false;
  return Boolean(
    permission.allowsProposalMaterialisation === true
    && permission.allowsExperimentExecution === false
    && permission.allowsProductionEffects === false
    && permission.allowsExternalWrites === false
    && permission.allowsAuthorityExpansion === false
    && permission.scope === 'materialise-sandbox-proposal'
    && permission.wishId === String(wishId || '')
    && permission.branchId === String(branchId || '')
    && permission.proposalId === String(proposalId || '')
  );
}

export function materialiseBranchExperimentProposal({
  wish,
  branchId,
  proposalId,
  permission,
  runtime,
  aspectId,
  collaborators = [],
  createdAt = '',
} = {}) {
  const { branch, proposal } = findProposal(wish, branchId, proposalId);
  if (!validateBranchExperimentPermission(permission, {
    wishId: wish.wishId,
    branchId: branch.branchId,
    proposalId: proposal.proposalId,
  })) {
    throw new Error('A matching materialise-sandbox-proposal permission is required.');
  }
  if (typeof runtime?.proposeExperiment !== 'function') throw new Error('Aspect experiment runtime is unavailable.');
  const initiator = text(aspectId, 'aspectId');
  const envelope = runtime.proposeExperiment({
    aspectId: initiator,
    title: proposal.title,
    hypothesis: proposal.hypothesis,
    method: proposal.method,
    reversibleScope: `Synthetic sandbox only for Codex wish ${wish.wishId}, branch ${branch.branchId}, proposal ${proposal.proposalId}. No production effects or external writes.`,
    collaborators: list(collaborators),
    successSignals: proposal.successSignals || [],
    operation: {
      reversible: true,
      external: false,
      externallyBinding: false,
      financial: false,
      destructive: false,
      exposesCredentials: false,
      exposesSecrets: false,
      identityMutation: null,
      canonPromotion: null,
      permissionExpansion: false,
      consentBoundary: false,
      production: false,
      practicalRecovery: true,
    },
    autoStart: false,
    tags: [
      'codex-wish-branch',
      `wish:${wish.wishId}`,
      `branch:${branch.branchId}`,
      `proposal:${proposal.proposalId}`,
      `permission:${permission.permissionId}`,
    ],
  });
  const experimentId = envelope?.body?.experimentId || null;
  if (!experimentId || !envelope?.id) throw new Error('Experiment proposal materialisation did not return a valid envelope.');
  return Object.freeze({
    schema: CODEX_BRANCH_EXPERIMENT_HANDOFF_SCHEMA,
    wishId: wish.wishId,
    branchId: branch.branchId,
    proposalId: proposal.proposalId,
    permissionId: permission.permissionId,
    grantedBy: permission.grantedBy,
    aspectId: initiator,
    collaborators: list(collaborators),
    experimentId: String(experimentId),
    envelopeId: String(envelope.id),
    traceId: envelope.traceId ? String(envelope.traceId) : null,
    createdAt: String(createdAt || envelope.createdAt || ''),
    executionStarted: false,
    productionEffects: false,
    grantsAuthority: false,
    provenance: Object.freeze([
      ...permission.provenance,
      `permission:${permission.permissionId}`,
      `envelope:${envelope.id}`,
    ]),
  });
}

export function recordBranchExperimentHandoff(wish, handoff) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  if (handoff?.schema !== CODEX_BRANCH_EXPERIMENT_HANDOFF_SCHEMA) throw new Error('A valid branch experiment handoff is required.');
  if (handoff.wishId !== wish.wishId) throw new Error('Handoff wishId does not match source wish.');
  const { branch, proposal } = findProposal(wish, handoff.branchId, handoff.proposalId);
  const branches = [...wish.possibilityBranches];
  const branchIndex = branches.findIndex((row) => row.branchId === branch.branchId);
  const proposals = [...(branch.experimentProposals || [])];
  const proposalIndex = proposals.findIndex((row) => row.proposalId === proposal.proposalId);
  if ((proposal.handoffs || []).some((row) => row.envelopeId === handoff.envelopeId)) {
    throw new Error(`Duplicate branch experiment handoff envelope: ${handoff.envelopeId}`);
  }
  proposals[proposalIndex] = Object.freeze({
    ...proposal,
    status: 'materialised',
    handoffs: Object.freeze([...(proposal.handoffs || []), Object.freeze({ ...handoff })]),
  });
  branches[branchIndex] = Object.freeze({
    ...branch,
    updatedAt: String(handoff.createdAt || branch.updatedAt || branch.createdAt || ''),
    experimentProposals: Object.freeze(proposals),
  });
  return Object.freeze({
    ...wish,
    updatedAt: String(handoff.createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
    provenance: list([...(wish.provenance || []), ...(handoff.provenance || [])]),
    receipts: list([...(wish.receipts || []), `experiment-envelope:${handoff.envelopeId}`]),
  });
}
