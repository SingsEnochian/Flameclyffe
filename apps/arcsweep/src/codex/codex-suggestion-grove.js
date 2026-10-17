export const CODEX_SUGGESTION_SCHEMA = 'hearthweave.codex-suggestion/v0.1';
export const CODEX_SUGGESTION_DECISION_SCHEMA = 'hearthweave.codex-suggestion-decision/v0.1';

export const CODEX_SUGGESTION_KINDS = Object.freeze([
  'open-question',
  'branch-state',
  'relationship-anchor',
  'continuity-anchor',
  'memory-anchor',
  'next-experiment',
  'governance-change',
]);

export const CODEX_SUGGESTION_DECISIONS = Object.freeze(['accept', 'decline', 'keep-open']);

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

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepFreeze(item)])));
  }
  return value;
}

function freezeDecision(record = {}) {
  return Object.freeze({
    ...record,
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
  });
}

function freezeSuggestion(record = {}) {
  return Object.freeze({
    ...record,
    payload: deepFreeze(record.payload || {}),
    sourceRefs: list(record.sourceRefs),
    evidenceRefs: list(record.evidenceRefs),
    receiptRefs: list(record.receiptRefs),
    provenance: list(record.provenance),
    decisionHistory: Object.freeze((record.decisionHistory || []).map(freezeDecision)),
  });
}

function branchIndex(wish, branchId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const id = text(branchId, 'branchId');
  const index = (wish.possibilityBranches || []).findIndex((branch) => branch?.branchId === id);
  if (index < 0) throw new Error(`Unknown wish branch: ${id}`);
  return index;
}

function replaceBranch(wish, index, branch, createdAt = '') {
  const branches = [...(wish.possibilityBranches || [])];
  branches[index] = Object.freeze({ ...branch });
  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
  });
}

function kind(value) {
  const result = text(value, 'kind');
  if (!CODEX_SUGGESTION_KINDS.includes(result)) throw new Error(`Unknown Codex suggestion kind: ${result}`);
  return result;
}

export function addCodexBranchSuggestion(wish, {
  branchId,
  suggestionId,
  kind: suggestionKind,
  summary,
  rationale = '',
  payload = {},
  source = 'manual',
  sourceRefs = [],
  evidenceRefs = [],
  receiptRefs = [],
  createdAt = '',
  provenance = [],
} = {}) {
  const index = branchIndex(wish, branchId);
  const branch = wish.possibilityBranches[index];
  const id = text(suggestionId, 'suggestionId');
  if ((branch.suggestions || []).some((row) => row.suggestionId === id)) {
    throw new Error(`Duplicate Codex suggestion: ${id}`);
  }
  const suggestion = freezeSuggestion({
    schema: CODEX_SUGGESTION_SCHEMA,
    suggestionId: id,
    wishId: wish.wishId,
    branchId: branch.branchId,
    kind: kind(suggestionKind),
    summary: text(summary, 'summary'),
    rationale: optionalText(rationale),
    payload,
    source: String(source || 'manual'),
    sourceRefs,
    evidenceRefs,
    receiptRefs,
    status: 'open',
    createdAt: String(createdAt || ''),
    updatedAt: String(createdAt || ''),
    provenance,
    decisionHistory: [],
    suggestionOnly: true,
    grantsAuthority: false,
    productionEffects: false,
    automaticApplication: false,
    applied: false,
  });
  const nextBranch = Object.freeze({
    ...branch,
    suggestions: Object.freeze([...(branch.suggestions || []), suggestion]),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    wish: replaceBranch(wish, index, nextBranch, createdAt),
    suggestion,
  });
}

export function decideCodexBranchSuggestion(wish, {
  branchId,
  suggestionId,
  decisionId,
  decision,
  reason = '',
  decidedBy,
  createdAt = '',
  receiptRefs = [],
  provenance = [],
} = {}) {
  const index = branchIndex(wish, branchId);
  const branch = wish.possibilityBranches[index];
  const key = text(suggestionId, 'suggestionId');
  const suggestionIndex = (branch.suggestions || []).findIndex((row) => row.suggestionId === key);
  if (suggestionIndex < 0) throw new Error(`Unknown Codex suggestion: ${key}`);
  const action = text(decision, 'decision');
  if (!CODEX_SUGGESTION_DECISIONS.includes(action)) throw new Error(`Unknown Codex suggestion decision: ${action}`);
  const current = freezeSuggestion(branch.suggestions[suggestionIndex]);
  const decisionKey = text(decisionId, 'decisionId');
  if ((current.decisionHistory || []).some((row) => row.decisionId === decisionKey)) {
    throw new Error(`Duplicate Codex suggestion decision: ${decisionKey}`);
  }
  const record = freezeDecision({
    schema: CODEX_SUGGESTION_DECISION_SCHEMA,
    decisionId: decisionKey,
    suggestionId: key,
    decision: action,
    reason: optionalText(reason),
    decidedBy: text(decidedBy, 'decidedBy'),
    createdAt: String(createdAt || ''),
    receiptRefs,
    provenance,
    grantsAuthority: false,
    productionEffects: false,
    appliesSuggestion: false,
  });
  const nextStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'open';
  const next = freezeSuggestion({
    ...current,
    status: nextStatus,
    updatedAt: String(createdAt || current.updatedAt || current.createdAt || ''),
    decisionHistory: [...(current.decisionHistory || []), record],
  });
  const suggestions = [...(branch.suggestions || [])];
  suggestions[suggestionIndex] = next;
  const nextBranch = Object.freeze({
    ...branch,
    suggestions: Object.freeze(suggestions),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    wish: replaceBranch(wish, index, nextBranch, createdAt),
    suggestion: next,
    decision: record,
    applied: false,
  });
}

