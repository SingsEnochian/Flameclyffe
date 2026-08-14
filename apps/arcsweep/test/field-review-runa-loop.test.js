import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { createEmptyFeedbackQueue } from '../src/feedback-cycle-queue.js';
import { enqueueUnreviewedFieldCycles, reviewFieldCycle } from '../src/field-review-admission.js';
import { createDeepTimeRecordFromAcceptedFeedback } from '../src/deep-time-bridge.js';
import { createRunaPreviewObservationLink, findNextReviewableCycleForEvidenceArm } from '../src/runa-preview-observation-link.js';
import { deriveRunaInterventionArc } from '../src/runa-intervention-arc.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna' };

async function fieldCycle(observedAt = '2026-08-14T16:30:00.000Z') {
  const premaqc = createInitialPremaqc(
    WORLD.id,
    { P: .72, C: .66, R: .70, E: .30, M: .68, A: .78, Q: .74 },
    '2026-08-14T16:29:00.000Z',
  );
  return runFeedbackCycle({
    world: WORLD,
    premaqc,
    mode: 'observation',
    work: 'Field observation after an explicitly armed preview.',
    response: 'Recorded without assigning cause.',
    voiceIds: ['lioreal'],
    evidence: [{
      schema: 'arcsweep.field-evidence/v1',
      source: 'observer-bridge',
      generated_at: observedAt,
      projected_axes: { P: .72, C: .66, R: .70, E: .30, M: .68, A: .78 },
      qualia: { value: .74, source: 'firsthand report' },
    }],
    observedAt,
  });
}

test('Field cycles enter the shared review gate without automatic acceptance', async () => {
  const cycle = await fieldCycle();
  const result = enqueueUnreviewedFieldCycles({
    queue: createEmptyFeedbackQueue(),
    feedbackCycles: [cycle],
    clock: () => new Date('2026-08-14T16:30:01.000Z'),
  });
  assert.equal(result.changed, true);
  assert.equal(result.admitted.length, 1);
  assert.equal(result.admitted[0].observation_source, 'field');
  assert.equal(result.admitted[0].status, 'pending_review');
  assert.equal(result.authority.automatic_acceptance, false);
  assert.equal(result.admitted[0].evidence_refs[0].schema, 'arcsweep.field-evidence/v1');
});

test('an armed Runa preview can bind to the next queued Field observation', async () => {
  const cycle = await fieldCycle('2026-08-14T16:32:00.000Z');
  const arm = {
    schema: 'arcsweep.runa-preview-evidence-arm/v1',
    arm_id: 'field-arm-1',
    arm_fingerprint: 'a'.repeat(64),
    armed_at: '2026-08-14T16:31:00.000Z',
    world_id: WORLD.id,
    source: {
      render_id: 'field-render-1',
      render_fingerprint: 'b'.repeat(64),
      plan_id: 'field-plan-1',
      suggestion_id: 'field-suggestion-1',
    },
  };
  const next = findNextReviewableCycleForEvidenceArm({ arm, feedbackCycles: [cycle], existingLinks: [] });
  assert.equal(next.cycle_id, cycle.cycle_id);
  const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: cycle, linkedAt: '2026-08-14T16:32:01.000Z' });
  assert.equal(link.source.observation_source, 'field');
  assert.equal(link.source.observation_cycle_id, cycle.cycle_id);
  assert.equal(link.source.feedback_cycle_id, cycle.cycle_id);
  assert.equal(link.observation.evidence_schemas[0], 'arcsweep.field-evidence/v1');
  assert.equal(link.authority.link_is_context_not_causation_claim, true);
});

test('accepted Field observation carries its source evidence into DEEPTime', async () => {
  const cycle = await fieldCycle('2026-08-14T16:34:00.000Z');
  const admitted = enqueueUnreviewedFieldCycles({
    queue: createEmptyFeedbackQueue(),
    feedbackCycles: [cycle],
    clock: () => new Date('2026-08-14T16:34:01.000Z'),
  });
  const accepted = reviewFieldCycle(admitted.queue, cycle.cycle_id, 'accepted', {
    reviewedBy: 'Rowan',
    clock: () => new Date('2026-08-14T16:34:02.000Z'),
  });
  const record = await createDeepTimeRecordFromAcceptedFeedback({
    cycle,
    acceptedQueueEntry: accepted.entry,
    acceptanceMaskId: 'field-human-review/v1',
    generatedAt: '2026-08-14T16:34:03.000Z',
  });
  assert.equal(record.provenance.observation_source, 'field');
  assert.deepEqual(record.provenance.observation_evidence_schemas, ['arcsweep.field-evidence/v1']);
  assert.equal(record.provenance.observation_evidence_hashes.length, 1);
  assert.equal(record.provenance.observation_evidence_hashes[0].length, 64);
  assert.equal(record.provenance.review_queue_schema, 'arcsweep.feedback-cycle-queue/v1');
  assert.equal(record.authority.field_observation_supported, true);
});

test('Runa intervention arc names the Field stage and keeps human review mandatory', async () => {
  const cycle = await fieldCycle('2026-08-14T16:36:00.000Z');
  const admitted = enqueueUnreviewedFieldCycles({
    queue: createEmptyFeedbackQueue(),
    feedbackCycles: [cycle],
    clock: () => new Date('2026-08-14T16:36:01.000Z'),
  });
  const arm = {
    schema: 'arcsweep.runa-preview-evidence-arm/v1',
    arm_id: 'field-arm-arc',
    arm_fingerprint: 'c'.repeat(64),
    armed_at: '2026-08-14T16:35:00.000Z',
    world_id: WORLD.id,
    source: { render_id: 'render-arc', render_fingerprint: 'd'.repeat(64), plan_id: 'plan-arc', suggestion_id: 'suggestion-arc' },
  };
  const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: cycle, linkedAt: '2026-08-14T16:36:02.000Z' });
  const arc = deriveRunaInterventionArc({
    worldId: WORLD.id,
    feedbackCycles: [cycle],
    feedbackQueue: admitted.queue,
    observatory: {
      runa_preview_evidence_arms: [arm],
      runa_preview_observation_links: [link],
    },
  });
  assert.equal(arc.observation_source, 'field');
  assert.equal(arc.stages.find((item) => item.id === 'feedback-observation').label, 'Field observation');
  assert.equal(arc.stages.find((item) => item.id === 'feedback-review').label, 'Human observation review');
  assert.equal(arc.authority.human_acceptance_required_before_deep_time, true);
});
