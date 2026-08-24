export const FEEDBACK_QUEUE_SCHEMA = 'arcsweep.feedback-cycle-queue/v1';
export const FEEDBACK_QUEUE_RECEIPT_SCHEMA = 'arcsweep.feedback-cycle-queue-receipt/v1';
export const FEEDBACK_CYCLE_SCHEMA = 'arcsweep.feedback-cycle/v1';
export const FIELD_EVIDENCE_SCHEMA = 'arcsweep.field-evidence/v1';

export class FeedbackCycleQueueError extends Error {
  constructor(message, code = 'feedback-cycle-queue-error') {
    super(message);
    this.name = 'FeedbackCycleQueueError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new FeedbackCycleQueueError(`${field} must be a non-empty string`, 'invalid-queue-input');
  }
  return value.trim();
}

function makeId(prefix = 'fq') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function feedbackCycleSource(cycle) {
  const evidence = Array.isArray(cycle?.evidence) ? cycle.evidence : [];
  if (evidence.some((item) => item?.schema === FIELD_EVIDENCE_SCHEMA)) return 'field';
  if (cycle?.turn?.mode === 'observation') return 'relational-observation';
  return 'relational-feedback';
}

function evidenceRefs(cycle) {
  return Object.freeze((cycle?.evidence || []).map((item, index) => Object.freeze({
    index,
    schema: item?.schema || null,
    generated_at: item?.generated_at || item?.observed_at || null,
    source: item?.source || null,
  })));
}

export function createEmptyFeedbackQueue() {
  return {
    schema: FEEDBACK_QUEUE_SCHEMA,
    version: 1,
    entries: {},
    receipts: [],
    updated_at: null,
  };
}

export function normalizeFeedbackQueue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyFeedbackQueue();
  if (value.schema !== FEEDBACK_QUEUE_SCHEMA) return createEmptyFeedbackQueue();
  return {
    schema: FEEDBACK_QUEUE_SCHEMA,
    version: 1,
    entries: value.entries && typeof value.entries === 'object' ? clone(value.entries) : {},
    receipts: Array.isArray(value.receipts) ? clone(value.receipts) : [],
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null,
  };
}

function validateCycle(cycle) {
  if (!cycle || typeof cycle !== 'object' || Array.isArray(cycle)) {
    throw new FeedbackCycleQueueError('cycle must be an object', 'invalid-cycle');
  }
  if (cycle.schema !== FEEDBACK_CYCLE_SCHEMA) {
    throw new FeedbackCycleQueueError(
      `Unsupported cycle schema: ${cycle.schema ?? 'missing'}`,
      'unsupported-cycle-schema',
    );
  }
  if (!cycle.cycle_id || typeof cycle.cycle_id !== 'string') {
    throw new FeedbackCycleQueueError('cycle must have a cycle_id', 'invalid-cycle-id');
  }
  if (!cycle.world?.id || !cycle.world?.name) {
    throw new FeedbackCycleQueueError('cycle must have a world with id and name', 'invalid-cycle-world');
  }
  return cycle;
}

export function enqueueFeedbackCycle(queueInput, cycle, {
  enqueuedBy = 'Rowan',
  clock = () => new Date(),
} = {}) {
  requireString(enqueuedBy, 'enqueuedBy');
  const validCycle = validateCycle(cycle);
  const queue = normalizeFeedbackQueue(queueInput);

  if (queue.entries[validCycle.cycle_id]) {
    return { queue, entry: clone(queue.entries[validCycle.cycle_id]), enqueued: false, idempotent: true };
  }

  const enqueuedAt = clock().toISOString();
  const entryId = makeId('fce');
  const observationSource = feedbackCycleSource(validCycle);

  const entry = {
    entry_id: entryId,
    cycle_id: validCycle.cycle_id,
    cycle_fingerprint: validCycle.cycle_fingerprint,
    world: clone(validCycle.world),
    turn: clone(validCycle.turn),
    premaqc_before_id: validCycle.premaqc_before?.id ?? null,
    premaqc_after_id: validCycle.premaqc_after?.id ?? null,
    premaqc_after_receipt_id: validCycle.premaqc_after?.receipt_id ?? null,
    derived: validCycle.derived ? clone(validCycle.derived) : null,
    voices: Array.isArray(validCycle.voices) ? clone(validCycle.voices) : [],
    authority: clone(validCycle.authority),
    exploration: Boolean(validCycle.exploration),
    observation_source: observationSource,
    evidence_refs: clone(evidenceRefs(validCycle)),
    status: 'pending_review',
    enqueued_at: enqueuedAt,
    enqueued_by: enqueuedBy.trim(),
    reviewed_at: null,
    reviewed_by: null,
    review_receipt_id: null,
  };

  queue.entries[validCycle.cycle_id] = entry;
  queue.updated_at = enqueuedAt;
  queue.receipts.push({
    schema: FEEDBACK_QUEUE_RECEIPT_SCHEMA,
    receipt_id: makeId('fqr'),
    action: 'enqueue',
    entry_id: entryId,
    cycle_id: validCycle.cycle_id,
    world_id: validCycle.world.id,
    observation_source: observationSource,
    enqueued_at: enqueuedAt,
    enqueued_by: enqueuedBy.trim(),
    exploration: Boolean(validCycle.exploration),
  });

  return { queue, entry: clone(entry), enqueued: true, idempotent: false };
}

