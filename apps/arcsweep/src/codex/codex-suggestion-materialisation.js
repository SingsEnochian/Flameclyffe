import {
  createCodexOpenQuestion,
  linkWishOpenQuestion,
} from './codex-wish-lineage.js';
import { anchorCodexWish } from './codex-wish-anchors.js';
import { transitionCodexWishBranch } from './codex-branch-lifecycle.js';
import { proposeCodexBranchExperiment } from './codex-branch-experiment-proposal.js';
import { materialiseDevelopmentalGovernanceChangeRequest } from './codex-developmental-governance.js';

export const CODEX_SUGGESTION_MATERIALISATION_SCHEMA = 'hearthweave.codex-suggestion-materialisation/v0.1';

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

function findSuggestion(wish, branchId, suggestionId) {
  if (!wish?.wishId) throw new Error('A source wish is required.');
  const branchKey = text(branchId, 'branchId');
  const suggestionKey = text(suggestionId, 'suggestionId');
  const branchIndex = (wish.possibilityBranches || []).findIndex((row) => row?.branchId === branchKey);
  if (branchIndex < 0) throw new Error(`Unknown wish branch: ${branchKey}`);
  const branch = wish.possibilityBranches[branchIndex];
  const suggestionIndex = (branch.suggestions || []).findIndex((row) => row?.suggestionId === suggestionKey);
  if (suggestionIndex < 0) throw new Error(`Unknown Codex suggestion: ${suggestionKey}`);
  return { branchIndex, branch, suggestionIndex, suggestion: branch.suggestions[suggestionIndex] };
}

function markMaterialised(wish, {
  branchIndex,
  suggestionIndex,
  materialisation,
  createdAt = '',
} = {}) {
  const branches = [...wish.possibilityBranches];
  const branch = branches[branchIndex];
  const suggestions = [...(branch.suggestions || [])];
  const current = suggestions[suggestionIndex];
  suggestions[suggestionIndex] = Object.freeze({
    ...current,
    updatedAt: String(createdAt || current.updatedAt || current.createdAt || ''),
    applied: true,
    appliedAt: String(createdAt || ''),
    materialisationId: materialisation.materialisationId,
    nativeRef: materialisation.nativeRef,
    materialisationHistory: Object.freeze([
      ...(current.materialisationHistory || []),
      materialisation,
    ]),
  });
  branches[branchIndex] = Object.freeze({
    ...branch,
    suggestions: Object.freeze(suggestions),
    updatedAt: String(createdAt || branch.updatedAt || branch.createdAt || ''),
  });
  return Object.freeze({
    ...wish,
    updatedAt: String(createdAt || wish.updatedAt || ''),
    possibilityBranches: Object.freeze(branches),
  });
}

function receipt({
  materialisationId,
  wishId,
  branchId,
  suggestion,
  materialisedBy,
  nativeRef,
  reason,
  createdAt,
  provenance,
} = {}) {
  return Object.freeze({
    schema: CODEX_SUGGESTION_MATERIALISATION_SCHEMA,
    materialisationId,
    wishId,
    branchId,
    suggestionId: suggestion.suggestionId,
    suggestionKind: suggestion.kind,
    materialisedBy,
    nativeRef,
    reason: optionalText(reason),
    sourceRefs: list(suggestion.sourceRefs),
    evidenceRefs: list(suggestion.evidenceRefs),
    receiptRefs: list(suggestion.receiptRefs),
    createdAt: String(createdAt || ''),
    provenance: list(provenance),
    consumesAcceptedSuggestion: true,
    grantsAuthority: false,
    productionEffects: false,
    externalWrites: false,
    automaticExecution: false,
    automaticCanonPromotion: false,
  });
}

