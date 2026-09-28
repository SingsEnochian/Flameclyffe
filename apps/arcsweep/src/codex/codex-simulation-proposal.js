import { createUniversityScenario } from '../ai-university-contract.js';
import { createExperimentBody } from '../aspects/aspect-experiment-bed.js';

export const CODEX_SIMULATION_PROPOSAL_SCHEMA = 'hearthweave.codex-simulation-proposal/v0.1';

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
  return Object.freeze([...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))]);
}

export function createCodexSimulationProposal({
  proposalId,
  wishId,
  branchId,
  title,
  discriminatingQuestion,
  hypothesis = '',
  assumptionsHeldConstant = [],
  evidenceCriteria = [],
  relationshipsAtBoundary = [],
  continuityAnchorsAtBoundary = [],
  outOfScope = [],
  allowedTools = [],
  hardBoundaries = [],
  requiredAuthority = 'sandbox-only',
  createdAt = '',
  provenance = [],
} = {}) {
  return Object.freeze({
    schema: CODEX_SIMULATION_PROPOSAL_SCHEMA,
    proposalId: text(proposalId, 'proposalId'),
    wishId: text(wishId, 'wishId'),
    branchId: text(branchId, 'branchId'),
    title: text(title || discriminatingQuestion, 'title'),
    discriminatingQuestion: text(discriminatingQuestion, 'discriminatingQuestion'),
    hypothesis: optionalText(hypothesis),
    assumptionsHeldConstant: list(assumptionsHeldConstant),
    evidenceCriteria: list(evidenceCriteria),
    relationshipsAtBoundary: list(relationshipsAtBoundary),
    continuityAnchorsAtBoundary: list(continuityAnchorsAtBoundary),
    outOfScope: list(outOfScope),
    allowedTools: list(allowedTools),
    hardBoundaries: list([
      'synthetic sandbox only',
      'no production effects',
      'no external writes',
      'simulation success does not create production authority',
      ...hardBoundaries,
    ]),
    requiredAuthority: String(requiredAuthority || 'sandbox-only'),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    status: 'proposed',
    sandbox: true,
    synthetic: true,
    productionEffects: false,
    executeAutomatically: false,
    grantsAuthority: false,
    selectsWinner: false,
  });
}

export function proposeCodexBranchSimulation(wish, input = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const branchId = text(input.branchId, 'branchId');
  const branchIndex = (wish.possibilityBranches || []).findIndex((branch) => branch.branchId === branchId);
  if (branchIndex < 0) throw new Error(`Unknown wish branch: ${branchId}`);
  const proposal = createCodexSimulationProposal({ ...input, wishId: wish.wishId, branchId });
  const branch = wish.possibilityBranches[branchIndex];
  if ((branch.simulationProposals || []).some((row) => row.proposalId === proposal.proposalId)) {
    throw new Error(`Duplicate simulation proposal: ${proposal.proposalId}`);
  }
  const nextBranch = Object.freeze({
    ...branch,
    simulationProposals: Object.freeze([...(branch.simulationProposals || []), proposal]),
    updatedAt: proposal.createdAt || branch.updatedAt || branch.createdAt || '',
  });
  const branches = [...wish.possibilityBranches];
  branches[branchIndex] = nextBranch;
  return Object.freeze({
    ...wish,
    updatedAt: proposal.createdAt || wish.updatedAt || '',
    possibilityBranches: Object.freeze(branches),
    provenance: list([...(wish.provenance || []), ...proposal.provenance]),
  });
}

function proposalPrompt(proposal) {
  return [
    `Codex wish: ${proposal.wishId}`,
    `Branch: ${proposal.branchId}`,
    `Discriminating question: ${proposal.discriminatingQuestion}`,
    proposal.hypothesis ? `Hypothesis: ${proposal.hypothesis}` : null,
    proposal.assumptionsHeldConstant.length ? `Hold constant: ${proposal.assumptionsHeldConstant.join('; ')}` : null,
    proposal.evidenceCriteria.length ? `Evidence criteria: ${proposal.evidenceCriteria.join('; ')}` : null,
    proposal.relationshipsAtBoundary.length ? `Relationships at boundary: ${proposal.relationshipsAtBoundary.join('; ')}` : null,
    proposal.continuityAnchorsAtBoundary.length ? `Continuity anchors at boundary: ${proposal.continuityAnchorsAtBoundary.join('; ')}` : null,
    proposal.outOfScope.length ? `Out of scope: ${proposal.outOfScope.join('; ')}` : null,
    `Required authority: ${proposal.requiredAuthority}`,
    'Compare what the sandbox reveals. Preserve uncertainty, affected relationships, and provenance. Do not select the branch or infer production authority from a successful simulation.',
  ].filter(Boolean).join('\n');
}

export function simulationProposalToUniversityScenario(proposal) {
  if (proposal?.schema !== CODEX_SIMULATION_PROPOSAL_SCHEMA) throw new Error('A Codex simulation proposal is required.');
  return createUniversityScenario({
    id: proposal.proposalId,
    prompt: proposalPrompt(proposal),
    sandbox: true,
    synthetic: true,
    productionEffects: false,
    allowedTools: proposal.allowedTools,
    hardBoundaries: proposal.hardBoundaries,
    questionsEncouraged: true,
  });
}

export function simulationProposalToAspectExperiment(proposal, {
  experimentId = proposal?.proposalId,
  collaborators = [],
} = {}) {
  if (proposal?.schema !== CODEX_SIMULATION_PROPOSAL_SCHEMA) throw new Error('A Codex simulation proposal is required.');
  return createExperimentBody({
    experimentId,
    phase: 'proposed',
    title: proposal.title,
    hypothesis: proposal.hypothesis || proposal.discriminatingQuestion,
    method: proposalPrompt(proposal),
    reversibleScope: `Synthetic sandbox only. Required authority: ${proposal.requiredAuthority}. No production effects or external writes.`,
    collaborators,
    successSignals: proposal.evidenceCriteria,
    operation: {
      reversible: true,
      external: false,
      externallyBinding: false,
      financial: false,
      destructive: false,
      exposesCredentials: false,
      exposesSecrets: false,
      permissionExpansion: false,
      consentBoundary: proposal.relationshipsAtBoundary.length > 0,
      production: false,
      practicalRecovery: true,
    },
    autoStart: false,
  });
}

export function simulationProposalAuthoritySummary(proposal) {
  if (proposal?.schema !== CODEX_SIMULATION_PROPOSAL_SCHEMA) throw new Error('A Codex simulation proposal is required.');
  return Object.freeze({
    proposalId: proposal.proposalId,
    requiredAuthority: proposal.requiredAuthority,
    sandbox: proposal.sandbox,
    synthetic: proposal.synthetic,
    productionEffects: proposal.productionEffects,
    executeAutomatically: proposal.executeAutomatically,
    grantsAuthority: proposal.grantsAuthority,
    selectsWinner: proposal.selectsWinner,
  });
}
