import assert from 'node:assert/strict';
import test from 'node:test';

import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  createRunaRendererCandidate,
  reviewRunaRendererCandidate,
} from '../src/runa-renderer-candidate.js';

async function suggestion({ amount = 0.5, envelope = 'moderate' } = {}) {
  const core = {
    schema: 'arcsweep.runa-trajectory-suggestion/v1',
    schema_version: 1,
    generated_at: '2026-08-14T10:00:00.000Z',
    world_id: 'terra-aeterna',
    source: {
      advisor_receipt_id: 'advisor-1',
      advisor_receipt_fingerprint: 'a'.repeat(64),
      theory_record_id: 'theory-1',
      deep_time_record_ids: ['time-1', 'time-2', 'time-3'],
      deep_time_record_fingerprints: ['1'.repeat(64), '2'.repeat(64), '3'.repeat(64)],
    },
    trajectory: {
      lambda_start: 1,
      lambda_end: 3,
      utc_start: '2026-08-14T09:00:00.000Z',
      utc_end: '2026-08-14T10:00:00.000Z',
      delta: { P: .02, C: .05, R: .08, E: -.02, M: .04, A: .03, Q: .01 },
      latest_velocity: { P: 0, C: .001, R: .002, E: 0, M: .001, A: 0, Q: 0 },
      total_movement: amount / 4,
      transition_envelope: envelope,
    },
    semantic_intent: {
      transition_amount: amount,
      transition_envelope: envelope,
      premaqc_delta: { P: .02, C: .05, R: .08, E: -.02, M: .04, A: .03, Q: .01 },
      premaqc_velocity: { P: 0, C: .001, R: .002, E: 0, M: .001, A: 0, Q: 0 },
    },
    subsystem_suggestions: [
      { subsystem: 'world-hum', action: 'consider-gradual-transition', semantic_weight: amount, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
      { subsystem: 'keyboard-harmonics', action: 'consider-gradual-transition', semantic_weight: amount, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
      { subsystem: 'environmental-soundscape', action: 'consider-gradual-transition', semantic_weight: amount, dsp_parameters_assigned: false, reason_code: 'deep-time-trajectory' },
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
  const fingerprint = await sha256Hex(core);
  return { ...core, suggestion_id: `arcsweep-runa-${fingerprint.slice(0, 24)}`, suggestion_fingerprint: fingerprint };
}

test('Runa renderer candidate assigns bounded design ceilings but no root, destination, source layer, haptic, or playback authority', async () => {
  const source = await suggestion({ amount: 0.5, envelope: 'moderate' });
  const candidate = await createRunaRendererCandidate({ suggestion: source, generatedAt: '2026-08-14T10:01:00.000Z' });
  assert.equal(candidate.compiler.parameters.world_hum.transition_ms, 7000);
  assert.equal(candidate.compiler.parameters.world_hum.detune_limit_cents, 9);
  assert.equal(candidate.compiler.parameters.world_hum.root_frequency_assigned, false);
  assert.equal(candidate.compiler.parameters.environmental_soundscape.source_layers_assigned, false);
  assert.equal(candidate.compiler.parameters.haptic.assigned, false);
  assert.equal(candidate.authority.executable, false);
  assert.equal(candidate.authority.render_authorized, false);
  assert.equal(candidate.authority.sensory_bus_published, false);
});

test('renderer approval admits only the next preview-compilation stage and still cannot render', async () => {
  const candidate = await createRunaRendererCandidate({ suggestion: await suggestion(), generatedAt: '2026-08-14T10:01:00.000Z' });
  const review = await reviewRunaRendererCandidate({
    candidate,
    decision: 'approved',
    reviewedBy: 'Rowan',
    note: 'Bounds are acceptable for a separate preview compiler.',
    reviewedAt: '2026-08-14T10:02:00.000Z',
  });
  assert.equal(review.reviewed_candidate.status, 'approved-for-preview-compilation');
  assert.equal(review.authority.preview_compilation_allowed, true);
  assert.equal(review.authority.render_authorized, false);
  assert.equal(review.authority.autoplay_authorized, false);
  assert.equal(review.authority.separate_preview_plan_required, true);
  assert.equal(review.review_fingerprint.length, 64);
});

test('adjust and rejected reviews do not admit preview compilation', async () => {
  const candidate = await createRunaRendererCandidate({ suggestion: await suggestion(), generatedAt: '2026-08-14T10:01:00.000Z' });
  for (const decision of ['adjust', 'rejected']) {
    const review = await reviewRunaRendererCandidate({ candidate, decision, reviewedBy: 'Rowan', reviewedAt: `2026-08-14T10:0${decision === 'adjust' ? '2' : '3'}:00.000Z` });
    assert.equal(review.authority.preview_compilation_allowed, false);
    assert.equal(review.authority.render_authorized, false);
  }
});