export function materialiseCodexBranchSuggestion({
  wish,
  openQuestions = [],
  branchId,
  suggestionId,
  materialisationId,
  materialisedBy,
  reason = '',
  createdAt = '',
  provenance = [],
} = {}) {
  const found = findSuggestion(wish, branchId, suggestionId);
  const suggestion = found.suggestion;
  if (suggestion.status !== 'accepted') throw new Error('Only an accepted suggestion can be materialised.');
  if (suggestion.applied === true) throw new Error('This accepted suggestion has already been materialised.');

  const id = text(materialisationId, 'materialisationId');
  const actor = text(materialisedBy, 'materialisedBy');
  const timestamp = String(createdAt || '');
  const sourceProvenance = list([
    ...(suggestion.provenance || []),
    ...provenance,
    `suggestion:${suggestion.suggestionId}`,
    `suggestion-materialisation:${id}`,
  ]);
  const payload = suggestion.payload || {};
  let nextWish = wish;
  let nextQuestions = [...(Array.isArray(openQuestions) ? openQuestions : [])];
  let nativeRef = null;
  let nativeObject = null;

  if (suggestion.kind === 'open-question') {
    const questionId = String(payload.questionId || `question:${id}`);
    if (nextQuestions.some((row) => row?.questionId === questionId)) throw new Error(`Question already exists: ${questionId}`);
    nativeObject = createCodexOpenQuestion({
      questionId,
      question: text(payload.question, 'payload.question'),
      originWishId: wish.wishId,
      originRef: suggestion.suggestionId,
      whyItMatters: suggestion.rationale || suggestion.summary,
      worldOrScope: wish.worldOrScope || 'unscoped',
      createdAt: timestamp,
      evidenceRefs: suggestion.evidenceRefs || [],
      provenance: sourceProvenance,
    });
    nextQuestions.push(nativeObject);
    nextWish = linkWishOpenQuestion(nextWish, questionId);
    nativeRef = `open-question:${questionId}`;
  } else if (suggestion.kind === 'branch-state') {
    const transitionId = String(payload.transitionId || `transition:${id}`);
    nextWish = transitionCodexWishBranch(nextWish, {
      branchId,
      transitionId,
      status: text(payload.status, 'payload.status'),
      note: reason || suggestion.rationale || suggestion.summary,
      createdAt: timestamp,
      receiptRefs: list([...(suggestion.receiptRefs || []), `suggestion-materialisation:${id}`]),
      provenance: sourceProvenance,
    });
    nativeObject = nextWish.possibilityBranches.find((row) => row.branchId === branchId)
      ?.transitions?.find((row) => row.transitionId === transitionId) || null;
    nativeRef = `branch-transition:${transitionId}`;
  } else if (suggestion.kind === 'relationship-anchor') {
    const value = text(payload.relationship, 'payload.relationship');
    nextWish = anchorCodexWish(nextWish, {
      relationshipsTouched: [value],
      createdAt: timestamp,
      provenance: sourceProvenance,
    });
    nativeObject = nextWish.anchorLinks?.[nextWish.anchorLinks.length - 1] || null;
    nativeRef = `wish-anchor:${nativeObject?.anchorEventId || id}`;
  } else if (suggestion.kind === 'continuity-anchor') {
    const value = text(payload.continuity, 'payload.continuity');
    nextWish = anchorCodexWish(nextWish, {
      continuityAnchors: [value],
      createdAt: timestamp,
      provenance: sourceProvenance,
    });
    nativeObject = nextWish.anchorLinks?.[nextWish.anchorLinks.length - 1] || null;
    nativeRef = `wish-anchor:${nativeObject?.anchorEventId || id}`;
  } else if (suggestion.kind === 'memory-anchor') {
    const value = text(payload.memory, 'payload.memory');
    nextWish = anchorCodexWish(nextWish, {
      memoryRefs: [value],
      createdAt: timestamp,
      provenance: sourceProvenance,
    });
    nativeObject = nextWish.anchorLinks?.[nextWish.anchorLinks.length - 1] || null;
    nativeRef = `wish-anchor:${nativeObject?.anchorEventId || id}`;
  } else if (suggestion.kind === 'next-experiment') {
    const proposalId = String(payload.proposalId || `proposal:${id}`);
    nextWish = proposeCodexBranchExperiment(nextWish, {
      branchId,
      proposalId,
      title: text(payload.title, 'payload.title'),
      discriminatingQuestion: payload.discriminatingQuestion || '',
      hypothesis: text(payload.hypothesis, 'payload.hypothesis'),
      method: text(payload.method, 'payload.method'),
      assumptionsHeldConstant: payload.assumptionsHeldConstant || [],
      successSignals: payload.successSignals || [],
      evidenceCriteria: payload.evidenceCriteria || payload.successSignals || [],
      relationshipsAtBoundary: payload.relationshipsAtBoundary || [],
      continuityAnchorsAtBoundary: payload.continuityAnchorsAtBoundary || [],
      outOfScope: payload.outOfScope || [],
      allowedTools: payload.allowedTools || [],
      hardBoundaries: payload.hardBoundaries || [],
      requiredAuthority: payload.requiredAuthority || 'sandbox-only',
      questions: payload.questions || [],
      createdAt: timestamp,
      provenance: sourceProvenance,
    });
    nativeObject = nextWish.possibilityBranches.find((row) => row.branchId === branchId)
      ?.experimentProposals?.find((row) => row.proposalId === proposalId) || null;
    nativeRef = `branch-experiment-proposal:${proposalId}`;
  } else if (suggestion.kind === 'governance-change') {
    const requestId = String(payload.requestId || `governance-request:${id}`);
    const governance = materialiseDevelopmentalGovernanceChangeRequest(nextWish, {
      branchId,
      proposalId: text(payload.proposalId, 'payload.proposalId'),
      suggestionId: suggestion.suggestionId,
      requestId,
      materialisedBy: actor,
      reason: reason || suggestion.rationale || suggestion.summary,
      createdAt: timestamp,
      provenance: sourceProvenance,
    });
    nextWish = governance.wish;
    nativeObject = governance.request;
    nativeRef = `governance-change-request:${requestId}`;
  } else {
    throw new Error(`Unsupported suggestion kind for materialisation: ${suggestion.kind}`);
  }

  const materialisation = receipt({
    materialisationId: id,
    wishId: wish.wishId,
    branchId,
    suggestion,
    materialisedBy: actor,
    nativeRef,
    reason,
    createdAt: timestamp,
    provenance: sourceProvenance,
  });

  const after = findSuggestion(nextWish, branchId, suggestionId);
  nextWish = markMaterialised(nextWish, {
    branchIndex: after.branchIndex,
    suggestionIndex: after.suggestionIndex,
    materialisation,
    createdAt: timestamp,
  });

  return Object.freeze({
    schema: CODEX_SUGGESTION_MATERIALISATION_SCHEMA,
    wish: nextWish,
    openQuestions: Object.freeze(nextQuestions),
    suggestion: findSuggestion(nextWish, branchId, suggestionId).suggestion,
    materialisation,
    nativeObject,
    nativeRef,
    applied: true,
    grantsAuthority: false,
    productionEffects: false,
    automaticExecution: false,
  });
}
