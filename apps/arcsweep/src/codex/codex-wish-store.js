import {
  branchCodexWish,
  createCodexOpenQuestion,
  createCodexWish,
  createCodexWishLineage,
  linkWishOpenQuestion,
  recordWishTransformation,
  reopenCodexOpenQuestion,
  resolveCodexOpenQuestion,
  revisitCodexOpenQuestion,
  reviseCodexWish,
} from './codex-wish-lineage.js';
import { anchorCodexWish } from './codex-wish-anchors.js';
import { recordCodexBranchObservation } from './codex-branch-observations.js';
import {
  mergeCodexWishBranches,
  transitionCodexWishBranch,
} from './codex-branch-lifecycle.js';

export const CODEX_WISH_STORE_SCHEMA = 'hearthweave.codex-wish-store/v0.1';
export const CODEX_WISH_STORE_KEY = 'arcsweep:universal-codex:wishes:v0.1';
export const CODEX_WISH_STORE_EVENT = 'arcsweep:codex-wish-lineage-changed';

function emptyState() {
  return { schema: CODEX_WISH_STORE_SCHEMA, wishes: [], openQuestions: [] };
}

function readStored(storage) {
  try {
    const raw = storage?.getItem?.(CODEX_WISH_STORE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    const wishes = Array.isArray(parsed?.wishes) ? parsed.wishes : [];
    const openQuestions = Array.isArray(parsed?.openQuestions) ? parsed.openQuestions : [];
    createCodexWishLineage({ wishes, openQuestions });
    return { schema: CODEX_WISH_STORE_SCHEMA, wishes, openQuestions };
  } catch {
    return emptyState();
  }
}

function persist(storage, state) {
  try {
    storage?.setItem?.(CODEX_WISH_STORE_KEY, JSON.stringify({
      schema: CODEX_WISH_STORE_SCHEMA,
      wishes: state.wishes,
      openQuestions: state.openQuestions,
    }));
  } catch {}
}

function emit(target, detail) {
  try {
    if (!target?.dispatchEvent || typeof CustomEvent === 'undefined') return;
    target.dispatchEvent(new CustomEvent(CODEX_WISH_STORE_EVENT, { detail }));
  } catch {}
}

function findIndex(rows, key, value) {
  return rows.findIndex((row) => row?.[key] === value);
}

export function createCodexWishStore({ storage = null, target = null } = {}) {
  let state = readStored(storage);

  function snapshot() {
    return createCodexWishLineage({ wishes: state.wishes, openQuestions: state.openQuestions });
  }

  function commit(nextState, reason) {
    const next = {
      schema: CODEX_WISH_STORE_SCHEMA,
      wishes: [...(nextState.wishes || [])],
      openQuestions: [...(nextState.openQuestions || [])],
    };
    const lineage = createCodexWishLineage(next);
    state = next;
    persist(storage, state);
    emit(target, Object.freeze({ schema: CODEX_WISH_STORE_SCHEMA, reason, lineage }));
    return lineage;
  }

  function createWish(input) {
    const wish = createCodexWish(input);
    if (findIndex(state.wishes, 'wishId', wish.wishId) >= 0) throw new Error(`Wish already exists: ${wish.wishId}`);
    commit({ ...state, wishes: [...state.wishes, wish] }, `wish-created:${wish.wishId}`);
    return wish;
  }

  function updateWish(wishId, transform, reason) {
    const index = findIndex(state.wishes, 'wishId', wishId);
    if (index < 0) throw new Error(`Unknown wish: ${wishId}`);
    const nextWish = transform(state.wishes[index]);
    const wishes = [...state.wishes];
    wishes[index] = nextWish;
    commit({ ...state, wishes }, reason);
    return nextWish;
  }

  function branchWish(wishId, input) {
    return updateWish(wishId, (wish) => branchCodexWish(wish, input), `wish-branched:${wishId}`);
  }

  function transitionBranch(wishId, input) {
    return updateWish(
      wishId,
      (wish) => transitionCodexWishBranch(wish, input),
      `wish-branch-transitioned:${wishId}:${input?.branchId || 'unknown'}`,
    );
  }

  function mergeBranches(wishId, input) {
    return updateWish(
      wishId,
      (wish) => mergeCodexWishBranches(wish, input),
      `wish-branches-merged:${wishId}:${input?.branchId || 'unknown'}`,
    );
  }

  function reviseWish(wishId, input) {
    return updateWish(wishId, (wish) => reviseCodexWish(wish, input), `wish-revised:${wishId}`);
  }

  function transformWish(wishId, input) {
    return updateWish(wishId, (wish) => recordWishTransformation(wish, input), `wish-transformed:${wishId}`);
  }

  function anchorWish(wishId, input) {
    return updateWish(wishId, (wish) => anchorCodexWish(wish, input), `wish-anchored:${wishId}`);
  }

  function observeBranch(wishId, input) {
    return updateWish(
      wishId,
      (wish) => recordCodexBranchObservation(wish, input),
      `wish-branch-observed:${wishId}:${input?.branchId || 'unknown'}`,
    );
  }

  function createQuestion(input, { linkToWish = true } = {}) {
    const question = createCodexOpenQuestion(input);
    if (findIndex(state.openQuestions, 'questionId', question.questionId) >= 0) throw new Error(`Question already exists: ${question.questionId}`);
    let wishes = state.wishes;
    if (linkToWish && question.originWishId) {
      const wishIndex = findIndex(state.wishes, 'wishId', question.originWishId);
      if (wishIndex < 0) throw new Error(`Unknown origin wish: ${question.originWishId}`);
      wishes = [...state.wishes];
      wishes[wishIndex] = linkWishOpenQuestion(wishes[wishIndex], question.questionId);
    }
    commit({ ...state, wishes, openQuestions: [...state.openQuestions, question] }, `question-created:${question.questionId}`);
    return question;
  }

  function updateQuestion(questionId, transform, reason) {
    const index = findIndex(state.openQuestions, 'questionId', questionId);
    if (index < 0) throw new Error(`Unknown question: ${questionId}`);
    const nextQuestion = transform(state.openQuestions[index]);
    const openQuestions = [...state.openQuestions];
    openQuestions[index] = nextQuestion;
    commit({ ...state, openQuestions }, reason);
    return nextQuestion;
  }

  function revisitQuestion(questionId, input) {
    return updateQuestion(questionId, (question) => revisitCodexOpenQuestion(question, input), `question-revisited:${questionId}`);
  }

  function resolveQuestion(questionId, input) {
    return updateQuestion(questionId, (question) => resolveCodexOpenQuestion(question, input), `question-resolved:${questionId}`);
  }

  function reopenQuestion(questionId, input) {
    return updateQuestion(questionId, (question) => reopenCodexOpenQuestion(question, input), `question-reopened:${questionId}`);
  }

  function reload() {
    state = readStored(storage);
    return snapshot();
  }

  return Object.freeze({
    schema: CODEX_WISH_STORE_SCHEMA,
    snapshot,
    createWish,
    branchWish,
    transitionBranch,
    mergeBranches,
    reviseWish,
    transformWish,
    anchorWish,
    observeBranch,
    createQuestion,
    revisitQuestion,
    resolveQuestion,
    reopenQuestion,
    reload,
  });
}

let defaultStore = null;

export function getCodexWishStore({
  storage = globalThis.localStorage,
  target = globalThis.document || globalThis,
} = {}) {
  if (!defaultStore) defaultStore = createCodexWishStore({ storage, target });
  return defaultStore;
}
