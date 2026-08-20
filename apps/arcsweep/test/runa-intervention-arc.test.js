import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveRunaInterventionArc } from '../src/runa-intervention-arc.js';

const WORLD = 'terra-aeterna';

function fixture() {
  return {
    worldId: WORLD,
    observatory: {
      runa_suggestions: [{ suggestion_id: 'suggestion-1', world_id: WORLD, generated_at: '2026-08-14T15:00:00.000Z' }],
      runa_renderer_candidates: [{ candidate_id: 'candidate-1', world_id: WORLD, generated_at: '2026-08-14T15:01:00.000Z', source: { suggestion_id: 'suggestion-1' } }],
      runa_renderer_reviews: [{ review_id: 'renderer-review-1', reviewed_at: '2026-08-14T15:02:00.000Z', decision: 'approved', source: { world_id: WORLD, candidate_id: 'candidate-1' } }],
      runa_preview_plans: [{ plan_id: 'plan-1', generated_at: '2026-08-14T15:03:00.000Z', world: { id: WORLD }, source: { renderer_review_id: 'renderer-review-1' } }],
      runa_preview_renders: [{ render_id: 'render-1', world_id: WORLD, launched_at: '2026-08-14T15:04:00.000Z', source: { plan_id: 'plan-1' }, runtime: { stopped_early: false } }],
      runa_preview_evidence_arms: [{ arm_id: 'arm-1', world_id: WORLD, armed_at: '2026-08-14T15:05:00.000Z', source: { render_id: 'render-1' } }],
      runa_preview_observation_links: [{ link_id: 'link-1', world_id: WORLD, linked_at: '2026-08-14T15:06:00.000Z', source: { arm_id: 'arm-1', feedback_cycle_id: 'cycle-1' } }],
      deep_time_records: [
        { id: 'deep-time-0', world_id: WORLD, lambda: 1, time: { utc: '2026-08-14T14:30:00.000Z' }, provenance: { observation_run_id: 'cycle-0' } },
        { id: 'deep-time-1', world_id: WORLD, lambda: 2, time: { utc: '2026-08-14T15:08:00.000Z' }, provenance: { observation_run_id: 'cycle-1' } },
      ],
    },
    feedbackCycles: [{ schema: 'arcsweep.feedback-cycle/v1', cycle_id: 'cycle-1', world: { id: WORLD }, created_at: '2026-08-14T15:06:00.000Z' }],
    feedbackQueue: { entries: { 'cycle-1': { cycle_id: 'cycle-1', status: 'accepted', review_receipt_id: 'feedback-review-1' } } },
  };
}

test('a fully accepted preview intervention reaches ASH_READY only after a prior DEEPTime coordinate exists', () => {
  const arc = deriveRunaInterventionArc(fixture());
  assert.equal(arc.state, 'ASH_READY');
  assert.match(arc.next_action, /contribute to Ash/i);
  assert.equal(arc.stages.find((item) => item.id === 'deep-time').status, 'complete');
  assert.equal(arc.stages.find((item) => item.id === 'ash').status, 'ready');
  assert.equal(arc.authority.two_temporal_coordinates_required_for_trajectory_ash, true);
});

test('the first DEEPTime coordinate seeds time but does not manufacture trajectory Ash', () => {
  const input = fixture();
  input.observatory.deep_time_records = [input.observatory.deep_time_records[1]];
  const arc = deriveRunaInterventionArc(input);
  assert.equal(arc.state, 'RETURN_TO_DEEP_TIME');
  assert.match(arc.next_action, /later accepted record/i);
  assert.equal(arc.stages.find((item) => item.id === 'ash').status, 'waiting');
});

test('renderer rejection stops the arc before preview compilation', () => {
  const input = fixture();
  input.observatory.runa_renderer_reviews[0].decision = 'rejected';
  input.observatory.runa_preview_plans = [];
  input.observatory.runa_preview_renders = [];
  input.observatory.runa_preview_evidence_arms = [];
  input.observatory.runa_preview_observation_links = [];
  input.observatory.deep_time_records = [];
  input.feedbackCycles = [];
  input.feedbackQueue = { entries: {} };
  const arc = deriveRunaInterventionArc(input);
  assert.equal(arc.state, 'STOPPED');
  assert.match(arc.next_action, /stopped by explicit review/i);
});

test('accepted Feedback does not silently become DEEPTime', () => {
  const input = fixture();
  input.observatory.deep_time_records = [];
  const arc = deriveRunaInterventionArc(input);
  assert.equal(arc.state, 'RETURN_TO_DEEP_TIME');
  assert.match(arc.next_action, /Admit the accepted observation/i);
  assert.equal(arc.authority.feedback_acceptance_required_before_deep_time, true);
});
