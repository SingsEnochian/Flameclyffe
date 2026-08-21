import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import {
  CONTINUITY_BASELINE_SCHEMA,
  CONTINUITY_THRESHOLD_PROFILE_SCHEMA,
  CONTINUITY_PERTURBATION_SCHEMA,
  CONTINUITY_TRIAL_SCHEMA,
} from './continuity-experiment.js';

export const CONTINUITY_EXPERIMENT_LEDGER_SCHEMA = 'arcsweep.continuity-experiment-ledger/v1';
export const CONTINUITY_EXPERIMENT_UPDATED_EVENT = 'arcsweep:continuity-experiment-updated';
export const CONTINUITY_TEMPORAL_CANDIDATE_SCHEMA = 'arcsweep.continuity-temporal-candidate/v1';
export const MAX_BASELINES = 64;
export const MAX_THRESHOLDS = 64;
export const MAX_PERTURBATIONS = 128;
export const MAX_TRIALS = 128;
export const MAX_TEMPORAL_CANDIDATES = 128;
export const MAX_THEORY_CANDIDATES = 64;

function clone(value) { return structuredClone(value); }
function bounded(items, schema, idField, max) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.schema !== schema || !item?.[idField]) continue;
    map.set(item[idField], clone(item));
  }
  return [...map.values()].slice(-max);
}

export function createEmptyContinuityExperimentLedger() {
  return {
    schema: CONTINUITY_EXPERIMENT_LEDGER_SCHEMA,
    version: 1,
    baselines: [],
    threshold_profiles: [],
    perturbations: [],
    trials: [],
    temporal_candidates: [],
    theory_candidates: [],
  };
}

export function normaliseContinuityExperimentLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schema: CONTINUITY_EXPERIMENT_LEDGER_SCHEMA,
    version: 1,
    baselines: bounded(source.baselines, CONTINUITY_BASELINE_SCHEMA, 'baseline_id', MAX_BASELINES),
    threshold_profiles: bounded(source.threshold_profiles, CONTINUITY_THRESHOLD_PROFILE_SCHEMA, 'threshold_profile_id', MAX_THRESHOLDS),
    perturbations: bounded(source.perturbations, CONTINUITY_PERTURBATION_SCHEMA, 'perturbation_id', MAX_PERTURBATIONS),
    trials: bounded(source.trials, CONTINUITY_TRIAL_SCHEMA, 'trial_id', MAX_TRIALS),
    temporal_candidates: bounded(source.temporal_candidates, CONTINUITY_TEMPORAL_CANDIDATE_SCHEMA, 'candidate_id', MAX_TEMPORAL_CANDIDATES),
    theory_candidates: (Array.isArray(source.theory_candidates) ? source.theory_candidates : []).filter((item) => item?.schema === 'arcsweep.deep-theory-candidate-receipt/v1' && item?.receipt_id).slice(-MAX_THEORY_CANDIDATES).map(clone),
  };
}

export function ensureContinuityExperimentLedger(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('CONTINUITY_EXPERIMENT_STATE: Arcsweep state required');
  state.continuityExperiment = normaliseContinuityExperimentLedger(state.continuityExperiment);
  return state.continuityExperiment;
}

function appendUnique(ledgerInput, key, item, idField) {
  const ledger = normaliseContinuityExperimentLedger(ledgerInput);
  if (!ledger[key].some((candidate) => candidate[idField] === item[idField])) ledger[key].push(clone(item));
  Object.assign(ledgerInput, normaliseContinuityExperimentLedger(ledger));
  return ledgerInput[key].find((candidate) => candidate[idField] === item[idField]);
}

export function appendContinuityBaseline(ledger, item) {
  if (item?.schema !== CONTINUITY_BASELINE_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_STATE: baseline required');
  return appendUnique(ledger, 'baselines', item, 'baseline_id');
}
export function appendContinuityThresholdProfile(ledger, item) {
  if (item?.schema !== CONTINUITY_THRESHOLD_PROFILE_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_STATE: threshold profile required');
  return appendUnique(ledger, 'threshold_profiles', item, 'threshold_profile_id');
}
export function appendContinuityTrial(ledger, item) {
  if (item?.schema !== CONTINUITY_TRIAL_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_STATE: trial required');
  appendUnique(ledger, 'perturbations', item.perturbation, 'perturbation_id');
  return appendUnique(ledger, 'trials', item, 'trial_id');
}
export function appendContinuityTemporalCandidate(ledger, item) {
  if (item?.schema !== CONTINUITY_TEMPORAL_CANDIDATE_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_STATE: temporal candidate required');
  return appendUnique(ledger, 'temporal_candidates', item, 'candidate_id');
}
export function appendContinuityTheoryCandidate(ledger, item) {
  if (item?.schema !== 'arcsweep.deep-theory-candidate-receipt/v1') throw new Error('CONTINUITY_EXPERIMENT_STATE: DEEPTheory candidate required');
  return appendUnique(ledger, 'theory_candidates', item, 'receipt_id');
}

export function activeBaselineForFlame(ledgerInput, voiceId) {
  return normaliseContinuityExperimentLedger(ledgerInput).baselines.filter((item) => item.voice_id === voiceId).at(-1) || null;
}
export function activeThresholdProfileForFlame(ledgerInput, voiceId) {
  return normaliseContinuityExperimentLedger(ledgerInput).threshold_profiles.filter((item) => item.voice_id === voiceId).at(-1) || null;
}
export function trialsForFlame(ledgerInput, voiceId) {
  return normaliseContinuityExperimentLedger(ledgerInput).trials.filter((item) => item.voice_id === voiceId);
}

let persistChain = Promise.resolve();
export function persistContinuityExperimentLedger(ledgerInput, meta = {}) {
  const ledger = normaliseContinuityExperimentLedger(ledgerInput);
  setStateExtensionSnapshot('continuityExperiment', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.continuityExperiment = clone(ledger);
    const result = await saveState(state, { reason: 'continuity-experiment-update', ...meta });
    if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
      globalThis.dispatchEvent(new CustomEvent(CONTINUITY_EXPERIMENT_UPDATED_EVENT, { detail: { ledger: clone(ledger), meta: clone(meta) } }));
    }
    return result;
  });
  return persistChain;
}
