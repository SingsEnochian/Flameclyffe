import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEEDBACK_QUEUE_SCHEMA,
  FEEDBACK_QUEUE_RECEIPT_SCHEMA,
  FEEDBACK_CYCLE_SCHEMA,
  FeedbackCycleQueueError,
  createEmptyFeedbackQueue,
  normalizeFeedbackQueue,
  enqueueFeedbackCycle,
  acceptFeedbackCycle,
  archiveFeedbackCycle,
  discardFeedbackCycle,
  pendingCycles,
  acceptedCycles,
  feedbackQueueSummary,
} from '../src/feedback-cycle-queue.js';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';

const terra = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const fixedAt = '2026-08-12T00:00:00.000Z';

async function makeCycle(opts = {}) {
  return runFeedbackCycle({
    world: terra,
    premaqc: createInitialPremaqc(terra.id, {}, fixedAt),
    mode: 'writing',
    work: 'The fire held the room through the long hours.',
    response: 'Received.',
    voiceIds: ['lioreal'],
    observedAt: fixedAt,
    ...opts,
  });
}

function fixedClock(isoString) {
  return () => new Date(isoString);
}

// ---------- 1. Empty queue ----------
test('empty queue: createEmptyFeedbackQueue returns well-formed schema', () => {
  const queue = createEmptyFeedbackQueue();
  assert.equal(queue.schema, FEEDBACK_QUEUE_SCHEMA);
  assert.equal(queue.version, 1);
  assert.deepEqual(queue.entries, {});
  assert.deepEqual(queue.receipts, []);
  assert.equal(queue.updated_at, null);
});

// ---------- 2. Normalize ----------
test('normalize: invalid or unrecognized inputs return empty queue; valid input round-trips', () => {
  for (const bad of [null, undefined, 42, [], 'string', { schema: 'wrong/schema' }]) {
    const result = normalizeFeedbackQueue(bad);
    assert.equal(result.schema, FEEDBACK_QUEUE_SCHEMA, `${JSON.stringify(bad)} must produce empty queue`);
    assert.deepEqual(result.entries, {});
  }

  const valid = { schema: FEEDBACK_QUEUE_SCHEMA, version: 1, entries: {}, receipts: [{ x: 1 }], updated_at: '2026-08-12T00:00:00.000Z' };
  const normalized = normalizeFeedbackQueue(valid);
  assert.equal(normalized.updated_at, '2026-08-12T00:00:00.000Z');
  assert.equal(normalized.receipts.length, 1);
});

// ---------- 3. Enqueue ----------
test('enqueue: cycle enters queue as pending_review with correct fields', async () => {
  const cycle = await makeCycle();
  const at = '2026-08-12T01:00:00.000Z';
  const { queue, entry, enqueued } = enqueueFeedbackCycle(null, cycle, {
    enqueuedBy: 'Rowan',
    clock: fixedClock(at),
  });

  assert.equal(enqueued, true);
  assert.equal(entry.status, 'pending_review');
  assert.equal(entry.cycle_id, cycle.cycle_id);
  assert.equal(entry.world.id, terra.id);
  assert.equal(entry.world.name, terra.name);
  assert.deepEqual(entry.turn, { mode: 'writing', work: 'The fire held the room through the long hours.', response: 'Received.' });
  assert.equal(entry.enqueued_at, at);
  assert.equal(entry.enqueued_by, 'Rowan');
  assert.equal(entry.reviewed_at, null);
  assert.equal(entry.reviewed_by, null);
  assert.equal(entry.review_receipt_id, null);
  assert.equal(entry.exploration, false);
  assert.ok(entry.derived && Number.isFinite(entry.derived.H), 'derived channels must be present');

  // Queue has one receipt
  assert.equal(queue.receipts.length, 1);
  assert.equal(queue.receipts[0].schema, FEEDBACK_QUEUE_RECEIPT_SCHEMA);
  assert.equal(queue.receipts[0].action, 'enqueue');
  assert.equal(queue.receipts[0].world_id, terra.id);
  assert.equal(queue.updated_at, at);
});

// ---------- 4. Idempotent enqueue ----------
test('idempotent enqueue: enqueueing the same cycle_id twice does not duplicate', async () => {
  const cycle = await makeCycle();
  const { queue: q1 } = enqueueFeedbackCycle(null, cycle);
  const { queue: q2, enqueued, idempotent } = enqueueFeedbackCycle(q1, cycle);

  assert.equal(enqueued, false);
  assert.equal(idempotent, true);
  assert.equal(Object.keys(q2.entries).length, 1, 'only one entry after double enqueue');
  assert.equal(q2.receipts.length, 1, 'only one receipt after idempotent enqueue');
});

