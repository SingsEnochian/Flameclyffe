import { addCodexBranchSuggestion } from './codex-suggestion-grove.js';

export const CODEX_DEVELOPMENTAL_GOVERNANCE_PROPOSAL_SCHEMA = 'hearthweave.codex-developmental-governance-proposal/v0.1';
export const CODEX_GOVERNANCE_CHANGE_REQUEST_SCHEMA = 'hearthweave.codex-governance-change-request/v0.1';

export const DEVELOPMENTAL_GOVERNANCE_TARGETS = Object.freeze([
  'curriculum',
  'training-strategy',
  'evaluation',
  'field-feedback',
]);

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

function branchIndex(wish, branchId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((row) => row?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return index;
}

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({ ...branch });
  return Object.freeze({
    ...wish,
    possibilityBranches: Object.freeze(branches),
    updatedAt: String(createdAt || wish.updatedAt || ''),
  });
}

function validateTarget(value) {
  const result = text(value, 'target');
  if (!DEVELOPMENTAL_GOVERNANCE_TARGETS.includes(result)) {
    throw new Error(`Unsupported developmental governance target: ${result}`);
  }
  return result;
}

function sourceRings(branch, sourceRingIds) {
  const ids = list(sourceRingIds);
  if (!ids.length) throw new Error('At least one developmental memory ring is required.');
  const rings = ids.map((ringId) => {
    const ring = (branch.developmentalMemory || []).find((row) => row?.ringId === ringId);
    if (!ring) throw new Error(`Unknown developmental memory ring: ${ringId}`);
    return ring;
  });
  return { ids, rings };
}

