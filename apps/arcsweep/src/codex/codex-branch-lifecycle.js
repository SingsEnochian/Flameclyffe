export const CODEX_BRANCH_LIFECYCLE_SCHEMA = 'hearthweave.codex-branch-lifecycle/v0.1';

export const CODEX_BRANCH_STATUSES = Object.freeze([
  'open',
  'exploring',
  'simulated',
  'designed',
  'prototyped',
  'realised',
  'retired',
]);

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

function status(value) {
  const result = String(value || '').trim();
  if (!CODEX_BRANCH_STATUSES.includes(result)) throw new Error(`Unknown branch status: ${result || 'missing'}`);
  return result;
}

function freezeTransition(record = {}) {
  return Object.freeze({
    ...record,
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
  });
}

function freezeBranch(branch = {}) {
  return Object.freeze({
    ...branch,
    parentBranchIds: list(branch.parentBranchIds),
    provenance: list(branch.provenance),
    receipts: list(branch.receipts),
    transitions: Object.freeze((branch.transitions || []).map(freezeTransition)),
  });
}

function freezeWish(wish = {}, branches = wish.possibilityBranches || [], receiptRefs = []) {
  return Object.freeze({
    ...wish,
    possibilityBranches: Object.freeze(branches.map(freezeBranch)),
    receipts: list([...(wish.receipts || []), ...receiptRefs]),
  });
}

function branchIndex(wish, branchId) {
  const id = text(branchId, 'branchId');
  const index = (wish?.possibilityBranches || []).findIndex((branch) => branch?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return index;
}

export function transitionCodexWishBranch(wish, {
  branchId,
  transitionId,
  status: nextStatus,
  note,
  createdAt = '',
  receiptRefs = [],
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const index = branchIndex(wish, branchId);
  const current = freezeBranch(wish.possibilityBranches[index]);
  const transitionKey = text(transitionId, 'transitionId');
  if ((current.transitions || []).some((row) => row.transitionId === transitionKey)) {
    throw new Error(`Duplicate branch transition: ${transitionKey}`);
  }
  const toStatus = status(nextStatus);
  const record = freezeTransition({
    schema: CODEX_BRANCH_LIFECYCLE_SCHEMA,
    transitionId: transitionKey,
    branchId: current.branchId,
    fromStatus: String(current.status || 'open'),
    toStatus,
    note: text(note, 'note'),
    createdAt: String(createdAt || ''),
    receiptRefs,
    provenance,
  });
  const branches = [...wish.possibilityBranches];
  branches[index] = freezeBranch({
    ...current,
    status: toStatus,
    updatedAt: String(createdAt || current.updatedAt || current.createdAt || ''),
    transitions: [...(current.transitions || []), record],
    receipts: [...(current.receipts || []), ...receiptRefs],
    provenance: [...(current.provenance || []), ...provenance],
  });
  return freezeWish({ ...wish, updatedAt: String(createdAt || wish.updatedAt || '') }, branches, receiptRefs);
}

export function mergeCodexWishBranches(wish, {
  branchId,
  sourceBranchIds = [],
  label,
  possibility,
  createdAt = '',
  provenance = [],
} = {}) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  if ((wish.possibilityBranches || []).some((branch) => branch.branchId === id)) {
    throw new Error(`Duplicate wish branch: ${id}`);
  }
  const parents = list(sourceBranchIds);
  if (parents.length < 2) throw new Error('A merged branch requires at least two distinct source branches.');
  const known = new Set((wish.possibilityBranches || []).map((branch) => branch.branchId));
  const missing = parents.filter((parentId) => !known.has(parentId));
  if (missing.length) throw new Error(`Unknown merge source branch: ${missing.join(', ')}`);

  const branch = freezeBranch({
    branchId: id,
    parentWishId: wish.wishId,
    lineageRootId: wish.lineageRootId || wish.wishId,
    parentBranchIds: parents,
    relation: 'merge',
    label: text(label || possibility, 'label'),
    possibility: text(possibility, 'possibility'),
    status: 'open',
    createdAt: String(createdAt || ''),
    updatedAt: String(createdAt || ''),
    provenance,
    receipts: [],
    transitions: [],
  });

  return freezeWish({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
  }, [...(wish.possibilityBranches || []), branch]);
}

export function branchLifecycleSummary(wish = {}) {
  const branches = (wish.possibilityBranches || []).map(freezeBranch);
  const counts = Object.fromEntries(CODEX_BRANCH_STATUSES.map((value) => [value, 0]));
  for (const branch of branches) counts[CODEX_BRANCH_STATUSES.includes(branch.status) ? branch.status : 'open'] += 1;
  return Object.freeze({
    schema: CODEX_BRANCH_LIFECYCLE_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    branchCount: branches.length,
    counts: Object.freeze(counts),
    transitionCount: branches.reduce((sum, branch) => sum + (branch.transitions || []).length, 0),
    mergeCount: branches.filter((branch) => branch.relation === 'merge').length,
    doctrine: Object.freeze({
      transitionsPreserveHistory: true,
      realisationDoesNotEraseAlternatives: true,
      mergeDoesNotEraseParents: true,
      statusDoesNotGrantAuthority: true,
    }),
  });
}