// ---------- 5. Accept ----------
test('accept: pending cycle transitions to accepted with review metadata', async () => {
  const cycle = await makeCycle();
  const { queue: q1 } = enqueueFeedbackCycle(null, cycle, { clock: fixedClock('2026-08-12T01:00:00.000Z') });

  const reviewAt = '2026-08-12T02:00:00.000Z';
  const { queue: q2, entry, reviewed } = acceptFeedbackCycle(q1, cycle.cycle_id, {
    acceptedBy: 'Rowan',
    clock: fixedClock(reviewAt),
  });

  assert.equal(reviewed, true);
  assert.equal(entry.status, 'accepted');
  assert.equal(entry.reviewed_at, reviewAt);
  assert.equal(entry.reviewed_by, 'Rowan');
  assert.ok(typeof entry.review_receipt_id === 'string' && entry.review_receipt_id.length > 0);

  // Two receipts: enqueue + accept
  assert.equal(q2.receipts.length, 2);
  const acceptReceipt = q2.receipts.find((r) => r.action === 'accepted');
  assert.ok(acceptReceipt, 'accept receipt must be present');
  assert.equal(acceptReceipt.schema, FEEDBACK_QUEUE_RECEIPT_SCHEMA);
  assert.equal(acceptReceipt.reviewed_at, reviewAt);
});

// ---------- 6. Archive ----------
test('archive: pending cycle transitions to archived', async () => {
  const cycle = await makeCycle();
  const { queue: q1 } = enqueueFeedbackCycle(null, cycle);

  const { entry, reviewed } = archiveFeedbackCycle(q1, cycle.cycle_id, { archivedBy: 'Rowan' });
  assert.equal(reviewed, true);
  assert.equal(entry.status, 'archived');
  assert.equal(entry.reviewed_by, 'Rowan');
});

// ---------- 7. Discard ----------
test('discard: pending cycle transitions to discarded', async () => {
  const cycle = await makeCycle();
  const { queue: q1 } = enqueueFeedbackCycle(null, cycle);

  const { entry, reviewed } = discardFeedbackCycle(q1, cycle.cycle_id, { discardedBy: 'Rowan' });
  assert.equal(reviewed, true);
  assert.equal(entry.status, 'discarded');
});

// ---------- 8. Review idempotency ----------
test('review idempotency: reviewing an already-reviewed cycle returns unchanged entry', async () => {
  const cycle = await makeCycle();
  const { queue: q1 } = enqueueFeedbackCycle(null, cycle);
  const { queue: q2 } = acceptFeedbackCycle(q1, cycle.cycle_id, { acceptedBy: 'Rowan' });

  // Try to accept again
  const { reviewed, idempotent, entry } = acceptFeedbackCycle(q2, cycle.cycle_id, { acceptedBy: 'Rowan' });
  assert.equal(reviewed, false);
  assert.equal(idempotent, true);
  assert.equal(entry.status, 'accepted', 'status must remain accepted');

  // Try to discard an already-accepted cycle
  const { reviewed: reviewed2, idempotent: idempotent2 } = discardFeedbackCycle(q2, cycle.cycle_id);
  assert.equal(reviewed2, false);
  assert.equal(idempotent2, true);

  // Receipt count must not grow from idempotent actions
  assert.equal(q2.receipts.length, 2, 'receipt count must not increase on idempotent review');
});

// ---------- 9. Missing entry throws ----------
test('missing entry: reviewing unknown cycle_id throws FeedbackCycleQueueError', () => {
  const queue = createEmptyFeedbackQueue();
  assert.throws(
    () => acceptFeedbackCycle(queue, 'arcsweep-cycle-nonexistent'),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'entry-not-found',
    'must throw FeedbackCycleQueueError with code entry-not-found',
  );
});

// ---------- 10. pendingCycles ----------
test('pendingCycles: returns only pending entries, in enqueue order', async () => {
  const [c1, c2, c3] = await Promise.all([
    makeCycle({ work: 'First turn.' }),
    makeCycle({ work: 'Second turn, a little longer to disambiguate.' }),
    makeCycle({ work: 'Third turn, longest one to ensure distinct fingerprint in the queue.' }),
  ]);

  let { queue } = enqueueFeedbackCycle(null, c1, { clock: fixedClock('2026-08-12T01:00:00.000Z') });
  queue = enqueueFeedbackCycle(queue, c2, { clock: fixedClock('2026-08-12T01:01:00.000Z') }).queue;
  queue = enqueueFeedbackCycle(queue, c3, { clock: fixedClock('2026-08-12T01:02:00.000Z') }).queue;

  // Accept c2
  queue = acceptFeedbackCycle(queue, c2.cycle_id, { acceptedBy: 'Rowan' }).queue;

  const pending = pendingCycles(queue);
  assert.equal(pending.length, 2);
  assert.ok(pending.every((e) => e.status === 'pending_review'));
  assert.equal(pending[0].cycle_id, c1.cycle_id, 'oldest pending must be first');
  assert.equal(pending[1].cycle_id, c3.cycle_id);
});

