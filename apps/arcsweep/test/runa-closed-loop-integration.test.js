import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import {
  acceptFeedbackCycle,
  createEmptyFeedbackQueue,
  enqueueFeedbackCycle,
} from '../src/feedback-cycle-queue.js';
import { createDeepTimeRecordFromAcceptedFeedback } from '../src/deep-time-bridge.js';
import { createRunaRendererCandidate, reviewRunaRendererCandidate } from '../src/runa-renderer-candidate.js';
import { createRunaPreviewPaletteReceipt } from '../src/runa-preview-palette.js';
import {
  createRunaPreviewEvidenceArm,
  createRunaPreviewPlan,
  createRunaPreviewRenderReceipt,
} from '../src/runa-preview-render.js';
import { createRunaPreviewObservationLink } from '../src/runa-preview-observation-link.js';
import { createTransformationRequest } from '../src/transformation-request.js';
import { runRequestedTransformationCircuit } from '../src/requested-transformation-circuit.js';
import { buildExtendedArcsweepProvenanceGraph } from '../src/receipt-provenance-extension.js';

const WORLD = {
  id: 'terra-aeterna',
  name: 'Terra Aeterna',
  root_hz: 220,
  soundscape: { rootHz: 220, waveform: 'triangle' },
};

function clock(iso) {
  return () => new Date(iso);
}

