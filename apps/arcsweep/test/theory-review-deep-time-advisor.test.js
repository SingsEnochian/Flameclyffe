import assert from 'node:assert/strict';
import test from 'node:test';

import { runBidirectionalDomainSweep } from '../src/domain-control-bench.js';
import { createDeepTheoryCandidateFromDomainSweep } from '../src/deep-theory-bridge.js';
import { reviewDeepTheoryCandidate } from '../src/deep-theory-review.js';
import { createDeepTimeRecordFromAcceptedFeedback, buildDeepTimeWindow } from '../src/deep-time-bridge.js';
import { createTheoryGroundedAcceptanceAdvice } from '../src/theory-grounded-acceptance-advisor.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];

function premaq(sequence, value, observedAt) {
  return {
    schema_version: '2.0.0',
    id: `premaq-${sequence}`,
    receipt_id: `premaq-receipt-${sequence}`,
    sequence,
    observed_at: observedAt,
    state: Object.fromEntries(AXES.map((axis, index) => [axis, {
      value: Math.min(1, Math.max(0, value + index * 0.005)),
      confidence: 0.9,
      uncertainty: 0.05,
    }])),
  };
}

function cycle(sequence, value, utc) {
  return {
    schema: 'arcsweep.feedback-cycle/v1',
    cycle_id: `cycle-${sequence}`,
    cycle_fingerprint: String(sequence).padStart(64, 'a').slice(-64),
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    premaqc_after: premaq(sequence, value, utc),
    math_spine_packet: { packet_fingerprint: String(sequence).padStart(64, 'b').slice(-64) },
    created_at: utc,
  };
}

function acceptedEntry(sequence) {
  return {
    cycle_id: `cycle-${sequence}`,
    status: 'accepted',
    review_receipt_id: `feedback-review-${sequence}`,
    reviewed_at: `2026-08-14T10:0${sequence}:00.000Z`,
  };
}

async function acceptedTheory(domain = 'arcsweep-feedback') {
  const sweep = await runBidirectionalDomainSweep({
    profile: {
      profile_id: `test-${domain}`,
      name: 'Test topology',
      domain,
      control_semantics: {
        a: { role: 'structure', label: 'Structure', source: 'test', intentional: false },
        b: { role: 'forcing', label: 'Forcing', source: 'test', intentional: false },
      },
      ranges: { a: { minimum: -2, maximum: 0.2, default: -1 }, b: { minimum: -0.5, maximum: 0.5, default: 0 } },
      order_parameter: 1,
      calibration: { state: 'model-calibrated', note: 'test' },
    },
    sweptControl: 'b',
    start: -0.4,
    end: 0.4,
    steps: 21,
    fixedControl: -1,
    generatedAt: '2026-08-14T10:00:00.000Z',
  });
  const candidate = await createDeepTheoryCandidateFromDomainSweep({ sweep, generatedAt: '2026-08-14T10:01:00.000Z' });
  const review = await reviewDeepTheoryCandidate({ candidate, decision: 'accepted', reviewedBy: 'Rowan', note: 'Accepted for analytical use.', reviewedAt: '2026-08-14T10:02:00.000Z' });
  return { candidate, review };
}

test('DEEPTheory acceptance preserves candidate immutability and does not assert physics or canon', async () => {
  const { candidate, review } = await acceptedTheory();
  assert.equal(candidate.record.status, 'candidate');
  assert.equal(review.reviewed_record.status, 'accepted');
  assert.equal(review.authority.source_candidate_mutable, false);
  assert.equal(review.reviewed_record.authority.physical_claim, false);
  assert.equal(review.reviewed_record.authority.canon_commit, false);
});

test('DEEPTime admits only human-accepted feedback and preserves Qualia Q separately from data quality', async () => {
  await assert.rejects(() => createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(2, 0.7, '2026-08-14T10:02:00.000Z'), acceptedQueueEntry: { ...acceptedEntry(2), status: 'pending_review' } }), /human-accepted/i);
  const first = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(2, 0.70, '2026-08-14T10:02:00.000Z'), acceptedQueueEntry: acceptedEntry(2) });
  const second = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(3, 0.74, '2026-08-14T10:03:00.000Z'), acceptedQueueEntry: acceptedEntry(3), previousRecord: first });
  assert.ok(second.lambda > first.lambda);
  assert.equal(second.authority.qualia_is_premaqc_q, true);
  assert.equal(Object.prototype.hasOwnProperty.call(second.quality, 'Q'), false);
  assert.ok(second.derivatives.axis_velocity.P > 0);
});

test('Theory-Grounded Advisor refuses cross-domain application and never auto-accepts', async () => {
  const { review } = await acceptedTheory('requested-transformation');
  const r1 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(2, 0.70, '2026-08-14T10:02:00.000Z'), acceptedQueueEntry: acceptedEntry(2) });
  const r2 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(3, 0.73, '2026-08-14T10:03:00.000Z'), acceptedQueueEntry: acceptedEntry(3), previousRecord: r1 });
  const r3 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(4, 0.77, '2026-08-14T10:04:00.000Z'), acceptedQueueEntry: acceptedEntry(4), previousRecord: r2 });
  const advice = await createTheoryGroundedAcceptanceAdvice({ theoryReviewReceipt: review, deepTimeRecords: [r1, r2, r3], contextDomain: 'arcsweep-feedback' });
  assert.equal(advice.recommendation.status, 'DOMAIN_MISMATCH');
  assert.equal(advice.recommendation.auto_accept, false);
});

test('accepted same-domain theory plus sufficient DEEPTime yields review gate, not acceptance', async () => {
  const { review } = await acceptedTheory('arcsweep-feedback');
  const r1 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(2, 0.70, '2026-08-14T10:02:00.000Z'), acceptedQueueEntry: acceptedEntry(2) });
  const r2 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(3, 0.74, '2026-08-14T10:03:00.000Z'), acceptedQueueEntry: acceptedEntry(3), previousRecord: r1 });
  const r3 = await createDeepTimeRecordFromAcceptedFeedback({ cycle: cycle(4, 0.79, '2026-08-14T10:04:00.000Z'), acceptedQueueEntry: acceptedEntry(4), previousRecord: r2 });
  assert.equal(buildDeepTimeWindow([r1, r2, r3]).sufficient, true);
  const advice = await createTheoryGroundedAcceptanceAdvice({ theoryReviewReceipt: review, deepTimeRecords: [r1, r2, r3], contextDomain: 'arcsweep-feedback' });
  assert.equal(advice.recommendation.status, 'REVIEW_ACCEPTANCE_GATE');
  assert.equal(advice.recommendation.human_review_required, true);
  assert.equal(advice.authority.accepts_state_automatically, false);
});