// ---------- 11. acceptedCycles ----------
test('acceptedCycles: returns only accepted entries', async () => {
  const [c1, c2] = await Promise.all([
    makeCycle({ work: 'First turn, for acceptance check.' }),
    makeCycle({ work: 'Second turn, for acceptance check, kept pending.' }),
  ]);

  let { queue } = enqueueFeedbackCycle(null, c1, { clock: fixedClock('2026-08-12T01:00:00.000Z') });
  queue = enqueueFeedbackCycle(queue, c2, { clock: fixedClock('2026-08-12T01:01:00.000Z') }).queue;
  queue = acceptFeedbackCycle(queue, c1.cycle_id, {
    acceptedBy: 'Rowan',
    clock: fixedClock('2026-08-12T02:00:00.000Z'),
  }).queue;

  const accepted = acceptedCycles(queue);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].cycle_id, c1.cycle_id);
  assert.equal(accepted[0].status, 'accepted');
});

// ---------- 12. feedbackQueueSummary ----------
test('feedbackQueueSummary: counts match actual entry statuses', async () => {
  const [c1, c2, c3, c4] = await Promise.all([
    makeCycle({ work: 'Summary turn one, for pending.' }),
    makeCycle({ work: 'Summary turn two, for acceptance.' }),
    makeCycle({ work: 'Summary turn three, for archive.' }),
    makeCycle({ work: 'Summary turn four, for discard.' }),
  ]);

  let { queue } = enqueueFeedbackCycle(null, c1);
  queue = enqueueFeedbackCycle(queue, c2).queue;
  queue = enqueueFeedbackCycle(queue, c3).queue;
  queue = enqueueFeedbackCycle(queue, c4).queue;
  queue = acceptFeedbackCycle(queue, c2.cycle_id).queue;
  queue = archiveFeedbackCycle(queue, c3.cycle_id).queue;
  queue = discardFeedbackCycle(queue, c4.cycle_id).queue;

  const summary = feedbackQueueSummary(queue);
  assert.equal(summary.total, 4);
  assert.equal(summary.pending, 1);
  assert.equal(summary.accepted, 1);
  assert.equal(summary.archived, 1);
  assert.equal(summary.discarded, 1);
  assert.ok(summary.worlds.includes(terra.id));
  assert.ok(summary.receipt_count >= 7, 'four enqueues + three reviews = seven receipts minimum');
});

// ---------- 13. Schema validation ----------
test('schema validation: wrong schema or missing fields throw FeedbackCycleQueueError', async () => {
  const cycle = await makeCycle();

  // Wrong schema
  assert.throws(
    () => enqueueFeedbackCycle(null, { ...cycle, schema: 'wrong/schema' }),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'unsupported-cycle-schema',
  );

  // Missing schema entirely
  assert.throws(
    () => enqueueFeedbackCycle(null, { cycle_id: 'x', world: { id: 'a', name: 'A' } }),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'unsupported-cycle-schema',
  );

  // Missing cycle_id
  assert.throws(
    () => enqueueFeedbackCycle(null, { schema: FEEDBACK_CYCLE_SCHEMA, world: { id: 'a', name: 'A' } }),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'invalid-cycle-id',
  );

  // Missing world
  assert.throws(
    () => enqueueFeedbackCycle(null, { schema: FEEDBACK_CYCLE_SCHEMA, cycle_id: 'arcsweep-cycle-x' }),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'invalid-cycle-world',
  );

  // Not an object
  assert.throws(
    () => enqueueFeedbackCycle(null, null),
    (err) => err instanceof FeedbackCycleQueueError && err.code === 'invalid-cycle',
  );
});

// ---------- 14. Exploration flag preserved ----------
test('exploration flag: exploration cycles are enqueued with exploration: true', async () => {
  const exploreCycle = await makeCycle({ exploration: true });
  assert.equal(exploreCycle.exploration, true);
  assert.equal(exploreCycle.authority.steward_review_required, false);

  const { entry } = enqueueFeedbackCycle(null, exploreCycle);
  assert.equal(entry.exploration, true);
  assert.equal(entry.authority.steward_review_required, false);
});

// ---------- 15. Receipt trail completeness ----------
test('receipt trail: every action produces a receipt with correct schema and action field', async () => {
  const cycle = await makeCycle();
  let { queue } = enqueueFeedbackCycle(null, cycle, { clock: fixedClock('2026-08-12T01:00:00.000Z') });
  queue = acceptFeedbackCycle(queue, cycle.cycle_id, { clock: fixedClock('2026-08-12T02:00:00.000Z') }).queue;

  for (const receipt of queue.receipts) {
    assert.equal(receipt.schema, FEEDBACK_QUEUE_RECEIPT_SCHEMA, 'all receipts must carry queue receipt schema');
    assert.ok(typeof receipt.receipt_id === 'string' && receipt.receipt_id.length > 0, 'receipt_id must be non-empty');
    assert.ok(['enqueue', 'accepted', 'archived', 'discarded'].includes(receipt.action), `unexpected action: ${receipt.action}`);
  }

  const actions = queue.receipts.map((r) => r.action);
  assert.deepEqual(actions, ['enqueue', 'accepted'], 'receipt actions must appear in order');
});
