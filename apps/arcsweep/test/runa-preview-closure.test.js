import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRunaPreviewEvidenceArm,
  createRunaPreviewPlan,
  createRunaPreviewRenderReceipt,
} from '../src/runa-preview-render.js';
import {
  createRunaPreviewObservationLink,
  findNextFeedbackCycleForEvidenceArm,
} from '../src/runa-preview-observation-link.js';
import { buildExtendedArcsweepProvenanceGraph } from '../src/receipt-provenance-extension.js';
import { verifyProvenanceGraph } from '../src/receipt-integrity.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', soundscape: { rootHz: 220, waveform: 'triangle' } };

function approvedRendererReview() {
  return {
    schema: 'arcsweep.runa-renderer-review/v1',
    schema_version: 1,
    review_id: 'renderer-review-1',
    review_fingerprint: 'a'.repeat(64),
    reviewed_at: '2026-08-14T15:00:00.000Z',
    reviewed_by: 'Rowan',
    decision: 'approved',
    source: {
      candidate_id: 'renderer-candidate-1',
      candidate_fingerprint: 'b'.repeat(64),
      suggestion_id: 'runa-suggestion-1',
      world_id: WORLD.id,
    },
    reviewed_candidate: {
      compiler: {
        parameters: {
          world_hum: { transition_ms: 7000, detune_limit_cents: 18, mix_delta_limit: 0.18 },
        },
      },
    },
    authority: {
      preview_compilation_allowed: true,
      render_authorized: false,
    },
  };
}

function feedbackCycle(id, createdAt) {
  return {
    schema: 'arcsweep.feedback-cycle/v1',
    cycle_id: id,
    cycle_fingerprint: 'c'.repeat(64),
    world: { id: WORLD.id, name: WORLD.name },
    turn: { mode: 'observation', work: 'Observed response after the explicit preview.', response: '' },
    premaqc_before: { receipt_id: 'pre-before' },
    premaqc_after: { receipt_id: 'pre-after' },
    authority: { steward_review_required: true },
    created_at: createdAt,
  };
}

test('approved renderer review compiles a bounded temporary preview without persistent tone authority', async () => {
  const plan = await createRunaPreviewPlan({ rendererReview: approvedRendererReview(), world: WORLD, generatedAt: '2026-08-14T15:01:00.000Z' });
  assert.equal(plan.schema, 'arcsweep.runa-preview-plan/v1');
  assert.equal(plan.preview.base_hz, 220);
  assert.ok(plan.preview.target_hz > 220);
  assert.ok(plan.preview.detune_cents <= 9);
  assert.equal(plan.preview.haptic, false);
  assert.equal(plan.authority.requires_explicit_user_launch, true);
  assert.equal(plan.authority.autoplay_authorized, false);
  assert.equal(plan.authority.persistent_world_root_mutable, false);
  assert.equal(plan.bounds.audition_within_candidate_bounds, true);
});

test('renderer review cannot silently skip approval into preview planning', async () => {
  const review = approvedRendererReview();
  review.decision = 'adjust';
  await assert.rejects(() => createRunaPreviewPlan({ rendererReview: review, world: WORLD }), /must be approved/i);
});

test('explicit preview render can be armed and deterministically paired with the next same-world Feedback cycle', async () => {
  const plan = await createRunaPreviewPlan({ rendererReview: approvedRendererReview(), world: WORLD, generatedAt: '2026-08-14T15:01:00.000Z' });
  const render = await createRunaPreviewRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    runtime: {
      audio: true,
      bus: 'temporary-preview-output',
      waveform: 'triangle',
      root_hz_before: 220,
      root_hz_after: 220,
      actual_duration_ms: 7000,
      started_at: '2026-08-14T15:02:00.000Z',
      completed_at: '2026-08-14T15:02:07.000Z',
      haptic: false,
      midi: false,
      soundfont: false,
    },
  });
  const arm = await createRunaPreviewEvidenceArm({ renderReceipt: render, armedBy: 'Rowan', armedAt: '2026-08-14T15:03:00.000Z' });
  const older = feedbackCycle('cycle-old', '2026-08-14T15:02:30.000Z');
  const next = feedbackCycle('cycle-next', '2026-08-14T15:04:00.000Z');
  const later = feedbackCycle('cycle-later', '2026-08-14T15:05:00.000Z');
  const matched = findNextFeedbackCycleForEvidenceArm({ arm, feedbackCycles: [later, older, next], existingLinks: [] });
  assert.equal(matched.cycle_id, 'cycle-next');
  const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: matched, linkedAt: '2026-08-14T15:04:01.000Z' });
  assert.equal(link.source.render_id, render.render_id);
  assert.equal(link.source.feedback_cycle_id, 'cycle-next');
  assert.equal(link.authority.link_is_context_not_causation_claim, true);
  assert.equal(link.authority.render_effect_inferred, false);
  assert.equal(findNextFeedbackCycleForEvidenceArm({ arm, feedbackCycles: [next], existingLinks: [link] }), null);
});

