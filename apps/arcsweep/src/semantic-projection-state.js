import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import { VISIBLE_SEMANTIC_PROJECTION_SCHEMA } from './visible-semantic-projection.js';

export const SEMANTIC_PROJECTION_LEDGER_SCHEMA = 'arcsweep.semantic-projection-ledger/v1';
export const SEMANTIC_PROJECTION_UPDATED_EVENT = 'arcsweep:semantic-projection-updated';
export const MAX_SEMANTIC_PROJECTIONS = 512;

function clone(value) { return structuredClone(value); }

export function createEmptySemanticProjectionLedger() {
  return { schema: SEMANTIC_PROJECTION_LEDGER_SCHEMA, version: 1, projections: [] };
}

export function normaliseSemanticProjectionLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const map = new Map();
  for (const projection of Array.isArray(source.projections) ? source.projections : []) {
    if (projection?.schema !== VISIBLE_SEMANTIC_PROJECTION_SCHEMA || !projection?.fingerprint) continue;
    map.set(projection.fingerprint, clone(projection));
  }
  return {
    schema: SEMANTIC_PROJECTION_LEDGER_SCHEMA,
    version: 1,
    projections: [...map.values()].slice(-MAX_SEMANTIC_PROJECTIONS),
  };
}

export function ensureSemanticProjectionLedger(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('SEMANTIC_PROJECTION_STATE: Arcsweep state is required');
  state.semanticProjection = normaliseSemanticProjectionLedger(state.semanticProjection);
  return state.semanticProjection;
}

export function projectionsForFlame(ledgerInput, voiceId) {
  return normaliseSemanticProjectionLedger(ledgerInput).projections.filter((item) => item.voice_id === voiceId);
}

export function appendSemanticProjection(ledgerInput, projection) {
  if (projection?.schema !== VISIBLE_SEMANTIC_PROJECTION_SCHEMA || !projection?.fingerprint) {
    throw new Error('SEMANTIC_PROJECTION_STATE: valid semantic projection required');
  }
  const ledger = normaliseSemanticProjectionLedger(ledgerInput);
  if (!ledger.projections.some((item) => item.fingerprint === projection.fingerprint)) {
    ledger.projections.push(clone(projection));
  }
  if (ledger.projections.length > MAX_SEMANTIC_PROJECTIONS) {
    ledger.projections.splice(0, ledger.projections.length - MAX_SEMANTIC_PROJECTIONS);
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput.projections.find((item) => item.fingerprint === projection.fingerprint);
}

function notify(ledger, meta) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(SEMANTIC_PROJECTION_UPDATED_EVENT, { detail: { ledger: clone(ledger), meta: clone(meta || {}) } }));
  }
}

let persistChain = Promise.resolve();
export function persistSemanticProjectionLedger(ledgerInput, meta = {}) {
  const ledger = normaliseSemanticProjectionLedger(ledgerInput);
  setStateExtensionSnapshot('semanticProjection', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.semanticProjection = clone(ledger);
    const result = await saveState(state, { reason: 'semantic-projection-update', ...meta });
    notify(ledger, meta);
    return result;
  });
  return persistChain;
}
