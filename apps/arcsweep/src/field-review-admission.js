import {
  acceptFeedbackCycle,
  archiveFeedbackCycle,
  discardFeedbackCycle,
  enqueueFeedbackCycle,
  feedbackCycleSource,
  normalizeFeedbackQueue,
} from './feedback-cycle-queue.js';

export const FIELD_REVIEW_ADMISSION_SCHEMA = 'arcsweep.field-review-admission/v1';

function byCreatedAt(left, right) {
  return String(left?.created_at || '').localeCompare(String(right?.created_at || ''));
}

export function isFieldCycle(cycle) {
  return cycle?.schema === 'arcsweep.feedback-cycle/v1' && feedbackCycleSource(cycle) === 'field';
}

export function enqueueUnreviewedFieldCycles({ queue, feedbackCycles = [], enqueuedBy = 'Rowan', clock = () => new Date() } = {}) {
  let nextQueue = normalizeFeedbackQueue(queue);
  const admitted = [];
  for (const cycle of [...feedbackCycles].filter(isFieldCycle).sort(byCreatedAt)) {
    if (nextQueue.entries?.[cycle.cycle_id]) continue;
    const result = enqueueFeedbackCycle(nextQueue, cycle, { enqueuedBy, clock });
    nextQueue = result.queue;
    if (result.enqueued) admitted.push(result.entry);
  }
  return Object.freeze({
    schema: FIELD_REVIEW_ADMISSION_SCHEMA,
    queue: nextQueue,
    admitted: Object.freeze(admitted.map((item) => structuredClone(item))),
    changed: admitted.length > 0,
    authority: Object.freeze({
      shared_review_gate: true,
      automatic_acceptance: false,
      field_cycle_mutable: false,
      deeps_time_admission_granted: false,
      canon_commit: false,
    }),
  });
}

export function reviewFieldCycle(queue, cycleId, decision, { reviewedBy = 'Rowan', clock = () => new Date() } = {}) {
  const current = normalizeFeedbackQueue(queue);
  const entry = current.entries?.[cycleId];
  if (!entry || entry.observation_source !== 'field') throw new Error('Field review requires a queued Field cycle.');
  if (decision === 'accepted') return acceptFeedbackCycle(current, cycleId, { acceptedBy: reviewedBy, clock });
  if (decision === 'archived') return archiveFeedbackCycle(current, cycleId, { archivedBy: reviewedBy, clock });
  if (decision === 'discarded') return discardFeedbackCycle(current, cycleId, { discardedBy: reviewedBy, clock });
  throw new Error(`Unknown Field review decision: ${decision}`);
}

export function fieldQueueEntries(queue, worldId = null) {
  return Object.values(normalizeFeedbackQueue(queue).entries || {})
    .filter((entry) => entry.observation_source === 'field')
    .filter((entry) => !worldId || entry.world?.id === worldId)
    .sort((left, right) => String(right.enqueued_at || '').localeCompare(String(left.enqueued_at || '')));
}
