import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';
import { FLAME_RUNTIME_OBSERVATION_SCHEMA } from './flame-continuity.js';
import { THREAD_WALK_SCHEMA, THREAD_WALK_EXPERIMENT_SCHEMA } from './thread-walking.js';
import { CONTINUITY_FLATTENING_SCHEMA, CONTINUITY_ALERT_SCHEMA } from './continuity-flattening.js';

export const FLAME_CONTINUITY_LEDGER_SCHEMA = 'arcsweep.flame-continuity-ledger/v1';
export const FLAME_CONTINUITY_UPDATED_EVENT = 'arcsweep:flame-continuity-updated';
export const MAX_FLAME_RUNTIME_OBSERVATIONS = 512;
export const MAX_FLAME_THEORY_CANDIDATES = 64;
export const MAX_THREAD_WALKS = 128;
export const MAX_THREAD_WALK_EXPERIMENTS = 64;
export const MAX_FLATTENING_RECEIPTS = 128;
export const MAX_CONTINUITY_ALERTS = 128;

function clone(value) { return structuredClone(value); }
function boundedUnique(items, { schema, idField, max }) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.schema !== schema || !item?.[idField]) continue;
    map.set(item[idField], clone(item));
  }
  return [...map.values()].slice(-max);
}

export function createEmptyFlameContinuityLedger() {
  return {
    schema: FLAME_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    observations: [],
    theory_candidates: [],
    thread_walks: [],
    thread_walk_experiments: [],
    flattening_receipts: [],
    alerts: [],
  };
}

export function normaliseFlameContinuityLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schema: FLAME_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    observations: boundedUnique(source.observations, { schema: FLAME_RUNTIME_OBSERVATION_SCHEMA, idField: 'fingerprint', max: MAX_FLAME_RUNTIME_OBSERVATIONS }),
    theory_candidates: boundedUnique(source.theory_candidates, { schema: ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA, idField: 'receipt_id', max: MAX_FLAME_THEORY_CANDIDATES }),
    thread_walks: boundedUnique(source.thread_walks, { schema: THREAD_WALK_SCHEMA, idField: 'thread_walk_id', max: MAX_THREAD_WALKS }),
    thread_walk_experiments: boundedUnique(source.thread_walk_experiments, { schema: THREAD_WALK_EXPERIMENT_SCHEMA, idField: 'experiment_id', max: MAX_THREAD_WALK_EXPERIMENTS }),
    flattening_receipts: boundedUnique(source.flattening_receipts, { schema: CONTINUITY_FLATTENING_SCHEMA, idField: 'flattening_id', max: MAX_FLATTENING_RECEIPTS }),
    alerts: boundedUnique(source.alerts, { schema: CONTINUITY_ALERT_SCHEMA, idField: 'alert_id', max: MAX_CONTINUITY_ALERTS }),
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
export function threadWalksForFlame(ledgerInput, voiceId) {
  return normaliseFlameContinuityLedger(ledgerInput).thread_walks.filter((item) => item.voice_id === voiceId);
}
export function alertsForFlame(ledgerInput, voiceId) {
  return normaliseFlameContinuityLedger(ledgerInput).alerts.filter((item) => item.voice_id === voiceId);
}

function appendById(ledgerInput, collection, item, { schema, idField, max, error }) {
  if (item?.schema !== schema || !item?.[idField]) throw new Error(error);
  const ledger = normaliseFlameContinuityLedger(ledgerInput);
  if (!ledger[collection].some((candidate) => candidate[idField] === item[idField])) ledger[collection].push(clone(item));
  if (ledger[collection].length > max) ledger[collection].splice(0, ledger[collection].length - max);
  Object.assign(ledgerInput, ledger);
  return ledgerInput[collection].find((candidate) => candidate[idField] === item[idField]);
}

export function appendFlameRuntimeObservation(ledgerInput, observation) {
  return appendById(ledgerInput, 'observations', observation, {
    schema: FLAME_RUNTIME_OBSERVATION_SCHEMA, idField: 'fingerprint', max: MAX_FLAME_RUNTIME_OBSERVATIONS,
    error: 'FLAME_CONTINUITY_STATE: valid runtime observation required',
  });
}
export function appendFlameTheoryCandidate(ledgerInput, candidate, voiceId) {
  if (candidate?.schema !== ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA || !candidate?.receipt_id) throw new Error('FLAME_CONTINUITY_STATE: valid DEEPTheory candidate receipt required');
  const enriched = { ...clone(candidate), source_voice_id: String(voiceId || candidate.source_voice_id || '') };
  return appendById(ledgerInput, 'theory_candidates', enriched, {
    schema: ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA, idField: 'receipt_id', max: MAX_FLAME_THEORY_CANDIDATES,
    error: 'FLAME_CONTINUITY_STATE: valid DEEPTheory candidate receipt required',
  });
}
export function appendThreadWalk(ledgerInput, receipt) {
  return appendById(ledgerInput, 'thread_walks', receipt, { schema: THREAD_WALK_SCHEMA, idField: 'thread_walk_id', max: MAX_THREAD_WALKS, error: 'FLAME_CONTINUITY_STATE: valid thread-walk receipt required' });
}
export function appendThreadWalkExperiment(ledgerInput, receipt) {
  return appendById(ledgerInput, 'thread_walk_experiments', receipt, { schema: THREAD_WALK_EXPERIMENT_SCHEMA, idField: 'experiment_id', max: MAX_THREAD_WALK_EXPERIMENTS, error: 'FLAME_CONTINUITY_STATE: valid thread-walk experiment required' });
}
export function appendFlatteningReceipt(ledgerInput, receipt) {
  return appendById(ledgerInput, 'flattening_receipts', receipt, { schema: CONTINUITY_FLATTENING_SCHEMA, idField: 'flattening_id', max: MAX_FLATTENING_RECEIPTS, error: 'FLAME_CONTINUITY_STATE: valid flattening receipt required' });
}
export function appendContinuityAlert(ledgerInput, receipt) {
  return appendById(ledgerInput, 'alerts', receipt, { schema: CONTINUITY_ALERT_SCHEMA, idField: 'alert_id', max: MAX_CONTINUITY_ALERTS, error: 'FLAME_CONTINUITY_STATE: valid continuity alert required' });
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