function reviewEntry(queueInput, cycleId, status, { reviewedBy, clock }) {
  requireString(reviewedBy, 'reviewedBy');
  const queue = normalizeFeedbackQueue(queueInput);
  const entry = queue.entries[cycleId];
  if (!entry) {
    throw new FeedbackCycleQueueError(
      `No queue entry found for cycle ${cycleId}`,
      'entry-not-found',
    );
  }
  if (entry.status !== 'pending_review') {
    return { queue, entry: clone(entry), reviewed: false, idempotent: true };
  }

  const reviewedAt = clock().toISOString();
  const receiptId = makeId('fqr');
  queue.entries[cycleId] = { ...entry, status, reviewed_at: reviewedAt, reviewed_by: reviewedBy.trim(), review_receipt_id: receiptId };
  queue.updated_at = reviewedAt;
  queue.receipts.push({
    schema: FEEDBACK_QUEUE_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    action: status,
    entry_id: entry.entry_id,
    cycle_id: cycleId,
    world_id: entry.world.id,
    observation_source: entry.observation_source || 'relational-feedback',
    reviewed_at: reviewedAt,
    reviewed_by: reviewedBy.trim(),
  });

  return { queue, entry: clone(queue.entries[cycleId]), reviewed: true, idempotent: false };
}

export function acceptFeedbackCycle(queueInput, cycleId, { acceptedBy = 'Rowan', clock = () => new Date() } = {}) {
  return reviewEntry(queueInput, cycleId, 'accepted', { reviewedBy: acceptedBy, clock });
}

export function archiveFeedbackCycle(queueInput, cycleId, { archivedBy = 'Rowan', clock = () => new Date() } = {}) {
  return reviewEntry(queueInput, cycleId, 'archived', { reviewedBy: archivedBy, clock });
}

export function discardFeedbackCycle(queueInput, cycleId, { discardedBy = 'Rowan', clock = () => new Date() } = {}) {
  return reviewEntry(queueInput, cycleId, 'discarded', { reviewedBy: discardedBy, clock });
}

export function pendingCycles(queueInput) {
  const queue = normalizeFeedbackQueue(queueInput);
  return Object.values(queue.entries)
    .filter((entry) => entry.status === 'pending_review')
    .sort((a, b) => a.enqueued_at.localeCompare(b.enqueued_at));
}

export function acceptedCycles(queueInput) {
  const queue = normalizeFeedbackQueue(queueInput);
  return Object.values(queue.entries)
    .filter((entry) => entry.status === 'accepted')
    .sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
}

export function feedbackQueueSummary(queueInput) {
  const queue = normalizeFeedbackQueue(queueInput);
  const entries = Object.values(queue.entries);
  return {
    total: entries.length,
    pending: entries.filter((e) => e.status === 'pending_review').length,
    accepted: entries.filter((e) => e.status === 'accepted').length,
    archived: entries.filter((e) => e.status === 'archived').length,
    discarded: entries.filter((e) => e.status === 'discarded').length,
    field: entries.filter((e) => e.observation_source === 'field').length,
    receipt_count: queue.receipts.length,
    worlds: [...new Set(entries.map((e) => e.world.id))],
  };
}
