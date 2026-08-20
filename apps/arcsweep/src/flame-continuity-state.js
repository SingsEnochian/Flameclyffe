import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';
import { FLAME_RUNTIME_OBSERVATION_SCHEMA } from './flame-continuity.js';

export const FLAME_CONTINUITY_LEDGER_SCHEMA = 'arcsweep.flame-continuity-ledger/v1';
export const FLAME_CONTINUITY_UPDATED_EVENT = 'arcsweep:flame-continuity-updated';
export const MAX_FLAME_RUNTIME_OBSERVATIONS = 512;
export const MAX_FLAME_THEORY_CANDIDATES = 64;

function clone(value) { return structuredClone(value); }

export function createEmptyFlameContinuityLedger() {
  return { schema: FLAME_CONTINUITY_LEDGER_SCHEMA, version: 1, observations: [], theory_candidates: [] };
}

export function normaliseFlameContinuityLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const map = new Map();
  for (const observation of Array.isArray(source.observations) ? source.observations : []) {
    if (observation?.schema !== FLAME_RUNTIME_OBSERVATION_SCHEMA || !observation?.fingerprint) continue;
    map.set(observation.fingerprint, clone(observation));
  }
  const candidateMap = new Map();
  for (const candidate of Array.isArray(source.theory_candidates) ? source.theory_candidates : []) {
    if (candidate?.schema !== ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA || !candidate?.receipt_id || !candidate?.record_fingerprint) continue;
    candidateMap.set(candidate.receipt_id, clone(candidate));
  }
  return {
    schema: FLAME_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    observations: [...map.values()].slice(-MAX_FLAME_RUNTIME_OBSERVATIONS),
    theory_candidates: [...candidateMap.values()].slice(-MAX_FLAME_THEORY_CANDIDATES),
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

export function theoryCandidatesForFlame(ledgerInput, voiceId) {
  return normaliseFlameContinuityLedger(ledgerInput).theory_candidates.filter((item) => item.source_voice_id === voiceId);
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

export function appendFlameTheoryCandidate(ledgerInput, candidate, voiceId) {
  if (candidate?.schema !== ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA || !candidate?.receipt_id || !candidate?.record_fingerprint) {
    throw new Error('FLAME_CONTINUITY_STATE: valid DEEPTheory candidate receipt required');
  }
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  if (!ledger.theory_candidates.some((item) => item.receipt_id === candidate.receipt_id)) {
    ledger.theory_candidates.push({ ...clone(candidate), source_voice_id: String(voiceId || '') });
  }
  if (ledger.theory_candidates.length > MAX_FLAME_THEORY_CANDIDATES) {
    ledger.theory_candidates.splice(0, ledger.theory_candidates.length - MAX_FLAME_THEORY_CANDIDATES);
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput.theory_candidates.find((item) => item.receipt_id === candidate.receipt_id);
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
