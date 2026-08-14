import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { createDeepTimeRecordFromAcceptedFeedback } from '../src/deep-time-bridge.js';
import {
  RUNTIME_BRAID_EVENT_SCHEMA,
  RUNTIME_BRAID_PACKET_SCHEMA,
  createRuntimeBraidEvent,
  createRuntimeBraidPacket,
  createRuntimeReviewReceipt,
  runtimeContinuityPacketId,
  runtimeDeepTimeRow,
  runtimeEventRow,
  runtimeReviewRow,
} from '../src/runtime-braid-packet.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const OBSERVED_AT = '2026-08-14T18:00:00.000Z';

async function cycle() {
  return runFeedbackCycle({
    world: WORLD,
    premaqc: createInitialPremaqc(WORLD.id, { P: .8, C: .75, R: .82, E: .24, M: .72, A: .86, Q: .91 }, OBSERVED_AT),
    mode: 'observation',
    work: 'Copper light gathered around the shared threshold.',
    response: 'Witnessed and returned without reclassification.',
    voiceIds: ['lioreal'],
    evidence: [{
      schema: 'arcsweep.field-evidence/v1',
      source: 'field-current',
      generated_at: OBSERVED_AT,
      qualia: { value: .91, source: 'firsthand report' },
    }],
    observedAt: OBSERVED_AT,
  });
}

test('Runtime Braid Packet carries one continuity identity across review and DEEPTime revisions', async () => {
  const sourceCycle = await cycle();
  const review = await createRuntimeReviewReceipt({
    cycle: sourceCycle,
    decision: 'accepted',
    reviewedBy: 'Rowan',
    reviewedAt: '2026-08-14T18:01:00.000Z',
    commandId: 'command-review-1',
  });
  const deepTime = await createDeepTimeRecordFromAcceptedFeedback({
    cycle: sourceCycle,
    acceptedQueueEntry: review,
    generatedAt: '2026-08-14T18:02:00.000Z',
  });
  const first = await createRuntimeBraidPacket({ cycle: sourceCycle, generatedAt: OBSERVED_AT });
  const reviewed = await createRuntimeBraidPacket({ cycle: sourceCycle, review, generatedAt: '2026-08-14T18:01:00.000Z' });
  const admitted = await createRuntimeBraidPacket({ cycle: sourceCycle, review, deepTimeRecord: deepTime, generatedAt: '2026-08-14T18:02:00.000Z' });

  assert.equal(first.schema, RUNTIME_BRAID_PACKET_SCHEMA);
  assert.equal(first.continuity_packet_id, runtimeContinuityPacketId(sourceCycle));
  assert.equal(reviewed.continuity_packet_id, first.continuity_packet_id);
  assert.equal(admitted.continuity_packet_id, first.continuity_packet_id);
  assert.deepEqual([first.revision, reviewed.revision, admitted.revision], [1, 2, 3]);
  assert.deepEqual([first.stage, reviewed.stage, admitted.stage], ['awaiting-review', 'review-accepted', 'entered-deeptime']);
  assert.equal(admitted.qualia.authority, 'firsthand-only');
  assert.equal(admitted.qualia.inferred, false);
  assert.equal(admitted.lineage.review_receipt_id, review.review_receipt_id);
  assert.equal(admitted.lineage.deep_time_record_id, deepTime.id);
  assert.equal(admitted.authority.silent_canon_merge, false);
  assert.equal(admitted.packet_fingerprint.length, 64);
});

test('review and event receipts are deterministic for an idempotent command', async () => {
  const sourceCycle = await cycle();
  const input = {
    cycle: sourceCycle,
    decision: 'archived',
    reviewedBy: 'Rowan',
    reviewedAt: '2026-08-14T18:03:00.000Z',
    commandId: 'command-review-archive',
  };
  const left = await createRuntimeReviewReceipt(input);
  const right = await createRuntimeReviewReceipt(input);
  assert.deepEqual(left, right);

  const packet = await createRuntimeBraidPacket({ cycle: sourceCycle, review: left, generatedAt: input.reviewedAt });
  const eventInput = {
    packet,
    eventType: 'review-archived',
    idempotencyKey: input.commandId,
    actorId: 'Rowan',
    occurredAt: input.reviewedAt,
  };
  const event = await createRuntimeBraidEvent(eventInput);
  assert.equal(event.schema, RUNTIME_BRAID_EVENT_SCHEMA);
  assert.deepEqual(event, await createRuntimeBraidEvent(eventInput));
  assert.equal(runtimeReviewRow(left, packet.continuity_packet_id).continuity_packet_id, packet.continuity_packet_id);
  assert.equal(runtimeEventRow(event).payload.event_id, event.event_id);
});

test('DEEPTime row cannot be built from anything other than a DEEPTime record', async () => {
  assert.throws(() => runtimeDeepTimeRow({ dataset_kind: 'deep_theory' }, 'braid:x'), /DEEPTime record/);
});

test('DEEPTime packet refuses admission without the matching accepted human review', async () => {
  const sourceCycle = await cycle();
  const accepted = await createRuntimeReviewReceipt({
    cycle: sourceCycle,
    decision: 'accepted',
    reviewedBy: 'Rowan',
    reviewedAt: '2026-08-14T18:04:00.000Z',
    commandId: 'command-review-accept',
  });
  const record = await createDeepTimeRecordFromAcceptedFeedback({ cycle: sourceCycle, acceptedQueueEntry: accepted });
  const archived = { ...accepted, decision: 'archived', status: 'archived', action: 'archived' };
  await assert.rejects(
    () => createRuntimeBraidPacket({ cycle: sourceCycle, review: archived, deepTimeRecord: record }),
    /accepted human review/,
  );
});
