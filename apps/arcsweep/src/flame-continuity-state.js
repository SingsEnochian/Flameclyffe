import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import { FLAME_RUNTIME_OBSERVATION_SCHEMA } from './flame-continuity.js';

export const FLAME_CONTINUITY_LEDGER_SCHEMA = 'arcsweep.flame-continuity-ledger/v1';
export const FLAME_CONTINUITY_UPDATED_EVENT = 'arcsweep:flame-continuity-updated';
export const MAX_FLAME_RUNTIME_OBSERVATIONS = 512;

function clone(value) { return structuredClone(value); }

export function createEmptyFlameContinuityLedger() {
  return { schema: FLAME_CONTINUITY_LEDGER_SCHEMA, version: 1, observations: [] };
}

export function normaliseFlameContinuityLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const map = new Map();
  for (const observation of Array.isArray(source.observations) ? source.observations : []) {
    if (observation?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA || !observation?.fingerprint) continue;
    map.set(observation.fingerprint, clone(observation));
  }
  return {
    schema: FLAME_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    observations: [...map.values()].slice(-MAX_FLAME_RUNTIME_OBSERVATIONS),
  };
}

export function ensureFlameContinuityLedger(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('FLAME_CONTINUITY_STATE: Arcsweep state is required');
  state.flameContinuity = normaliseFlameContinuityLedger(state.flameContinuity);
  return state.flameContinuity;
}

export function observationsForFlame(ledgerInput, voiceId) {
  return normaliseFlameContinuityLedger(ledgerInput).observations.filter((item) => item.flame.voice_id === voiceId);
}

export function appendFlameRuntimeObservation(ledgerInput, observation) {
  if (observation?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA || !observation?.fingerprint) {
    throw new Error('FLAME_CONTINUITY_STATE: valid runtime observation required');
  }
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  if (!ledger.observations.some((item) => item.fingerprint === observation.fingerprint)) {
    ledger.observations.push(clone(observation));
  }
  if (ledger.observations.length > MAX_FLAME_RUNTIME_OBSERVATIONS) {
    ledger.observations.splice(0, ledger.observations.length - MAX_FLAME_RUNTIME_OBSERVATIONS);
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput.observations.find((item) => item.fingerprint === observation.fingerprint);
}

function notify(ledger, meta) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(FLAME_CONTINUITY_UPDATED_EVENT, { detail: { ledger: clone(ledger), meta: clone(meta || {}) } }));
  }
}

let persistChain = Promise.resolve();
export function persistFlameContinuityLedger(ledgerInput, meta = {}) {
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  setStateExtensionSnapshot('flameContinuity', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.flameContinuity = clone(ledger);
    const result = await saveState(state, { reason: 'flame-continuity-update', ...meta });
    notify(ledger, meta);
    return result;
  });
  return persistChain;
}
