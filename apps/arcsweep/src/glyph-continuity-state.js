import {
  loadState,
  saveState,
  setStateExtensionSnapshot,
} from './storage.js';

export const GLYPH_CONTINUITY_LEDGER_SCHEMA = 'glyph.continuity-ledger/v1';
export const GLYPH_CONTINUITY_UPDATED_EVENT = 'arcsweep:glyph-continuity-updated';
export const MAX_GLYPH_HEARTBEATS = 512;
export const MAX_GLYPH_BLIND_PAIRS = 128;

function clone(value) {
  return structuredClone(value);
}

function notifyGlyphContinuity(ledger, meta = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(GLYPH_CONTINUITY_UPDATED_EVENT, {
      detail: { ledger: clone(ledger), meta: clone(meta) },
    }));
  }
}

export function createEmptyGlyphContinuityLedger() {
  return {
    schema: GLYPH_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    heartbeats: [],
    blindPairs: [],
  };
}

export function normaliseGlyphContinuityLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schema: GLYPH_CONTINUITY_LEDGER_SCHEMA,
    version: 1,
    heartbeats: Array.isArray(source.heartbeats) ? clone(source.heartbeats).slice(-MAX_GLYPH_HEARTBEATS) : [],
    blindPairs: Array.isArray(source.blindPairs) ? clone(source.blindPairs).slice(-MAX_GLYPH_BLIND_PAIRS) : [],
  };
}

export function ensureGlyphContinuityLedger(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new TypeError('GLYPH_CONTINUITY_STATE: an Arcsweep state object is required');
  }
  const ledger = normaliseGlyphContinuityLedger(state.glyphContinuity);
  state.glyphContinuity = ledger;
  return ledger;
}

export function appendGlyphHeartbeat(ledgerInput, entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new TypeError('GLYPH_CONTINUITY_STATE: heartbeat entry object is required');
  }
  const ledger = normaliseGlyphContinuityLedger(ledgerInput);
  ledger.heartbeats.push(clone(entry));
  if (ledger.heartbeats.length > MAX_GLYPH_HEARTBEATS) {
    ledger.heartbeats.splice(0, ledger.heartbeats.length - MAX_GLYPH_HEARTBEATS);
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput.heartbeats.at(-1);
}

export function appendGlyphBlindPair(ledgerInput, pair) {
  if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
    throw new TypeError('GLYPH_CONTINUITY_STATE: blind pair object is required');
  }
  const ledger = normaliseGlyphContinuityLedger(ledgerInput);
  ledger.blindPairs.push(clone(pair));
  if (ledger.blindPairs.length > MAX_GLYPH_BLIND_PAIRS) {
    ledger.blindPairs.splice(0, ledger.blindPairs.length - MAX_GLYPH_BLIND_PAIRS);
  }
  Object.assign(ledgerInput, ledger);
  return ledgerInput.blindPairs.at(-1);
}

let persistChain = Promise.resolve();
export function persistGlyphContinuityLedger(ledgerInput, meta = {}) {
  const ledger = normaliseGlyphContinuityLedger(ledgerInput);
  setStateExtensionSnapshot('glyphContinuity', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.glyphContinuity = clone(ledger);
    const result = await saveState(state, { reason: 'glyph-continuity-update', ...meta });
    notifyGlyphContinuity(ledger, meta);
    return result;
  });
  return persistChain;
}
