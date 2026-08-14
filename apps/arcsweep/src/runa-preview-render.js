import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { RUNA_RENDERER_REVIEW_SCHEMA } from './runa-renderer-candidate.js';

export const RUNA_PREVIEW_PLAN_SCHEMA = 'arcsweep.runa-preview-plan/v1';
export const RUNA_PREVIEW_RENDER_SCHEMA = 'arcsweep.runa-preview-render/v1';
export const RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA = 'arcsweep.runa-preview-evidence-arm/v1';
export const RUNA_PREVIEW_INTERVENTION_EVIDENCE_SCHEMA = 'arcsweep.runa-preview-intervention-evidence/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_PREVIEW: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveRootHz(world) {
  const candidate = Number(world?.soundscape?.rootHz ?? world?.root_hz ?? world?.rootHz);
  return Number.isFinite(candidate) && candidate >= 20 && candidate <= 20000 ? candidate : 369;
}

function resolveWaveform(world) {
  const waveform = world?.soundscape?.waveform;
  return ['sine', 'triangle', 'sawtooth', 'square'].includes(waveform) ? waveform : 'triangle';
}

export async function createRunaPreviewPlan({ rendererReview, world, generatedAt } = {}) {
  invariant(rendererReview?.schema === RUNA_RENDERER_REVIEW_SCHEMA, 'an explicit Runa renderer review is required');
  invariant(rendererReview.decision === 'approved', 'renderer review must be approved before preview planning');
  invariant(rendererReview.authority?.preview_compilation_allowed === true, 'review must explicitly permit preview compilation');
  invariant(rendererReview.authority?.render_authorized === false, 'review must not already carry render authority');
  invariant(world?.id, 'world is required');
  invariant(rendererReview.source?.world_id === world.id, 'renderer review and preview world must match');

  const candidate = rendererReview.reviewed_candidate;
  const hum = candidate?.compiler?.parameters?.world_hum;
  invariant(hum, 'reviewed candidate must expose bounded world-hum parameters');
  const baseHz = resolveRootHz(world);
  const waveform = resolveWaveform(world);
  const ceilingCents = Math.max(0, finite(hum.detune_limit_cents, 'world hum detune limit'));
  const auditionCents = Number(Math.min(ceilingCents * 0.5, 12).toFixed(3));
  const targetHz = Number((baseHz * (2 ** (auditionCents / 1200))).toFixed(6));
  const requestedDuration = finite(hum.transition_ms, 'world hum transition');
  const durationMs = Math.round(clamp(requestedDuration, 1800, 8000));
  const gainCeiling = Number(clamp(finite(hum.mix_delta_limit, 'world hum mix delta limit'), 0.015, 0.12).toFixed(6));

  const core = {
    schema: RUNA_PREVIEW_PLAN_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world: {
      id: world.id,
      name: world.name || world.id,
    },
    source: {
      renderer_review_id: rendererReview.review_id,
      renderer_review_fingerprint: rendererReview.review_fingerprint,
      renderer_candidate_id: rendererReview.source.candidate_id,
      suggestion_id: rendererReview.source.suggestion_id,
    },
    preview: {
      kind: 'temporary-world-hum-audition',
      bus: 'tones',
      duration_ms: durationMs,
      waveform,
      base_hz: baseHz,
      target_hz: targetHz,
      detune_cents: auditionCents,
      gain_ceiling: gainCeiling,
      trajectory: ['base', 'target', 'base'],
      haptic: false,
      midi: false,
      soundfont: false,
      source_layers: [],
    },
    bounds: {
      candidate_detune_limit_cents: ceilingCents,
      candidate_mix_delta_limit: Number(hum.mix_delta_limit),
      audition_within_candidate_bounds: auditionCents <= ceilingCents + 1e-9 && gainCeiling <= Number(hum.mix_delta_limit) + 1e-9,
    },
    authority: {
      executable_preview_plan: true,
      requires_explicit_user_launch: true,
      autoplay_authorized: false,
      persistent_world_root_mutable: false,
      persistent_bus_levels_mutable: false,
      world_tone_commit: false,
      haptic_authorized: false,
      midi_authorized: false,
      soundfont_authorized: false,
      source_layers_assigned: false,
      observation_inferred: false,
      premaqc_mutable: false,
      qualia_inferred: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  invariant(core.bounds.audition_within_candidate_bounds, 'preview plan exceeds reviewed renderer bounds');
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    plan_id: `arcsweep-runa-preview-${fingerprint.slice(0, 24)}`,
    plan_fingerprint: fingerprint,
  });
}

