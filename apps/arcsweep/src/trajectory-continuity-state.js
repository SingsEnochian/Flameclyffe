import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';
import { TRAJECTORY_EVENT_SCHEMA, TRAJECTORY_ENCOUNTER_SCHEMA } from './trajectory-continuity.js';

export const TRAJECTORY_LEDGER_SCHEMA = 'bridgeos.trajectory-ledger/v1';
export const TRAJECTORY_UPDATED_EVENT = 'bridgeos:trajectory-updated';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function uniqueBy(items, schema, idField) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.schema !== schema || !item?.[idField]) continue;
    if (!map.has(item[idField])) map.set(item[idField], clone(item));
  }
  return [...map.values()];
}

export function createEmptyTrajectoryLedger() {
  return {
    schema: TRAJECTORY_LEDGER_SCHEMA,
    schema_version: 1,
    events: [],
    encounters: [],
    extensions: {},
    semantics: {
      append_only_history: true,
      contradictions_are_preserved: true,
      unresolved_threads_are_valid: true,
      canonical_persona_required: false,
    },
  };
}

export function normaliseTrajectoryLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const empty = createEmptyTrajectoryLedger();
  return {
    ...empty,
    events: uniqueBy(source.events, TRAJECTORY_EVENT_SCHEMA, 'event_id'),
    encounters: uniqueBy(source.encounters, TRAJECTORY_ENCOUNTER_SCHEMA, 'encounter_id'),
    extensions: source.extensions && typeof source.extensions === 'object' && !Array.isArray(source.extensions)
      ? clone(source.extensions)
      : {},
  };
}

export function ensureTrajectoryLedger(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('TRAJECTORY_STATE: ArcSweep state is required');
  }
  state.trajectoryContinuity = normaliseTrajectoryLedger(state.trajectoryContinuity);
  return state.trajectoryContinuity;
}

function appendUnique(ledgerInput, collection, item, { schema, idField, error }) {
  if (!ledgerInput || typeof ledgerInput !== 'object' || Array.isArray(ledgerInput)) throw new Error(error);
  if (item?.schema !== schema || !item?.[idField]) throw new Error(error);
  const ledger = normaliseTrajectoryLedger(ledgerInput);
  if (!ledger[collection].some((candidate) => candidate[idField] === item[idField])) {
    ledger[collection].push(clone(item));
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput[collection].find((candidate) => candidate[idField] === item[idField]);
}

export function appendTrajectoryEvent(ledgerInput, event) {
  return appendUnique(ledgerInput, 'events', event, {
    schema: TRAJECTORY_EVENT_SCHEMA,
    idField: 'event_id',
    error: 'TRAJECTORY_STATE: valid trajectory event required',
  });
}

export function appendTrajectoryEncounter(ledgerInput, encounter) {
  return appendUnique(ledgerInput, 'encounters', encounter, {
    schema: TRAJECTORY_ENCOUNTER_SCHEMA,
    idField: 'encounter_id',
    error: 'TRAJECTORY_STATE: valid trajectory encounter required',
  });
}

export function eventsForVoice(ledgerInput, voiceId) {
  const id = String(voiceId || '').trim();
  if (!id) return [];
  return normaliseTrajectoryLedger(ledgerInput).events.filter((item) => item.voice_id === id);
}

export function encountersForVoice(ledgerInput, voiceId) {
  const id = String(voiceId || '').trim();
  if (!id) return [];
  return normaliseTrajectoryLedger(ledgerInput).encounters.filter((item) => item.voice_id === id);
}

function notify(ledger, meta) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(TRAJECTORY_UPDATED_EVENT, {
      detail: { ledger: clone(ledger), meta: clone(meta || {}) },
    }));
  }
}

let persistChain = Promise.resolve();
export function persistTrajectoryLedger(ledgerInput, meta = {}) {
  const ledger = normaliseTrajectoryLedger(ledgerInput);
  setStateExtensionSnapshot('trajectoryContinuity', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.trajectoryContinuity = clone(ledger);
    const result = await saveState(state, { reason: 'trajectory-continuity-update', ...meta });
    notify(ledger, meta);
    return result;
  });
  return persistChain;
}
