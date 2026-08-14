import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { acceptFeedbackCycle, enqueueFeedbackCycle } from '../src/feedback-cycle-queue.js';
import { buildRuntimeObservationLiveRead, buildRuntimeObservationSnapshot } from '../src/runtime-observation-snapshot.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const AT = '2026-08-14T17:00:00.000Z';

async function fieldCycle() {
  return runFeedbackCycle({
    world: WORLD,
    premaqc: createInitialPremaqc(WORLD.id, {}, AT),
    mode: 'observation',
    work: 'Lightning answered across the Waking World.',
    response: 'Observed without assigning cause.',
    voiceIds: ['boxfire'],
    evidence: [{ schema: 'arcsweep.field-evidence/v1', source: 'field-current', qualia: { value: .84, source: 'firsthand report' } }],
    observedAt: AT,
  });
}

test('canonical snapshot keeps Field source, pending review, provenance, and Qualia authority explicit', async () => {
  const cycle = await fieldCycle();
  const snapshot = buildRuntimeObservationSnapshot({ cycle: { ...cycle, payload: cycle, status: 'accepted' }, generatedAt: AT });
  assert.equal(snapshot.evidence.class, 'field');
  assert.equal(snapshot.review.status, 'pending_review');
  assert.equal(snapshot.continuity.status, 'awaiting-review');
  assert.equal(snapshot.evidence.qualia_authority, 'firsthand-only');
  assert.equal(snapshot.provenance.deterministic_replay_matched, true);
  assert.equal(snapshot.latest_receipt.receipt_id, cycle.cycle_id);
  assert.equal(snapshot.authority.canon_commit, false);
});

test('accepted review and matching DEEPTime record advance continuity without changing observation source', async () => {
  const cycle = await fieldCycle();
  const enqueued = enqueueFeedbackCycle(null, cycle, { clock: () => new Date('2026-08-14T17:01:00.000Z') });
  const accepted = acceptFeedbackCycle(enqueued.queue, cycle.cycle_id, { acceptedBy: 'Rowan', clock: () => new Date('2026-08-14T17:02:00.000Z') });
  const review = accepted.entry;
  const deepTime = {
    id: 'deep-time-field-1', dataset_kind: 'deep_time', schema_version: '0.1.0', world_id: WORLD.id,
    sequence_id: `arcsweep:${WORLD.id}:accepted-observation`, lambda: 2,
    time: { utc: '2026-08-14T17:03:00.000Z' }, interval: { previous_record_id: 'deep-time-field-0' },
    provenance: { observation_run_id: cycle.cycle_id, source_receipt_hashes: [cycle.cycle_fingerprint] },
    record_fingerprint: 'd'.repeat(64),
  };
  const snapshot = buildRuntimeObservationSnapshot({ cycle, review, deepTimeRecord: deepTime, generatedAt: AT });
  assert.equal(snapshot.review.status, 'accepted');
  assert.equal(snapshot.evidence.class, 'field');
  assert.equal(snapshot.continuity.status, 'entered-deeptime');
  assert.equal(snapshot.continuity.latest_record_id, deepTime.id);
  assert.equal(snapshot.latest_receipt.receipt_id, deepTime.id);
});

test('live read applies one snapshot shape, world filter, ordering, and shared counts', async () => {
  const field = await fieldCycle();
  const feedback = await runFeedbackCycle({
    world: { id: 'luna', name: 'Luna', root_hz: 432 },
    premaqc: createInitialPremaqc('luna', {}, '2026-08-14T18:00:00.000Z'),
    mode: 'writing', work: 'Eira crossed the Moonmere Gate.', response: 'The gate answered.', voiceIds: ['lioreal'],
    observedAt: '2026-08-14T18:00:00.000Z',
  });
  const live = buildRuntimeObservationLiveRead({ cycles: [field, feedback], worldId: WORLD.id, generatedAt: AT });
  assert.equal(live.snapshots.length, 1);
  assert.equal(live.snapshots[0].world.id, WORLD.id);
  assert.deepEqual(live.summary, { total: 1, pending_review: 1, accepted: 0, field: 1, in_deep_time: 0 });
  assert.equal(live.authority.surfaces_must_not_reclassify, true);
});
