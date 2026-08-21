import { ADMISSIBILITY_RESIDUAL_SCHEMA } from './admissibility-residual.js';
import { RECOGNITION_CORRESPONDENCE_SCHEMA } from './recognition-correspondence.js';
import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';

export const CONTINUITY_EVIDENCE_LEDGER_SCHEMA = 'arcsweep.continuity-evidence-ledger/v1';
export const CONTINUITY_EVIDENCE_ENTRY_SCHEMA = 'arcsweep.continuity-evidence-entry/v1';
export const CONTINUITY_EVIDENCE_UPDATED_EVENT = 'arcsweep:continuity-evidence-updated';
export const MAX_CONTINUITY_EVIDENCE_ENTRIES = 512;

function clone(value) {
  return structuredClone(value);
}

function invariant(condition, message) {
  if (!condition) throw new Error(`CONTINUITY_EVIDENCE_STATE: ${message}`);
}

function receiptKind(receipt) {
  if (receipt?.schema === RECOGNITION_CORRESPONDENCE_SCHEMA) return 'recognition';
  if (receipt?.schema === ADMISSIBILITY_RESIDUAL_SCHEMA) return 'admissibility-residual';
  return null;
}

function normaliseEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const receipt = entry.receipt;
  const kind = receiptKind(receipt);
  if (!kind || !receipt?.fingerprint) return null;
  return {
    schema: CONTINUITY_EVIDENCE_ENTRY_SCHEMA,
    version: 1,
    evidence_id: `${kind}:${receipt.fingerprint}`,
    kind,
    world_id: entry.world_id == null ? null : String(entry.world_id),
    subject_id: entry.subject_id == null
      ? (receipt.subject?.id == null ? null : String(receipt.subject.id))
      : String(entry.subject_id),
    origin: entry.origin && typeof entry.origin === 'object' && !Array.isArray(entry.origin)
      ? clone(entry.origin)
      : {},
    recorded_at: typeof entry.recorded_at === 'string'
      ? entry.recorded_at
      : receipt.generated_at || new Date().toISOString(),
    receipt: clone(receipt),
  };
}

function dedupeEntries(entries) {
  const map = new Map();
  for (const raw of entries) {
    const entry = normaliseEntry(raw);
    if (!entry) continue;
    map.set(entry.evidence_id, entry);
  }
  return [...map.values()].slice(-MAX_CONTINUITY_EVIDENCE_ENTRIES);
}

function notifyContinuityEvidence(ledger, meta = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(CONTINUITY_EVIDENCE_UPDATED_EVENT, {
      detail: { ledger: clone(ledger), meta: clone(meta) },
    }));
  }
}

export function createEmptyContinuityEvidenceLedger() {
  return {
    schema: CONTINUITY_EVIDENCE_LEDGER_SCHEMA,
    version: 1,
    entries: [],
  };
}

export function normaliseContinuityEvidenceLedger(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schema: CONTINUITY_EVIDENCE_LEDGER_SCHEMA,
    version: 1,
    entries: dedupeEntries(Array.isArray(source.entries) ? source.entries : []),
  };
}

export function ensureContinuityEvidenceLedger(state) {
  invariant(state && typeof state === 'object' && !Array.isArray(state), 'an Arcsweep state object is required');
  const ledger = normaliseContinuityEvidenceLedger(state.continuityEvidence);
  state.continuityEvidence = ledger;
  return ledger;
}

export function appendContinuityEvidence(ledgerInput, {
  receipt,
  worldId = null,
  subjectId = null,
  origin = {},
  recordedAt = receipt?.generated_at || new Date().toISOString(),
} = {}) {
  invariant(ledgerInput && typeof ledgerInput === 'object' && !Array.isArray(ledgerInput), 'a continuity evidence ledger is required');
  const kind = receiptKind(receipt);
  invariant(kind, 'receipt must be a recognition correspondence or admissibility residual');
  invariant(typeof receipt.fingerprint === 'string' && receipt.fingerprint, 'receipt fingerprint is required');
  const ledger = normaliseContinuityEvidenceLedger(ledgerInput);
  const entry = normaliseEntry({
    receipt,
    world_id: worldId,
    subject_id: subjectId,
    origin,
    recorded_at: recordedAt,
  });
  const existing = ledger.entries.find((item) => item.evidence_id === entry.evidence_id);
  if (!existing) ledger.entries.push(entry);
  if (ledger.entries.length > MAX_CONTINUITY_EVIDENCE_ENTRIES) {
    ledger.entries.splice(0, ledger.entries.length - MAX_CONTINUITY_EVIDENCE_ENTRIES);
  }
  Object.assign(ledgerInput, ledger);
  return existing || ledgerInput.entries.at(-1);
}

export function evidenceForWorld(ledgerInput, worldId) {
  const ledger = normaliseContinuityEvidenceLedger(ledgerInput);
  return ledger.entries.filter((entry) => !worldId || entry.world_id === worldId);
}

/**
 * Copy residual receipts already embedded in canonical transformation and Helm
 * receipts into the bounded continuity-evidence ledger. This never changes the
 * source receipt and never promotes a derived residual into an outcome claim.
 */
export function harvestEmbeddedContinuityEvidence(state, ledgerInput = ensureContinuityEvidenceLedger(state)) {
  const before = ledgerInput.entries.length;
  for (const [worldId, record] of Object.entries(state?.transformationRequests?.byWorld || {})) {
    for (const circuit of record?.circuits || []) {
      if (circuit?.admissibility_residual?.schema !== ADMISSIBILITY_RESIDUAL_SCHEMA) continue;
      appendContinuityEvidence(ledgerInput, {
        receipt: circuit.admissibility_residual,
        worldId: circuit.world?.id || worldId,
        origin: {
          organ: 'requested-transformation',
          circuit_id: circuit.circuit_id || null,
          request_id: circuit.request?.request_id || null,
          response_id: circuit.measured_response?.response_id || null,
        },
      });
    }
  }
  for (const helm of state?.reaction?.helm?.receipts || []) {
    if (helm?.admissibility_residual?.schema !== ADMISSIBILITY_RESIDUAL_SCHEMA) continue;
    appendContinuityEvidence(ledgerInput, {
      receipt: helm.admissibility_residual,
      worldId: helm.world_id || null,
      origin: {
        organ: 'react-ion-helm',
        navigation_request_id: helm.navigation?.request_id || null,
        ask_packet_id: helm.ask?.packet_id || null,
        graph_snapshot_id: helm.graph_snapshot?.snapshot_id || null,
      },
    });
  }
  return {
    ledger: ledgerInput,
    added: Math.max(0, ledgerInput.entries.length - before),
  };
}

let persistChain = Promise.resolve();
export function persistContinuityEvidenceLedger(ledgerInput, meta = {}) {
  const ledger = normaliseContinuityEvidenceLedger(ledgerInput);
  setStateExtensionSnapshot('continuityEvidence', ledger);
  persistChain = persistChain.catch(() => {}).then(async () => {
    const state = await loadState();
    state.continuityEvidence = clone(ledger);
    const result = await saveState(state, { reason: 'continuity-evidence-update', ...meta });
    notifyContinuityEvidence(ledger, meta);
    return result;
  });
  return persistChain;
}
