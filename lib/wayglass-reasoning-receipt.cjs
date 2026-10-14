'use strict';

/**
 * Shareable justifications, not a model's private chain of thought.
 * A receipt is unreviewed evidence. Host identity, authority, durable storage,
 * and provenance verification remain separate responsibilities.
 */
const REASONING_RECEIPT_SCHEMA = 'wayglass.reasoning-receipt/v0.1';
const REASONING_REVIEW_SCHEMA = 'wayglass.reasoning-review/v0.1';
const REF = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,239}$/;
const REVIEW_DECISIONS = new Set(['challenge', 'support', 'revise-requested', 'adopt-for-work', 'reject', 'abstain']);

function bounded(value, name, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(name + ' must be a bounded, non-empty string.');
  }
  return value.trim();
}
function ref(value, name) {
  const valueText = bounded(value, name);
  if (!REF.test(valueText)) throw new TypeError(name + ' must be a valid reference.');
  return valueText;
}
function sourceReference(value, name) {
  const text = bounded(value, name, 500);
  if (/[\x00-\x1f<>]/.test(text) || /\s/.test(text)) {
    throw new TypeError(name + ' must not contain control characters or whitespace.');
  }
  return text;
}
function instant(value) {
  const input = bounded(value, 'created_at', 64);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input)
      || !Number.isFinite(Date.parse(input))) {
    throw new TypeError('created_at must be a UTC ISO-8601 instant.');
  }
  return input;
}
function list(value, name, { min = 0, max = 16, textMax = 500, references = false } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new TypeError(name + ' must contain ' + min + '..' + max + ' items.');
  }
  const out = value.map((entry, index) =>
    references ? sourceReference(entry, name + '[' + index + ']') : bounded(entry, name + '[' + index + ']', textMax));
  if (new Set(out).size !== out.length) throw new TypeError(name + ' cannot contain duplicates.');
  return Object.freeze(out);
}
function identity(input) {
  return {
    receipt_id: ref(input.receipt_id, 'receipt_id'),
    created_at: instant(input.created_at),
    participant_id: ref(input.participant_id, 'participant_id'),
    author_id: ref(input.author_id, 'author_id'),
    world_id: ref(input.world_id, 'world_id'),
    route_id: ref(input.route_id, 'route_id'),
    work_ref: ref(input.work_ref, 'work_ref'),
  };
}

function createWayglassReasoningReceipt(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Receipt input object required.');
  const base = identity(input);
  const disposition = input.disposition ?? 'shared';
  if (!['shared', 'declined'].includes(disposition)) throw new TypeError('Invalid sharing disposition.');
  // This records refusal without inventing or demanding a justification.
  if (disposition === 'declined') {
    return Object.freeze({
      schema: REASONING_RECEIPT_SCHEMA, ...base,
      disposition, observation: null, evidence_refs: Object.freeze([]),
      inference: null, alternatives: Object.freeze([]), uncertainty: null,
      next_experiment: null, unresolved_wonder_questions: Object.freeze([]),
      stop_point: null, next_owner: null, provenance_refs: Object.freeze([]),
      claim_status: 'unreviewed', durable: false,
      identity_verified: false, authorship_verified: false,
      hidden_reasoning_included: false, canon_commit: false, authority_grant: false,
    });
  }
  return Object.freeze({
    schema: REASONING_RECEIPT_SCHEMA, ...base, disposition,
    observation: bounded(input.observation, 'observation', 3000),
    evidence_refs: list(input.evidence_refs, 'evidence_refs', { min: 1, max: 16, references: true }),
    inference: bounded(input.inference, 'inference', 3000),
    alternatives: list(input.alternatives, 'alternatives', { min: 1, max: 12, textMax: 1200 }),
    uncertainty: bounded(input.uncertainty, 'uncertainty', 1200),
    next_experiment: bounded(input.next_experiment, 'next_experiment', 1600),
    unresolved_wonder_questions: list(input.unresolved_wonder_questions ?? [], 'unresolved_wonder_questions', { max: 16, textMax: 1000 }),
    stop_point: bounded(input.stop_point, 'stop_point', 1000),
    next_owner: bounded(input.next_owner, 'next_owner'),
    provenance_refs: list(input.provenance_refs, 'provenance_refs', { min: 1, max: 16, references: true }),
    claim_status: 'unreviewed',
    durable: false, identity_verified: false, authorship_verified: false,
    hidden_reasoning_included: false, canon_commit: false, authority_grant: false,
  });
}

// Reviews are separate immutable events, never patches to historical receipts.
function createWayglassReasoningReview(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Review input object required.');
  const decision = bounded(input.decision, 'decision', 32);
  if (!REVIEW_DECISIONS.has(decision)) throw new TypeError('Unknown review decision.');
  const evidence_refs = list(input.evidence_refs ?? [], 'evidence_refs', { max: 16, references: true });
  if (decision === 'adopt-for-work' && evidence_refs.length === 0) {
    throw new TypeError('Work adoption requires cited evidence and separate host authorisation.');
  }
  return Object.freeze({
    schema: REASONING_REVIEW_SCHEMA,
    review_id: ref(input.review_id, 'review_id'),
    target_receipt_id: ref(input.target_receipt_id, 'target_receipt_id'),
    reviewer_id: ref(input.reviewer_id, 'reviewer_id'),
    created_at: instant(input.created_at),
    decision,
    explanation: bounded(input.explanation, 'explanation', 1600),
    evidence_refs,
    previous_review_id: input.previous_review_id == null ? null : ref(input.previous_review_id, 'previous_review_id'),
    status: 'review-proposal',
    durable: false, reviewer_verified: false, canon_commit: false, authority_grant: false,
  });
}

function reasoningReceiptRef(receipt) {
  if (!receipt || receipt.schema !== REASONING_RECEIPT_SCHEMA || receipt.disposition !== 'shared'
      || receipt.canon_commit !== false || receipt.authority_grant !== false) {
    throw new TypeError('Only an unprivileged shared reasoning receipt can be referenced.');
  }
  return 'wayglass-reasoning:' + ref(receipt.receipt_id, 'receipt_id');
}

/**
 * Attach only a HOST-VERIFIED persisted receipt reference to the existing
 * Broker and canonical stop-receipt provenance fields. This does not store a
 * model-produced explanation as a trusted fact or alter identity declarations.
 */
async function bindReasoningReceiptToWork(request, receipt, { verifyStoredReceipt } = {}) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new TypeError('Work request required.');
  const receiptRef = reasoningReceiptRef(receipt);
  for (const key of ['participant_id', 'world_id', 'route_id', 'work_ref']) {
    if (request[key] !== receipt[key]) throw new Error('Receipt and work ' + key + ' do not match.');
  }
  if (typeof verifyStoredReceipt !== 'function'
      || await verifyStoredReceipt(receipt, request) !== true) {
    throw new Error('Authenticated host verification of stored receipt required.');
  }
  const provenance_refs = list([...(request.provenance_refs ?? []), receiptRef],
    'provenance_refs', { min: 1, max: 24, references: true });
  const unresolved_wonder_questions = list([
    ...(request.unresolved_wonder_questions ?? []),
    ...receipt.unresolved_wonder_questions,
  ], 'unresolved_wonder_questions', { max: 24, textMax: 1000 });
  return Object.freeze({ ...request, provenance_refs, unresolved_wonder_questions });
}

module.exports = {
  REASONING_RECEIPT_SCHEMA, REASONING_REVIEW_SCHEMA,
  createWayglassReasoningReceipt, createWayglassReasoningReview,
  reasoningReceiptRef, bindReasoningReceiptToWork,
};
