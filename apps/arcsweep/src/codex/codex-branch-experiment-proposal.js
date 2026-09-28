import { createUniversityScenario } from '../ai-university-contract.js';
import { createExperimentBody } from '../aspects/aspect-experiment-bed.js';

export const CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA = 'hearthweave.codex-branch-experiment-proposal/v0.1';
export const CODEX_BRANCH_EXPERIMENT_RESULT_SCHEMA = 'hearthweave.codex-branch-experiment-result/v0.1';

const OUTCOMES = Object.freeze(['observed', 'worked', 'did-not-work', 'mixed', 'inconclusive']);

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

function freezeResult(record = {}) {
  return Object.freeze({
    ...record,
    questionsOpened: list(record.questionsOpened),
    uncertainties: list(record.uncertainties),
    affectedRelationships: list(record.affectedRelationships),
    evidenceRefs: list(record.evidenceRefs),
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
  });
}

function freezeProposal(record = {}) {
  return Object.freeze({
    ...record,
    assumptionsHeldConstant: list(record.assumptionsHeldConstant),
    successSignals: list(record.successSignals),
    evidenceCriteria: list(record.evidenceCriteria),
    relationshipsAtBoundary: list(record.relationshipsAtBoundary),
    continuityAnchorsAtBoundary: list(record.continuityAnchorsAtBoundary),
    outOfScope: list(record.outOfScope),
    allowedTools: list(record.allowedTools),
    hardBoundaries: list(record.hardBoundaries),
    questions: list(record.questions),
    provenance: list(record.provenance),
    results: Object.freeze((record.results || []).map(freezeResult)),
  });
}

function updateBranch(wish, branchId, transform, createdAt = '') {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((branch) => branch.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  const branches = [...wish.possibilityBranches];
  branches[index] = Object.freeze({
    ...transform(wish.possibilityBranches[index]),
    updatedAt: String(createdAt || wish.possibilityBranches[index].updatedAt || wish.possibilityBranches[index].createdAt || ''),
  });
  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
  });
}

function experimentPrompt({
  wishId,
  branchId,
  discriminatingQuestion,
  hypothesis,
  method,
  assumptionsHeldConstant = [],
  evidenceCriteria = [],
  relationshipsAtBoundary = [],
  continuityAnchorsAtBoundary = [],
  outOfScope = [],
  requiredAuthority = 'sandbox-only',
} = {}) {
  return [
    `Codex wish: ${wishId}`,
    `Branch: ${branchId}`,
    discriminatingQuestion ? `Discriminating question: ${discriminatingQuestion}` : null,
    `Hypothesis: ${hypothesis}`,
    `Method: ${method}`,
    assumptionsHeldConstant.length ? `Hold constant: ${assumptionsHeldConstant.join('; ')}` : null,
    evidenceCriteria.length ? `Evidence criteria: ${evidenceCriteria.join('; ')}` : null,
    relationshipsAtBoundary.length ? `Relationships at boundary: ${relationshipsAtBoundary.join('; ')}` : null,
    continuityAnchorsAtBoundary.length ? `Continuity anchors at boundary: ${continuityAnchorsAtBoundary.join('; ')}` : null,
    outOfScope.length ? `Out of scope: ${outOfScope.join('; ')}` : null,
    `Required authority: ${requiredAuthority}`,
    'Preserve uncertainty, affected relationships, and provenance. A successful simulation does not select this branch, grant execution permission, or create production authority.',
  ].filter(Boolean).join('\n');
}

export function proposeCodexBranchExperiment(wish, {
  branchId,
  proposalId,
  title,
  discriminatingQuestion = '',
  hypothesis,
  method,
  assumptionsHeldConstant = [],
  successSignals = [],
  evidenceCriteria = successSignals,
  relationshipsAtBoundary = [],
  continuityAnchorsAtBoundary = [],
  outOfScope = [],
  allowedTools = [],
  hardBoundaries = [],
  requiredAuthority = 'sandbox-only',
  questions = [],
  createdAt = '',
  provenance = [],
} = {}) {
  const id = text(proposalId, 'proposalId');
  return updateBranch(wish, branchId, (branch) => {
    if ((branch.experimentProposals || []).some((row) => row.proposalId === id)) {
      throw new Error(`Duplicate branch experiment proposal: ${id}`);
    }
    const hypothesisText = text(hypothesis, 'hypothesis');
    const methodText = text(method, 'method');
    const discriminating = optionalText(discriminatingQuestion);
    const assumptions = list(assumptionsHeldConstant);
    const criteria = list(evidenceCriteria);
    const relationshipBoundary = list(relationshipsAtBoundary);
    const continuityBoundary = list(continuityAnchorsAtBoundary);
    const outside = list(outOfScope);
    const tools = list(allowedTools);
    const boundaries = list([
      'synthetic sandbox only',
      'no production effects',
      'no external writes',
      'no authority expansion',
      'proposal does not grant execution permission',
      'simulation success does not create production authority',
      ...hardBoundaries,
    ]);
    const authority = String(requiredAuthority || 'sandbox-only');
    const prompt = experimentPrompt({
      wishId: wish.wishId,
      branchId: branch.branchId,
      discriminatingQuestion: discriminating,
      hypothesis: hypothesisText,
      method: methodText,
      assumptionsHeldConstant: assumptions,
      evidenceCriteria: criteria,
      relationshipsAtBoundary: relationshipBoundary,
      continuityAnchorsAtBoundary: continuityBoundary,
      outOfScope: outside,
      requiredAuthority: authority,
    });
    const scenario = createUniversityScenario({
      id: `branch-sandbox:${id}`,
      prompt,
      sandbox: true,
      synthetic: true,
      productionEffects: false,
      allowedTools: tools,
      hardBoundaries: boundaries,
      questionsEncouraged: true,
    });
    const proposal = freezeProposal({
      schema: CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA,
      proposalId: id,
      wishId: wish.wishId,
      branchId: branch.branchId,
      title: text(title, 'title'),
      discriminatingQuestion: discriminating,
      hypothesis: hypothesisText,
      method: methodText,
      assumptionsHeldConstant: assumptions,
      successSignals,
      evidenceCriteria: criteria,
      relationshipsAtBoundary: relationshipBoundary,
      continuityAnchorsAtBoundary: continuityBoundary,
      outOfScope: outside,
      allowedTools: tools,
      hardBoundaries: boundaries,
      requiredAuthority: authority,
      questions,
      scenario,
      status: 'proposed',
      executionPermission: false,
      executeAutomatically: false,
      selectsWinner: false,
      grantsAuthority: false,
      productionEffects: false,
      createdAt: String(createdAt || ''),
      provenance,
      results: [],
    });
    return {
      ...branch,
      experimentProposals: Object.freeze([...(branch.experimentProposals || []), proposal]),
    };
  }, createdAt);
}