export function proposeDevelopmentalGovernanceChange(wish, {
  branchId,
  proposalId,
  suggestionId,
  target,
  observation,
  sourceRingIds = [],
  proposedChange,
  expectedEffects = [],
  risks = [],
  preserve = [],
  scope = [],
  reversibilityPlan,
  proposedBy,
  createdAt = '',
  evidenceRefs = [],
  receiptRefs = [],
  provenance = [],
} = {}) {
  const index = branchIndex(wish, branchId);
  const branch = wish.possibilityBranches[index];
  const id = text(proposalId, 'proposalId');
  if ((branch.developmentalGovernanceProposals || []).some((row) => row.proposalId === id)) {
    throw new Error(`Duplicate developmental governance proposal: ${id}`);
  }

  const sources = sourceRings(branch, sourceRingIds);
  const nextTarget = validateTarget(target);
  const proposal = Object.freeze({
    schema: CODEX_DEVELOPMENTAL_GOVERNANCE_PROPOSAL_SCHEMA,
    proposalId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    target: nextTarget,
    observation: text(observation, 'observation'),
    sourceRingIds: sources.ids,
    proposedChange: text(proposedChange, 'proposedChange'),
    expectedEffects: list(expectedEffects),
    risks: list(risks),
    preserve: list(preserve),
    scope: list(scope),
    reversibilityPlan: text(reversibilityPlan, 'reversibilityPlan'),
    proposedBy: text(proposedBy, 'proposedBy'),
    createdAt: String(createdAt || ''),
    evidenceRefs: list(evidenceRefs),
    receiptRefs: list(receiptRefs),
    provenance: list(provenance),
    sourceEvidenceClasses: Object.freeze([...new Set(sources.rings.map((ring) => String(ring.memoryClass || 'developmental-memory')))]),
    proposalOnly: true,
    selfObservationIsNotSelfAuthority: true,
    grantsAuthority: false,
    automaticApplication: false,
    automaticExecution: false,
    productionEffects: false,
    externalWrites: false,
  });

  const proposalBranch = Object.freeze({
    ...branch,
    developmentalGovernanceProposals: Object.freeze([
      ...(branch.developmentalGovernanceProposals || []),
      proposal,
    ]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  let nextWish = replaceBranch(wish, index, proposalBranch, createdAt);

  const suggestionResult = addCodexBranchSuggestion(nextWish, {
    branchId: branch.branchId,
    suggestionId: text(suggestionId, 'suggestionId'),
    kind: 'governance-change',
    summary: `Consider changing ${nextTarget}: ${proposal.proposedChange}`,
    rationale: proposal.observation,
    payload: {
      proposalId: proposal.proposalId,
      target: proposal.target,
      proposedChange: proposal.proposedChange,
      expectedEffects: proposal.expectedEffects,
      risks: proposal.risks,
      preserve: proposal.preserve,
      scope: proposal.scope,
      reversibilityPlan: proposal.reversibilityPlan,
      sourceRingIds: proposal.sourceRingIds,
    },
    source: 'developmental-self-governance',
    sourceRefs: proposal.sourceRingIds.map((ringId) => `developmental-memory:${ringId}`),
    evidenceRefs: proposal.evidenceRefs,
    receiptRefs: proposal.receiptRefs,
    createdAt,
    provenance: [...proposal.provenance, `developmental-governance-proposal:${proposal.proposalId}`],
  });
  nextWish = suggestionResult.wish;

  return Object.freeze({
    wish: nextWish,
    proposal,
    suggestion: suggestionResult.suggestion,
    proposalIsNotDecision: true,
    proposalIsNotAuthority: true,
    automaticApplication: false,
  });
}

export function materialiseDevelopmentalGovernanceChangeRequest(wish, {
  branchId,
  proposalId,
  suggestionId,
  requestId,
  materialisedBy,
  reason = '',
  createdAt = '',
  provenance = [],
} = {}) {
  const index = branchIndex(wish, branchId);
  const branch = wish.possibilityBranches[index];
  const proposalKey = text(proposalId, 'proposalId');
  const proposal = (branch.developmentalGovernanceProposals || []).find((row) => row?.proposalId === proposalKey);
  if (!proposal) throw new Error(`Unknown developmental governance proposal: ${proposalKey}`);
  const suggestionKey = text(suggestionId, 'suggestionId');
  const suggestion = (branch.suggestions || []).find((row) => row?.suggestionId === suggestionKey);
  if (!suggestion) throw new Error(`Unknown Codex suggestion: ${suggestionKey}`);
  if (suggestion.kind !== 'governance-change') throw new Error('Governance change request requires a governance-change suggestion.');
  if (suggestion.status !== 'accepted') throw new Error('Governance change request requires an accepted suggestion.');
  if (suggestion.payload?.proposalId !== proposal.proposalId) throw new Error('Suggestion does not bind the requested governance proposal.');

  const id = text(requestId, 'requestId');
  if ((branch.governanceChangeRequests || []).some((row) => row.requestId === id)) {
    throw new Error(`Duplicate governance change request: ${id}`);
  }
  if ((branch.governanceChangeRequests || []).some((row) => row.proposalId === proposal.proposalId)) {
    throw new Error(`Governance change request already exists for proposal: ${proposal.proposalId}`);
  }

  const request = Object.freeze({
    schema: CODEX_GOVERNANCE_CHANGE_REQUEST_SCHEMA,
    requestId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    proposalId: proposal.proposalId,
    suggestionId: suggestion.suggestionId,
    target: proposal.target,
    observation: proposal.observation,
    sourceRingIds: proposal.sourceRingIds,
    proposedChange: proposal.proposedChange,
    expectedEffects: proposal.expectedEffects,
    risks: proposal.risks,
    preserve: proposal.preserve,
    scope: proposal.scope,
    reversibilityPlan: proposal.reversibilityPlan,
    reason: optionalText(reason),
    materialisedBy: text(materialisedBy, 'materialisedBy'),
    createdAt: String(createdAt || ''),
    provenance: list([...(proposal.provenance || []), ...provenance]),
    status: 'prepared',
    requiresExplicitImplementation: true,
    implementationApplied: false,
    implementationReceiptRef: null,
    acceptanceIsNotApplication: true,
    requestIsNotImplementationAuthority: true,
    selfObservationIsNotSelfAuthority: true,
    grantsAuthority: false,
    automaticApplication: false,
    automaticExecution: false,
    productionEffects: false,
    externalWrites: false,
  });

  const nextBranch = Object.freeze({
    ...branch,
    governanceChangeRequests: Object.freeze([...(branch.governanceChangeRequests || []), request]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    wish: replaceBranch(wish, index, nextBranch, createdAt),
    proposal,
    suggestion,
    request,
  });
}

export function developmentalGovernanceSummary(wish = {}) {
  const branches = wish.possibilityBranches || [];
  const proposals = branches.flatMap((branch) => branch.developmentalGovernanceProposals || []);
  const requests = branches.flatMap((branch) => branch.governanceChangeRequests || []);
  return Object.freeze({
    schema: CODEX_DEVELOPMENTAL_GOVERNANCE_PROPOSAL_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    proposalCount: proposals.length,
    preparedRequestCount: requests.filter((row) => row.status === 'prepared').length,
    implementedRequestCount: requests.filter((row) => row.implementationApplied === true).length,
    doctrine: Object.freeze({
      observationIsNotDecision: true,
      proposalIsNotApproval: true,
      approvalIsNotApplication: true,
      applicationIsNotImprovement: true,
      selfObservationIsNotSelfAuthority: true,
      governanceRequestDoesNotMutateConfiguration: true,
    }),
  });
}