export function suggestionsFromExperimentReturn(returnObject = {}) {
  if (!returnObject?.returnId || !returnObject?.wishId || !returnObject?.branchId) return Object.freeze([]);
  const rows = [];
  const base = {
    branchId: returnObject.branchId,
    source: 'ai-university-sandbox-return',
    sourceRefs: [`branch-experiment-return:${returnObject.returnId}`],
    evidenceRefs: returnObject.evidenceRefs || [],
    receiptRefs: returnObject.receiptRefs || [],
    createdAt: returnObject.createdAt || '',
    provenance: returnObject.provenance || [],
  };

  if (returnObject.suggestedBranchStatus) {
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:branch-state:${returnObject.suggestedBranchStatus}`,
      kind: 'branch-state',
      summary: `Consider recording branch state as ${returnObject.suggestedBranchStatus}.`,
      rationale: returnObject.observation || 'The sandbox returned a structured branch-state suggestion.',
      payload: Object.freeze({ status: String(returnObject.suggestedBranchStatus) }),
    }));
  }
  for (const question of returnObject.questionsOpened || []) {
    const value = String(question || '').trim();
    if (!value) continue;
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:open-question:${rows.length + 1}`,
      kind: 'open-question',
      summary: `Keep this question open: ${value}`,
      rationale: 'The sandbox return explicitly opened this question.',
      payload: Object.freeze({ question: value }),
    }));
  }
  for (const anchor of returnObject.suggestedRelationshipAnchors || []) {
    const value = String(anchor || '').trim();
    if (!value) continue;
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:relationship-anchor:${rows.length + 1}`,
      kind: 'relationship-anchor',
      summary: `Consider linking relationship context: ${value}`,
      rationale: 'The sandbox return explicitly proposed a relationship anchor.',
      payload: Object.freeze({ relationship: value }),
    }));
  }
  for (const anchor of returnObject.suggestedContinuityAnchors || []) {
    const value = String(anchor || '').trim();
    if (!value) continue;
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:continuity-anchor:${rows.length + 1}`,
      kind: 'continuity-anchor',
      summary: `Consider linking continuity context: ${value}`,
      rationale: 'The sandbox return explicitly proposed a continuity anchor.',
      payload: Object.freeze({ continuity: value }),
    }));
  }
  for (const anchor of returnObject.suggestedMemoryAnchors || []) {
    const value = String(anchor || '').trim();
    if (!value) continue;
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:memory-anchor:${rows.length + 1}`,
      kind: 'memory-anchor',
      summary: `Consider linking memory context: ${value}`,
      rationale: 'The sandbox return explicitly proposed a memory anchor.',
      payload: Object.freeze({ memory: value }),
    }));
  }
  if (returnObject.suggestedNextExperiment?.title && returnObject.suggestedNextExperiment?.hypothesis && returnObject.suggestedNextExperiment?.method) {
    rows.push(Object.freeze({
      ...base,
      suggestionId: `suggestion:${returnObject.returnId}:next-experiment`,
      kind: 'next-experiment',
      summary: `Consider another sandbox experiment: ${returnObject.suggestedNextExperiment.title}`,
      rationale: returnObject.suggestedNextExperiment.rationale || 'The sandbox return explicitly proposed a follow-up experiment.',
      payload: deepFreeze(returnObject.suggestedNextExperiment),
    }));
  }
  return Object.freeze(rows);
}

export function addExperimentReturnSuggestions(wish, returnObject = {}) {
  let current = wish;
  const added = [];
  for (const candidate of suggestionsFromExperimentReturn(returnObject)) {
    const branch = (current.possibilityBranches || []).find((row) => row.branchId === candidate.branchId);
    if ((branch?.suggestions || []).some((row) => row.suggestionId === candidate.suggestionId)) continue;
    const result = addCodexBranchSuggestion(current, candidate);
    current = result.wish;
    added.push(result.suggestion);
  }
  return Object.freeze({ wish: current, suggestions: Object.freeze(added) });
}

export function branchSuggestionSummary(wish = {}) {
  const suggestions = (wish.possibilityBranches || []).flatMap((branch) => (branch.suggestions || []).map(freezeSuggestion));
  return Object.freeze({
    schema: CODEX_SUGGESTION_SCHEMA,
    wishId: wish.wishId ? String(wish.wishId) : null,
    counts: Object.freeze({
      total: suggestions.length,
      open: suggestions.filter((row) => row.status === 'open').length,
      accepted: suggestions.filter((row) => row.status === 'accepted').length,
      declined: suggestions.filter((row) => row.status === 'declined').length,
    }),
    doctrine: Object.freeze({
      suggestionIsNotDecision: true,
      decisionIsNotAuthority: true,
      acceptanceDoesNotApplyAutomatically: true,
      declineDoesNotEraseSourceEvidence: true,
      keepOpenPreservesReviewability: true,
    }),
  });
}