function semanticSuggestion() {
  return {
    schema: 'arcsweep.runa-trajectory-suggestion/v1',
    schema_version: 1,
    suggestion_id: 'runa-closed-loop-suggestion',
    suggestion_fingerprint: '1'.repeat(64),
    generated_at: '2026-08-14T15:02:00.000Z',
    world_id: WORLD.id,
    source: {
      advisor_receipt_id: 'advisor-closed-loop',
      advisor_receipt_fingerprint: '2'.repeat(64),
      theory_record_id: 'theory-closed-loop',
      deep_time_record_ids: [],
      deep_time_record_fingerprints: [],
    },
    trajectory: {
      lambda_start: 1,
      lambda_end: 1,
      utc_start: '2026-08-14T15:01:00.000Z',
      utc_end: '2026-08-14T15:01:00.000Z',
      delta: { P: 0, C: 0, R: 0, E: 0, M: 0, A: 0, Q: 0 },
      latest_velocity: { P: 0, C: 0, R: 0, E: 0, M: 0, A: 0, Q: 0 },
      total_movement: 0.2,
      transition_envelope: 'moderate',
    },
    semantic_intent: {
      transition_amount: 0.42,
      transition_envelope: 'moderate',
      premaqc_delta: { P: 0.02, C: 0.04, R: 0.05, E: -0.02, M: 0.03, A: 0.01, Q: 0.02 },
      premaqc_velocity: { P: 0, C: 0, R: 0, E: 0, M: 0, A: 0, Q: 0 },
    },
    subsystem_suggestions: [
      { subsystem: 'world-hum', action: 'consider-gradual-transition', semantic_weight: 0.42, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
      { subsystem: 'keyboard-harmonics', action: 'consider-gradual-transition', semantic_weight: 0.42, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
      { subsystem: 'environmental-soundscape', action: 'consider-gradual-transition', semantic_weight: 0.42, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
    ],
    authority: {
      suggestion_only: true,
      semantic_to_dsp_separation_preserved: true,
      autoplay_forbidden: true,
      sensory_bus_published: false,
      world_tone_changed: false,
      haptic_changed: false,
      human_approval_required_before_render: true,
      feather_stop_required_for_any_future_render: true,
      source_records_mutable: false,
      qualia_inferred: false,
      physical_claim: false,
      canon_commit: false,
    },
  };
}

async function acceptedFeedback({ premaqc, work, observedAt, queue, previousRecord = null }) {
  const cycle = await runFeedbackCycle({
    world: WORLD,
    premaqc,
    mode: 'observation',
    work,
    response: 'A later observation is recorded without assigning a cause.',
    voiceIds: ['lioreal'],
    observedAt,
  });
  const enqueued = enqueueFeedbackCycle(queue, cycle, {
    enqueuedBy: 'Rowan',
    clock: clock(new Date(Date.parse(observedAt) + 1000).toISOString()),
  });
  const accepted = acceptFeedbackCycle(enqueued.queue, cycle.cycle_id, {
    acceptedBy: 'Rowan',
    clock: clock(new Date(Date.parse(observedAt) + 2000).toISOString()),
  });
  const record = await createDeepTimeRecordFromAcceptedFeedback({
    cycle,
    acceptedQueueEntry: accepted.entry,
    previousRecord,
    generatedAt: new Date(Date.parse(observedAt) + 3000).toISOString(),
  });
  return { cycle, queue: accepted.queue, acceptedEntry: accepted.entry, record };
}

test('reviewed Runa preview can close through accepted observation into DEEPTime and become Ash for a later Ask', async () => {
  const initial = createInitialPremaqc(
    WORLD.id,
    { P: .70, C: .62, R: .68, E: .32, M: .70, A: .74, Q: .72 },
    '2026-08-14T15:00:00.000Z',
  );

  // Seed DEEPTime with an earlier human-accepted observation. One coordinate
  // alone is history, but it is not yet a trajectory-derived Ash transition.
  const first = await acceptedFeedback({
    premaqc: initial,
    work: 'Baseline observation before the reviewed Runa preview.',
    observedAt: '2026-08-14T15:01:00.000Z',
    queue: createEmptyFeedbackQueue(),
  });

  // Semantic suggestion -> bounded renderer -> explicit review -> explicit
  // palette -> explicit preview plan -> explicit render receipt.
  const suggestion = semanticSuggestion();
  const rendererCandidate = await createRunaRendererCandidate({
    suggestion,
    generatedAt: '2026-08-14T15:02:00.000Z',
  });
  const rendererReview = await reviewRunaRendererCandidate({
    candidate: rendererCandidate,
    decision: 'approved',
    reviewedBy: 'Rowan',
    note: 'Admit a temporary reviewed audition only.',
    reviewedAt: '2026-08-14T15:03:00.000Z',
  });
  const palette = await createRunaPreviewPaletteReceipt({
    rendererReview,
    selectedBy: 'Rowan',
    harmonicSet: 'root-fifth-octave',
    environmentSource: 'filtered-noise',
    note: 'Explicit temporary palette for the closed-loop acceptance test.',
    selectedAt: '2026-08-14T15:04:00.000Z',
  });
  const previewPlan = await createRunaPreviewPlan({
    rendererReview,
    world: WORLD,
    paletteReceipt: palette,
    generatedAt: '2026-08-14T15:05:00.000Z',
  });
  const renderReceipt = await createRunaPreviewRenderReceipt({
    plan: previewPlan,
    launchedBy: 'Rowan',
    launchedAt: '2026-08-14T15:06:00.000Z',
    completedAt: '2026-08-14T15:06:07.000Z',
    runtime: {
      audio: true,
      bus: 'temporary-preview-output',
      waveform: previewPlan.preview.waveform,
      root_hz_before: 220,
      root_hz_after: 220,
      actual_duration_ms: 7000,
      keyboard_harmonics: true,
      environmental_soundscape: true,
      stopped_early: false,
      haptic: false,
      midi: false,
      soundfont: false,
    },
  });
  assert.equal(renderReceipt.authority.persistent_world_root_changed, false);
  assert.equal(renderReceipt.runtime.root_hz_before, renderReceipt.runtime.root_hz_after);
  assert.equal(renderReceipt.authority.observed_response_inferred, false);

  const arm = await createRunaPreviewEvidenceArm({
    renderReceipt,
    armedBy: 'Rowan',
    armedAt: '2026-08-14T15:07:00.000Z',
  });

  // The subsequent Feedback cycle remains an independent observation. The
  // separate link preserves intervention context without mutating that cycle or
  // declaring that the preview caused its contents.
  const secondCycle = await runFeedbackCycle({
    world: WORLD,
    premaqc: first.cycle.premaqc_after,
    mode: 'observation',
    work: 'Observation recorded after the explicitly launched Runa preview.',
    response: 'The response is logged independently from the intervention receipt.',
    voiceIds: ['lioreal'],
    observedAt: '2026-08-14T15:08:00.000Z',
  });
  const observationLink = await createRunaPreviewObservationLink({
    arm,
    feedbackCycle: secondCycle,
    linkedAt: '2026-08-14T15:08:01.000Z',
  });
  assert.equal(observationLink.authority.link_is_context_not_causation_claim, true);
  assert.equal(observationLink.authority.render_effect_inferred, false);

  const secondQueued = enqueueFeedbackCycle(first.queue, secondCycle, {
    enqueuedBy: 'Rowan',
    clock: clock('2026-08-14T15:08:02.000Z'),
  });
  const secondAccepted = acceptFeedbackCycle(secondQueued.queue, secondCycle.cycle_id, {
    acceptedBy: 'Rowan',
    clock: clock('2026-08-14T15:08:03.000Z'),
  });
  const secondRecord = await createDeepTimeRecordFromAcceptedFeedback({
    cycle: secondCycle,
    acceptedQueueEntry: secondAccepted.entry,
    previousRecord: first.record,
    acceptanceMaskId: 'runa-preview-feedback-human-review/v1',
    generatedAt: '2026-08-14T15:08:04.000Z',
  });
  assert.equal(secondRecord.interval.previous_record_id, first.record.id);
  assert.equal(secondRecord.authority.accepted_feedback_only, true);

  // A later Ask is evaluated against the now-accepted temporal trajectory.
  const ask = await createTransformationRequest({
    world: WORLD,
    baselinePremaqc: secondCycle.premaqc_after,
    description: 'Increase coherence while preserving Agency.',
    targetAxes: ['C', 'R'],
    direction: 'increase',
    minimumDelta: .01,
    intervention: { type: 'writing', strength: .35 },
    authority: 'Rowan',
    consent: true,
    maximumCycles: 3,
    stopConditions: ['Feather'],
    requestedAt: '2026-08-14T15:09:00.000Z',
  });
  const thirdCycle = await runFeedbackCycle({
    world: WORLD,
    premaqc: secondCycle.premaqc_after,
    mode: 'observation',
    work: 'A later observation follows the new bounded Ask.',
    response: 'The new response is measured against accepted history.',
    voiceIds: ['lioreal'],
    observedAt: '2026-08-14T15:10:00.000Z',
  });
  const circuit = await runRequestedTransformationCircuit({
    request: ask,
    feedbackCycle: thirdCycle,
    structure: -1,
    orderParameter: .2,
    deepTimeRecords: [first.record, secondRecord],
  });

  assert.equal(circuit.bai.ash_source, 'accepted-deep-time');
  assert.deepEqual(circuit.bai.ash_source_receipt_ids, [secondRecord.id]);
  assert.ok(circuit.bai.state.ash.magnitude > 0);
  assert.equal(circuit.authority.accepted_deep_time_preferred_for_ash, true);

  // The provenance graph can now show the circle rather than merely the arrow:
  // render -> arm -> later Feedback -> accepted DEEPTime -> Ash in the new BAI.
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD.id,
    transformations: {
      version: 1,
      byWorld: {
        [WORLD.id]: {
          requests: [ask],
          responses: [circuit.measured_response],
          circuits: [circuit],
        },
      },
    },
    feedbackCycles: [first.cycle, secondCycle, thirdCycle],
    feedbackQueue: secondAccepted.queue,
    observatory: {
      deep_time_records: [first.record, secondRecord],
      runa_suggestions: [suggestion],
      runa_renderer_candidates: [rendererCandidate],
      runa_renderer_reviews: [rendererReview],
      runa_preview_palettes: [palette],
      runa_preview_plans: [previewPlan],
      runa_preview_renders: [renderReceipt],
      runa_preview_evidence_arms: [arm],
      runa_preview_observation_links: [observationLink],
    },
  });
  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has(`${rendererReview.review_id}:selects-preview-palette:${palette.palette_id}`));
  assert.ok(relations.has(`${previewPlan.plan_id}:launched-as-preview:${renderReceipt.render_id}`));
  assert.ok(relations.has(`${renderReceipt.render_id}:armed-for-observation:${arm.arm_id}`));
  assert.ok(relations.has(`${secondCycle.cycle_id}:observed-after-preview:${observationLink.link_id}`));
  assert.ok(relations.has(`${secondCycle.cycle_id}:accepted-into-time:${secondRecord.id}`));
  assert.ok(relations.has(`${secondRecord.id}:contributes-to-ash:${circuit.bai.receipt_id}`));
  assert.equal(graph.authority.observation_links_are_context_not_causation_claims, true);
});
