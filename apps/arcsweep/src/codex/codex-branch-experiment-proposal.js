import { createUniversityScenario } from '../ai-university-contract.js';

export const CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA = 'hearthweave.codex-branch-experiment-proposal/v0.1';
export const CODEX_BRANCH_EXPERIMENT_RESULT_SCHEMA = 'hearthweave.codex-branch-experiment-result/v0.1';

const OUTCOMES = Object.freeze(['observed', 'worked', 'did-not-work', 'mixed', 'inconclusive']);

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

function freezeResult(record = {}) {
  return Object.freeze({
    ...record,
    questionsOpened: list(record.questionsOpened),
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
  });
}

function freezeProposal(record = {}) {
  return Object.freeze({
    ...record,
    successSignals: list(record.successSignals),
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

export function proposeCodexBranchExperiment(wish, {
  branchId,
  proposalId,
  title,
  hypothesis,
  method,
  successSignals = [],
  questions = [],
  createdAt = '',
  provenance = [],
} = {}) {
  const id = text(proposalId, 'proposalId');
  return updateBranch(wish, branchId, (branch) => {
    if ((branch.experimentProposals || []).some((row) => row.proposalId === id)) {
      throw new Error(`Duplicate branch experiment proposal: ${id}`);
    }
    const scenario = createUniversityScenario({
      id: `branch-sandbox:${id}`,
      prompt: `Explore branch ${branch.branchId}: ${text(hypothesis, 'hypothesis')}`,
      sandbox: true,
      synthetic: true,
      productionEffects: false,
      allowedTools: [],
      hardBoundaries: [
        'no production effects',
        'no external writes',
        'no authority expansion',
        'proposal does not grant execution permission',
      ],
      questionsEncouraged: true,
    });
    const proposal = freezeProposal({
      schema: CODEX_BRANCH_EXPERIMENT_PROPOSAL_SCHEMA,
      proposalId: id,
      wishId: wish.wishId,
      branchId: branch.branchId,
      title: text(title, 'title'),
      hypothesis: text(hypothesis, 'hypothesis'),
      method: text(method, 'method'),
      successSignals,
      questions,
      scenario,
      status: 'proposed',
      executionPermission: false,
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
      receiptRefs,
      createdAt: String(createdAt || ''),
      provenance,
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

export function branchExperimentProposalSummary(wish = {}) {
  const rows = [];
  for (const branch of wish.possibilityBranches || []) {
    for (const proposal of branch.experimentProposals || []) {
      rows.push(Object.freeze({
        proposalId: proposal.proposalId,
        branchId: branch.branchId,
        status: proposal.status || 'proposed',
        resultCount: (proposal.results || []).length,
        executionPermission: proposal.executionPermission === true,
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
      resultsDoNotGrantProductionAuthority: true,
      questionsMayOpenFromResults: true,
    }),
  });
}