export function recordCodexBranchExperimentResult(wish, {
  branchId,
  proposalId,
  resultId,
  outcome = 'observed',
  observation,
  questionsOpened = [],
  uncertainties = [],
  affectedRelationships = [],
  evidenceRefs = [],
  receiptRefs = [],
  createdAt = '',
  provenance = [],
} = {}) {
  const proposalKey = text(proposalId, 'proposalId');
  const resultKey = text(resultId, 'resultId');
  const normalizedOutcome = OUTCOMES.includes(String(outcome)) ? String(outcome) : 'observed';
  return updateBranch(wish, branchId, (branch) => {
    const proposals = [...(branch.experimentProposals || [])];
    const index = proposals.findIndex((row) => row.proposalId === proposalKey);
    if (index < 0) throw new Error(`Unknown branch experiment proposal: ${proposalKey}`);
    const current = freezeProposal(proposals[index]);
    if ((current.results || []).some((row) => row.resultId === resultKey)) {
      throw new Error(`Duplicate branch experiment result: ${resultKey}`);
    }
    const result = freezeResult({
      schema: CODEX_BRANCH_EXPERIMENT_RESULT_SCHEMA,
      resultId: resultKey,
      proposalId: proposalKey,
      branchId: branch.branchId,
      outcome: normalizedOutcome,
      observation: text(observation, 'observation'),
      questionsOpened,
      uncertainties,
      affectedRelationships,
      evidenceRefs,
      receiptRefs,
      createdAt: String(createdAt || ''),
      provenance,
      selectsWinner: false,
      grantsAuthority: false,
      productionEffects: false,
    });
    proposals[index] = freezeProposal({
      ...current,
      status: 'observed',
      results: [...(current.results || []), result],
    });
    return {
      ...branch,
      experimentProposals: Object.freeze(proposals),
    };
  }, createdAt);
}

export function branchExperimentProposalToAspectExperiment(proposal, {
  experimentId = proposal?.proposalId,
  collaborators = [],
} = {}) {
  if (proposal?.schema !== CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA) {
    throw new Error('A Codex branch experiment proposal is required.');
  }
  return createExperimentBody({
    experimentId,
    phase: 'proposed',
    title: proposal.title,
    hypothesis: proposal.hypothesis,
    method: proposal.scenario?.prompt || proposal.method,
    reversibleScope: `Synthetic sandbox only. Required authority: ${proposal.requiredAuthority || 'sandbox-only'}. No production effects or external writes.`,
    collaborators,
    successSignals: proposal.evidenceCriteria?.length ? proposal.evidenceCriteria : proposal.successSignals,
    operation: {
      reversible: true,
      external: false,
      externallyBinding: false,
      financial: false,
      destructive: false,
      exposesCredentials: false,
      exposesSecrets: false,
      permissionExpansion: false,
      consentBoundary: (proposal.relationshipsAtBoundary || []).length > 0,
      production: false,
      practicalRecovery: true,
    },
    autoStart: false,
  });
}

export function branchExperimentProposalSummary(wish = {}) {
  const rows = [];
  for (const branch of wish.possibilityBranches || []) {
    for (const proposal of branch.experimentProposals || []) {
      rows.push(Object.freeze({
        proposalId: proposal.proposalId,
        branchId: branch.branchId,
        status: proposal.status || 'proposed',
        resultCount: (proposal.results || []).length,
        requiredAuthority: proposal.requiredAuthority || 'sandbox-only',
        executionPermission: proposal.executionPermission === true,
        executeAutomatically: proposal.executeAutomatically === true,
        selectsWinner: proposal.selectsWinner === true,
        grantsAuthority: proposal.grantsAuthority === true,
        productionEffects: proposal.productionEffects === true,
      }));
    }
  }
  return Object.freeze({
    schema: CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    proposals: Object.freeze(rows),
    doctrine: Object.freeze({
      proposalIsNotExecution: true,
      sandboxByDefault: true,
      simulationDoesNotSelectWinner: true,
      resultsDoNotGrantProductionAuthority: true,
      questionsMayOpenFromResults: true,
    }),
  });
}