test('extended provenance joins preview plan, render, evidence arm and next observation without inventing causation', async () => {
  const plan = await createRunaPreviewPlan({ rendererReview: approvedRendererReview(), world: WORLD, generatedAt: '2026-08-14T15:01:00.000Z' });
  const render = await createRunaPreviewRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    runtime: { audio: true, bus: 'temporary-preview-output', waveform: 'triangle', root_hz_before: 220, root_hz_after: 220, actual_duration_ms: 7000, haptic: false, midi: false, soundfont: false },
    launchedAt: '2026-08-14T15:02:00.000Z',
    completedAt: '2026-08-14T15:02:07.000Z',
  });
  const arm = await createRunaPreviewEvidenceArm({ renderReceipt: render, armedBy: 'Rowan', armedAt: '2026-08-14T15:03:00.000Z' });
  const cycle = feedbackCycle('cycle-next', '2026-08-14T15:04:00.000Z');
  const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: cycle, linkedAt: '2026-08-14T15:04:01.000Z' });
  const graph = buildExtendedArcsweepProvenanceGraph({
    worldId: WORLD.id,
    feedbackCycles: [cycle],
    observatory: {
      runa_renderer_reviews: [approvedRendererReview()],
      runa_preview_plans: [plan],
      runa_preview_renders: [render],
      runa_preview_evidence_arms: [arm],
      runa_preview_observation_links: [link],
    },
  });
  const ids = new Set(graph.nodes.map((item) => item.id));
  for (const id of [plan.plan_id, render.render_id, arm.arm_id, link.link_id, cycle.cycle_id]) assert.ok(ids.has(id));
  const relations = new Set(graph.edges.map((item) => `${item.from}:${item.relation}:${item.to}`));
  assert.ok(relations.has(`${plan.plan_id}:launched-as-preview:${render.render_id}`));
  assert.ok(relations.has(`${render.render_id}:armed-for-observation:${arm.arm_id}`));
  assert.ok(relations.has(`${arm.arm_id}:applies-to-next-observation:${link.link_id}`));
  assert.ok(relations.has(`${cycle.cycle_id}:observed-after-preview:${link.link_id}`));
  assert.equal(graph.authority.observation_links_are_context_not_causation_claims, true);
});

test('integrity replay verifies the new preview receipts deterministically', async () => {
  const plan = await createRunaPreviewPlan({ rendererReview: approvedRendererReview(), world: WORLD, generatedAt: '2026-08-14T15:01:00.000Z' });
  const render = await createRunaPreviewRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    runtime: { audio: true, bus: 'temporary-preview-output', waveform: 'triangle', root_hz_before: 220, root_hz_after: 220, actual_duration_ms: 7000, haptic: false, midi: false, soundfont: false },
    launchedAt: '2026-08-14T15:02:00.000Z',
    completedAt: '2026-08-14T15:02:07.000Z',
  });
  const arm = await createRunaPreviewEvidenceArm({ renderReceipt: render, armedBy: 'Rowan', armedAt: '2026-08-14T15:03:00.000Z' });
  const cycle = feedbackCycle('cycle-next', '2026-08-14T15:04:00.000Z');
  const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: cycle, linkedAt: '2026-08-14T15:04:01.000Z' });
  const nodes = [
    { id: plan.plan_id, kind: 'runa_preview_plan', receipt: plan },
    { id: render.render_id, kind: 'runa_preview_render', receipt: render },
    { id: arm.arm_id, kind: 'runa_preview_evidence_arm', receipt: arm },
    { id: link.link_id, kind: 'runa_preview_observation_link', receipt: link },
  ];
  const graph = {
    world_id: WORLD.id,
    nodes,
    edges: [],
    unresolved_edges: [],
    collisions: [],
    summary: { node_count: nodes.length, edge_count: 0, unresolved_edge_count: 0, collision_count: 0, by_kind: {} },
  };
  const report = await verifyProvenanceGraph(graph, { generatedAt: '2026-08-14T15:06:00.000Z' });
  assert.equal(report.status, 'PASS');
  assert.equal(report.counts.verified, 4);
  assert.equal(report.counts.mismatch, 0);
});