export async function createRunaPreviewRenderReceipt({
  plan,
  runtime,
  launchedBy,
  launchedAt,
  completedAt,
} = {}) {
  invariant(plan?.schema === RUNA_PREVIEW_PLAN_SCHEMA, 'a Runa preview plan is required');
  invariant(plan.authority?.requires_explicit_user_launch === true, 'preview plan must require explicit user launch');
  const actor = String(launchedBy || '').trim();
  invariant(actor, 'launchedBy is required');
  invariant(runtime && typeof runtime === 'object', 'runtime result is required');
  invariant(runtime.audio === true, 'runtime must confirm audio output');
  invariant(runtime.haptic !== true && runtime.midi !== true && runtime.soundfont !== true, 'preview runtime may not add unreviewed outputs');
  invariant(Number(runtime.root_hz_before) === Number(runtime.root_hz_after), 'preview must leave the persistent world root unchanged');
  const started = launchedAt ?? runtime.started_at ?? new Date().toISOString();
  const completed = completedAt ?? runtime.completed_at ?? started;
  const stoppedEarly = Boolean(runtime.stopped_early);

  const core = {
    schema: RUNA_PREVIEW_RENDER_SCHEMA,
    schema_version: 1,
    world_id: plan.world.id,
    launched_at: started,
    completed_at: completed,
    launched_by: actor,
    source: {
      plan_id: plan.plan_id,
      plan_fingerprint: plan.plan_fingerprint,
      renderer_review_id: plan.source.renderer_review_id,
      renderer_candidate_id: plan.source.renderer_candidate_id,
      suggestion_id: plan.source.suggestion_id,
    },
    executed_preview: structuredClone(plan.preview),
    runtime: {
      audio: true,
      bus: String(runtime.bus || plan.preview.bus),
      waveform: String(runtime.waveform || plan.preview.waveform),
      root_hz_before: finite(runtime.root_hz_before, 'runtime root before'),
      root_hz_after: finite(runtime.root_hz_after, 'runtime root after'),
      actual_duration_ms: Math.max(0, finite(runtime.actual_duration_ms ?? plan.preview.duration_ms, 'runtime duration')),
      stopped_early: stoppedEarly,
      stop_reason: stoppedEarly ? String(runtime.stop_reason || 'stopped') : null,
      haptic: false,
      midi: false,
      soundfont: false,
    },
    authority: {
      explicit_user_launch: true,
      intervention_receipt: true,
      observed_response_inferred: false,
      premaqc_changed_by_render_receipt: false,
      persistent_world_root_changed: false,
      autoplay_used: false,
      feather_stop_recorded_when_used: stoppedEarly,
      haptic_used: false,
      midi_used: false,
      soundfont_used: false,
      external_truth_claim: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    render_id: `arcsweep-runa-render-${fingerprint.slice(0, 24)}`,
    render_fingerprint: fingerprint,
  });
}

export async function createRunaPreviewEvidenceArm({ renderReceipt, armedBy, armedAt } = {}) {
  invariant(renderReceipt?.schema === RUNA_PREVIEW_RENDER_SCHEMA, 'a Runa preview render receipt is required');
  const actor = String(armedBy || '').trim();
  invariant(actor, 'armedBy is required');
  const core = {
    schema: RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA,
    schema_version: 1,
    armed_at: armedAt ?? new Date().toISOString(),
    armed_by: actor,
    world_id: renderReceipt.world_id,
    source: {
      render_id: renderReceipt.render_id,
      render_fingerprint: renderReceipt.render_fingerprint,
      plan_id: renderReceipt.source.plan_id,
      suggestion_id: renderReceipt.source.suggestion_id,
    },
    authority: {
      explicit_evidence_arm: true,
      applies_to_next_feedback_cycle_only: true,
      observed_response_inferred: false,
      premaqc_effect_inferred: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    arm_id: `arcsweep-runa-evidence-${fingerprint.slice(0, 24)}`,
    arm_fingerprint: fingerprint,
  });
}

export function previewEvidenceFromArm(arm) {
  invariant(arm?.schema === RUNA_PREVIEW_EVIDENCE_ARM_SCHEMA, 'a Runa preview evidence arm is required');
  return Object.freeze({
    schema: RUNA_PREVIEW_INTERVENTION_EVIDENCE_SCHEMA,
    arm_id: arm.arm_id,
    arm_fingerprint: arm.arm_fingerprint,
    world_id: arm.world_id,
    render_id: arm.source.render_id,
    render_fingerprint: arm.source.render_fingerprint,
    plan_id: arm.source.plan_id,
    suggestion_id: arm.source.suggestion_id,
    authority: Object.freeze({
      intervention_source_only: true,
      response_must_be_observed_separately: true,
      premaqc_effect_inferred: false,
      qualia_inferred: false,
      physical_claim: false,
      canon_commit: false,
    }),
  });
}

export function latestUnconsumedPreviewEvidenceArm({ observatory, feedbackCycles = [], worldId } = {}) {
  const consumed = new Set((feedbackCycles || []).flatMap((cycle) =>
    (cycle.evidence || [])
      .filter((item) => item?.schema === RUNA_PREVIEW_INTERVENTION_EVIDENCE_SCHEMA)
      .map((item) => item.arm_id),
  ));
  return [...(observatory?.runa_preview_evidence_arms || [])]
    .reverse()
    .find((arm) => arm.world_id === worldId && !consumed.has(arm.arm_id)) || null;
}
