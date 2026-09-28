export const CODEX_BRANCH_OBSERVATION_SCHEMA = 'hearthweave.codex-branch-observation/v0.1';

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

function freezeObservation(input = {}) {
  return Object.freeze({
    schema: CODEX_BRANCH_OBSERVATION_SCHEMA,
    observationId: text(input.observationId, 'observationId'),
    kind: String(input.kind || 'analysis'),
    source: String(input.source || 'manual'),
    summary: text(input.summary, 'summary'),
    requirements: list(input.requirements),
    constraints: list(input.constraints),
    consequences: list(input.consequences),
    uncertainties: list(input.uncertainties),
    affectedRelationships: list(input.affectedRelationships),
    newQuestionIds: list(input.newQuestionIds),
    evidenceRefs: list(input.evidenceRefs),
    receiptRefs: list(input.receiptRefs),
    provenance: list(input.provenance),
    createdAt: String(input.createdAt || ''),
    grantsAuthority: false,
    selectsWinner: false,
  });
}

export function recordCodexBranchObservation(wish, {
  branchId,
  observationId,
  kind = 'analysis',
  source = 'manual',
  summary,
  requirements = [],
  constraints = [],
  consequences = [],
  uncertainties = [],
  affectedRelationships = [],
  newQuestionIds = [],
  evidenceRefs = [],
  receiptRefs = [],
  provenance = [],
  createdAt = '',
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const branchIndex = (wish.possibilityBranches || []).findIndex((branch) => branch.branchId === id);
  if (branchIndex < 0) throw new Error(`Unknown wish branch: ${id}`);

  const observation = freezeObservation({
    observationId,
    kind,
    source,
    summary,
    requirements,
    constraints,
    consequences,
    uncertainties,
    affectedRelationships,
    newQuestionIds,
    evidenceRefs,
    receiptRefs,
    provenance,
    createdAt,
  });

  const branch = wish.possibilityBranches[branchIndex];
  if ((branch.observations || []).some((row) => row.observationId === observation.observationId)) {
    throw new Error(`Duplicate branch observation: ${observation.observationId}`);
  }
  const nextBranch = Object.freeze({
    ...branch,
    observations: Object.freeze([...(branch.observations || []), observation]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  const branches = [...wish.possibilityBranches];
  branches[branchIndex] = nextBranch;

  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
    provenance: list([...(wish.provenance || []), ...provenance]),
    receipts: list([...(wish.receipts || []), ...receiptRefs]),
  });
}

export function summariseCodexBranchObservations(wish = {}) {
  return Object.freeze((wish.possibilityBranches || []).map((branch) => {
    const observations = branch.observations || [];
    return Object.freeze({
      branchId: String(branch.branchId || ''),
      observationCount: observations.length,
      requirementCount: observations.reduce((sum, row) => sum + (row.requirements || []).length, 0),
      constraintCount: observations.reduce((sum, row) => sum + (row.constraints || []).length, 0),
      consequenceCount: observations.reduce((sum, row) => sum + (row.consequences || []).length, 0),
      uncertaintyCount: observations.reduce((sum, row) => sum + (row.uncertainties || []).length, 0),
      affectedRelationshipCount: new Set(observations.flatMap((row) => row.affectedRelationships || [])).size,
      evidenceRefCount: new Set(observations.flatMap((row) => row.evidenceRefs || [])).size,
      receiptCount: new Set(observations.flatMap((row) => row.receiptRefs || [])).size,
      selectsWinner: false,
    });
  }));
}
