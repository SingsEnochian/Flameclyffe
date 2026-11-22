import { CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA } from './codex-branch-experiment-execution.js';

export const CODEX_BRANCH_RETURN_STORE_SCHEMA = 'hearthweave.codex-branch-return-store/v0.1';
export const CODEX_BRANCH_RETURN_STORE_KEY = 'arcsweep:universal-codex:branch-experiment-returns:v0.1';
export const CODEX_BRANCH_RETURN_STORE_EVENT = 'arcsweep:codex-branch-experiment-returns-changed';

function empty() {
  return Object.freeze({ schema: CODEX_BRANCH_RETURN_STORE_SCHEMA, returns: Object.freeze([]) });
}

function freezeReturn(row = {}) {
  return Object.freeze({ ...row });
}

function read(storage) {
  try {
    const raw = storage?.getItem?.(CODEX_BRANCH_RETURN_STORE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const returns = (Array.isArray(parsed?.returns) ? parsed.returns : [])
      .filter((row) => row?.schema === CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA && row.returnId)
      .map(freezeReturn);
    return Object.freeze({ schema: CODEX_BRANCH_RETURN_STORE_SCHEMA, returns: Object.freeze(returns) });
  } catch {
    return empty();
  }
}

function write(storage, state) {
  try {
    storage?.setItem?.(CODEX_BRANCH_RETURN_STORE_KEY, JSON.stringify(state));
  } catch {}
}

function emit(target, state, reason) {
  try {
    if (!target?.dispatchEvent || typeof CustomEvent === 'undefined') return;
    target.dispatchEvent(new CustomEvent(CODEX_BRANCH_RETURN_STORE_EVENT, {
      detail: Object.freeze({ schema: CODEX_BRANCH_RETURN_STORE_SCHEMA, reason, state }),
    }));
  } catch {}
}

export function createCodexBranchReturnStore({ storage = null, target = null } = {}) {
  let state = read(storage);

  function commit(returns, reason) {
    state = Object.freeze({
      schema: CODEX_BRANCH_RETURN_STORE_SCHEMA,
      returns: Object.freeze(returns.map(freezeReturn)),
    });
    write(storage, state);
    emit(target, state, reason);
    return state;
  }

  function snapshot() {
    return state;
  }

  function append(returnObject) {
    if (returnObject?.schema !== CODEX_BRANCH_EXPERIMENT_RETURN_SCHEMA || !returnObject.returnId) {
      throw new Error('A valid branch experiment return is required.');
    }
    const current = state.returns.find((row) => row.returnId === returnObject.returnId);
    if (current) return current;
    const stored = freezeReturn({ ...returnObject, ingestedIntoCodex: false, ingestedAt: null });
    commit([...state.returns, stored], `return-added:${stored.returnId}`);
    return stored;
  }

  function markIngested(returnId, { ingestedAt = new Date().toISOString(), codexResultId = null } = {}) {
    const id = String(returnId || '');
    const index = state.returns.findIndex((row) => row.returnId === id);
    if (index < 0) throw new Error(`Unknown branch experiment return: ${id}`);
    const next = [...state.returns];
    next[index] = freezeReturn({
      ...next[index],
      ingestedIntoCodex: true,
      ingestedAt: String(ingestedAt || ''),
      codexResultId: codexResultId ? String(codexResultId) : null,
    });
    commit(next, `return-ingested:${id}`);
    return next[index];
  }

  function pending() {
    return Object.freeze(state.returns.filter((row) => row.ingestedIntoCodex !== true));
  }

  function reload() {
    state = read(storage);
    return state;
  }

  return Object.freeze({
    schema: CODEX_BRANCH_RETURN_STORE_SCHEMA,
    snapshot,
    append,
    markIngested,
    pending,
    reload,
  });
}

let defaultStore = null;

export function getCodexBranchReturnStore({
  storage = globalThis.localStorage,
  target = globalThis.document || globalThis,
} = {}) {
  if (!defaultStore) defaultStore = createCodexBranchReturnStore({ storage, target });
  return defaultStore;
}
