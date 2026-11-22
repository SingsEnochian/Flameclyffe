export const CODEX_BRANCH_COMPARISON_SCHEMA = 'hearthweave.codex-branch-comparison/v0.1';

function words(value) {
  return [...new Set(String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9_-]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 2))]
    .sort();
}

function intersection(a = [], b = []) {
  const right = new Set(b);
  return a.filter((value) => right.has(value));
}

function difference(a = [], b = []) {
  const right = new Set(b);
  return a.filter((value) => !right.has(value));
}

function freezeObservation(row = {}) {
  return Object.freeze({
    ...row,
    requirements: Object.freeze([...(row.requirements || [])]),
    constraints: Object.freeze([...(row.constraints || [])]),
    consequences: Object.freeze([...(row.consequences || [])]),
    uncertainties: Object.freeze([...(row.uncertainties || [])]),
    affectedRelationships: Object.freeze([...(row.affectedRelationships || [])]),
    newQuestionIds: Object.freeze([...(row.newQuestionIds || [])]),
    receiptRefs: Object.freeze([...(row.receiptRefs || [])]),
    provenance: Object.freeze([...(row.provenance || [])]),
  });
}

function branchView(branch = {}) {
  const terms = words(`${branch.label || ''} ${branch.possibility || ''}`);
  return Object.freeze({
    branchId: String(branch.branchId || ''),
    label: String(branch.label || branch.branchId || 'Unnamed possibility'),
    possibility: String(branch.possibility || ''),
    status: String(branch.status || 'open'),
    provenance: Object.freeze([...(branch.provenance || [])].map(String).filter(Boolean)),
    createdAt: String(branch.createdAt || ''),
    terms: Object.freeze(terms),
    observations: Object.freeze((branch.observations || []).map(freezeObservation)),
  });
}

export function compareCodexWishBranches(wish = {}) {
  const branches = (wish.possibilityBranches || []).map(branchView);
  const comparisons = [];

  for (let leftIndex = 0; leftIndex < branches.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < branches.length; rightIndex += 1) {
      const left = branches[leftIndex];
      const right = branches[rightIndex];
      comparisons.push(Object.freeze({
        pairId: `${left.branchId}::${right.branchId}`,
        leftBranchId: left.branchId,
        rightBranchId: right.branchId,
        sharedTerms: Object.freeze(intersection(left.terms, right.terms)),
        leftDistinctTerms: Object.freeze(difference(left.terms, right.terms)),
        rightDistinctTerms: Object.freeze(difference(right.terms, left.terms)),
        sameStatus: left.status === right.status,
        doctrine: Object.freeze({
          ranksBranches: false,
          selectsWinner: false,
          preservesIncompatibility: true,
        }),
      }));
    }
  }

  return Object.freeze({
    schema: CODEX_BRANCH_COMPARISON_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    desire: String(wish.desire || ''),
    branches: Object.freeze(branches),
    comparisons: Object.freeze(comparisons),
    sharedContext: Object.freeze({
      continuityAnchors: Object.freeze([...(wish.continuityAnchors || [])].map(String)),
      relationshipsTouched: Object.freeze([...(wish.relationshipsTouched || [])].map(String)),
      memoryRefs: Object.freeze([...(wish.memoryRefs || [])].map(String)),
      openQuestionIds: Object.freeze([...(wish.openQuestionIds || [])].map(String)),
    }),
    doctrine: Object.freeze({
      descriptiveComparisonOnly: true,
      noWinner: true,
      noBranchRanking: true,
      coexistenceIsValid: true,
      observationsDoNotGrantAuthority: true,
    }),
  });
}
