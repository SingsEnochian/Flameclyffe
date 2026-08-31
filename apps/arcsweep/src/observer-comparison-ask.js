export const OBSERVER_COMPARISON_ASK_SCHEMA = 'hearthgate.observer-comparison-ask/v1';
export const OBSERVER_QUERY_RECEIPT_SCHEMA = 'hearthgate.observer-query-receipt/v1';

export const OBSERVER_COMPARISON_MODES = Object.freeze([
  'similarity',
  'difference',
  'chronology',
  'pattern',
  'cross-context',
  'null-controlled',
]);

export const OBSERVER_CONTROL_POLICIES = Object.freeze([
  'none',
  'include-comparable-nonmatches',
  'locked-query',
]);

export const OBSERVER_CLAIM_CLASSES = Object.freeze([
  'established_science',
  'active_research',
  'speculative_theory',
  'fringe_inspiration',
  'implementation_task',
  'evidence_backed_finding',
  'symbolic_interpretation',
]);

export const DEFAULT_OBSERVER_OUTPUT_CLAIM_CLASSES = Object.freeze([
  'evidence_backed_finding',
  'symbolic_interpretation',
  'speculative_theory',
]);

function text(value, name, max = 4000) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${name} is required.`);
  return result.slice(0, max);
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error(`${name} is unsupported.`);
  return value;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function eventRefMap(receipt) {
  return new Map((receipt.result_refs || []).map((item) => [item.id, item]));
}

function normalizeSelectedEvents(receipt, selectedEventRefs) {
  const byId = eventRefMap(receipt);
  const ids = [...new Set((selectedEventRefs || []).map((item) => typeof item === 'string' ? item : item?.id).filter(Boolean))];
  if (!ids.length) throw new Error('At least one selected event is required.');
  return ids.map((id) => {
    const ref = byId.get(id);
    if (!ref) throw new Error(`Selected event ${id} is not present in the query receipt.`);
    return clone(ref);
  });
}

function normalizeRelationRefs(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].slice(0, 200);
}

function normalizeClaimClasses(values) {
  const list = values?.length ? values : DEFAULT_OBSERVER_OUTPUT_CLAIM_CLASSES;
  const unique = [...new Set(list)];
  for (const value of unique) oneOf(value, OBSERVER_CLAIM_CLASSES, 'claim class');
  return unique;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return `sha256:${bytesToHex(digest)}`;
}

function validateReceipt(receipt) {
  if (!receipt || receipt.schema !== OBSERVER_QUERY_RECEIPT_SCHEMA) throw new Error('A valid Observer query receipt is required.');
  if (!receipt.query_id || !receipt.chronology_cutoff || !receipt.exact_filters) throw new Error('Observer query receipt is incomplete.');
  if (!Array.isArray(receipt.result_refs)) throw new Error('Observer query receipt result_refs are required.');
  return receipt;
}

export async function createObserverComparisonAsk({
  question,
  queryReceipt,
  selectedEventRefs,
  selectedRelationRefs = [],
  comparisonMode = 'pattern',
  controlPolicy = 'none',
  allowedOutputClaimClasses = DEFAULT_OBSERVER_OUTPUT_CLAIM_CLASSES,
  createdBy = 'Rowan',
  notes = '',
} = {}, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
} = {}) {
  const receipt = validateReceipt(queryReceipt);
  const selectedEvents = normalizeSelectedEvents(receipt, selectedEventRefs);
  const mode = oneOf(comparisonMode, OBSERVER_COMPARISON_MODES, 'comparison mode');
  const controls = oneOf(controlPolicy, OBSERVER_CONTROL_POLICIES, 'control policy');
  const claimClasses = normalizeClaimClasses(allowedOutputClaimClasses);
  const receiptCopy = clone(receipt);
  const queryReceiptFingerprint = await sha256(JSON.stringify(receiptCopy));

  const ask = {
    schema: OBSERVER_COMPARISON_ASK_SCHEMA,
    ask_id: `observer-ask-${idFactory()}`,
    created_at: clock().toISOString(),
    created_by: text(createdBy, 'createdBy', 160),
    question: text(question, 'question', 8000),
    comparison_mode: mode,
    control_policy: controls,
    chronology_cutoff: receipt.chronology_cutoff,
    query_receipt_id: receipt.query_id,
    query_receipt_fingerprint: queryReceiptFingerprint,
    query_receipt: receiptCopy,
    selected_event_refs: selectedEvents,
    selected_relation_refs: normalizeRelationRefs(selectedRelationRefs),
    allowed_output_claim_classes: claimClasses,
    notes: String(notes || '').trim().slice(0, 8000) || null,
    authority: {
      retrieval: 'receipted',
      interpretation: 'not-yet-produced',
      relation_admission: false,
      continuity_admission: false,
      canon_admission: false,
    },
    continuity_effect: 'none',
  };

  ask.ask_fingerprint = await sha256(JSON.stringify(ask));
  return Object.freeze(ask);
}
