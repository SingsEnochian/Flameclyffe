import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { RUNA_TRAJECTORY_SUGGESTION_SCHEMA } from './runa-trajectory-suggestion.js';

export const RUNA_RENDERER_CANDIDATE_SCHEMA = 'arcsweep.runa-renderer-candidate/v1';
export const RUNA_RENDERER_REVIEW_SCHEMA = 'arcsweep.runa-renderer-review/v1';
export const RUNA_RENDERER_POLICY_ID = 'runa.trajectory-bounded-dsp-policy/v1';

const ENVELOPE_MS = Object.freeze({ slow: 12000, moderate: 7000, fast: 3500 });
const DECISIONS = new Set(['approved', 'adjust', 'rejected']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_RENDERER: ${message}`);
}

function clamp01(value) { return Math.min(1, Math.max(0, Number(value) || 0)); }
function rounded(value, digits = 6) { return Number(Number(value).toFixed(digits)); }

function subsystemWeight(suggestion, subsystem) {
  const item = suggestion.subsystem_suggestions?.find((entry) => entry.subsystem === subsystem);
  return clamp01(item?.semantic_weight ?? suggestion.semantic_intent?.transition_amount ?? 0);
}

function boundedParameters(suggestion) {
  const envelope = suggestion.semantic_intent?.transition_envelope;
  invariant(Object.hasOwn(ENVELOPE_MS, envelope), 'suggestion transition envelope must be slow, moderate, or fast');
  const baseMs = ENVELOPE_MS[envelope];
  const worldHum = subsystemWeight(suggestion, 'world-hum');
  const keyboard = subsystemWeight(suggestion, 'keyboard-harmonics');
  const environment = subsystemWeight(suggestion, 'environmental-soundscape');

  return Object.freeze({
    world_hum: Object.freeze({
      transition_ms: baseMs,
      detune_limit_cents: rounded(worldHum * 18, 3),
      mix_delta_limit: rounded(worldHum * 0.18),
      root_frequency_assigned: false,
      destination_frequency_assigned: false,
    }),
    keyboard_harmonics: Object.freeze({
      transition_ms: Math.max(1200, Math.round(baseMs * 0.7)),
      harmonic_blend_delta_limit: rounded(keyboard * 0.2),
      velocity_mix_delta_limit: rounded(keyboard * 0.12),
      harmonic_set_assigned: false,
    }),
    environmental_soundscape: Object.freeze({
      transition_ms: Math.max(1800, Math.round(baseMs * 1.15)),
      layer_mix_delta_limit: rounded(environment * 0.16),
      filter_motion_octaves_limit: rounded(environment * 0.3, 4),
      source_layers_assigned: false,
    }),
    haptic: Object.freeze({
      assigned: false,
      reason: 'Trajectory suggestion does not assign haptic output. Haptic compilation remains a separate reviewed path.',
    }),
  });
}

export async function createRunaRendererCandidate({ suggestion, generatedAt } = {}) {
  invariant(suggestion?.schema === RUNA_TRAJECTORY_SUGGESTION_SCHEMA, 'a Runa trajectory suggestion is required');
  invariant(suggestion.authority?.suggestion_only === true, 'source suggestion must remain suggestion-only');
  invariant(suggestion.authority?.semantic_to_dsp_separation_preserved === true, 'source semantic-to-DSP separation must be explicit');
  invariant(suggestion.authority?.sensory_bus_published === false, 'source suggestion must not have published sensory activation');

  const parameters = boundedParameters(suggestion);
  const core = {
    schema: RUNA_RENDERER_CANDIDATE_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world_id: suggestion.world_id,
    status: 'candidate',
    source: {
      suggestion_id: suggestion.suggestion_id,
      suggestion_fingerprint: suggestion.suggestion_fingerprint,
      advisor_receipt_id: suggestion.source?.advisor_receipt_id ?? null,
      deep_time_record_ids: structuredClone(suggestion.source?.deep_time_record_ids || []),
    },
    semantic_input: {
      transition_amount: clamp01(suggestion.semantic_intent?.transition_amount),
      transition_envelope: suggestion.semantic_intent?.transition_envelope,
      premaqc_delta: structuredClone(suggestion.semantic_intent?.premaqc_delta || {}),
      premaqc_velocity: structuredClone(suggestion.semantic_intent?.premaqc_velocity || {}),
    },
    compiler: {
      policy_id: RUNA_RENDERER_POLICY_ID,
      policy_kind: 'bounded-design-mapping',
      parameters,
      mapping_note: 'Semantic movement sets bounded modulation ceilings and transition times. It does not assign a world root, destination tone, source layer, harmonic set, haptic pattern, or playback command.',
    },
    review: {
      human_review_required: true,
      reviewed: false,
      decision: null,
    },
    authority: {
      compiler_candidate_only: true,
      executable: false,
      render_authorized: false,
      autoplay_forbidden: true,
      sensory_bus_published: false,
      world_tone_changed: false,
      haptic_changed: false,
      source_suggestion_mutable: false,
      parameter_bounds_are_design_policy_not_physical_claim: true,
      qualia_inferred: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    candidate_id: `arcsweep-runa-renderer-${fingerprint.slice(0, 24)}`,
    candidate_fingerprint: fingerprint,
  });
}

export async function reviewRunaRendererCandidate({
  candidate,
  decision,
  reviewedBy,
  note = '',
  reviewedAt,
} = {}) {
  invariant(candidate?.schema === RUNA_RENDERER_CANDIDATE_SCHEMA, 'a Runa renderer candidate is required');
  invariant(candidate.status === 'candidate', 'only an unreviewed candidate may enter this review function');
  invariant(DECISIONS.has(decision), 'decision must be approved, adjust, or rejected');
  const reviewer = String(reviewedBy || '').trim();
  invariant(reviewer, 'reviewedBy is required');
  const timestamp = reviewedAt ?? new Date().toISOString();
  const reviewedStatus = decision === 'approved' ? 'approved-for-preview-compilation' : decision;
  const core = {
    schema: RUNA_RENDERER_REVIEW_SCHEMA,
    schema_version: 1,
    reviewed_at: timestamp,
    reviewed_by: reviewer,
    decision,
    note: String(note || '').trim(),
    source: {
      candidate_id: candidate.candidate_id,
      candidate_fingerprint: candidate.candidate_fingerprint,
      suggestion_id: candidate.source.suggestion_id,
      world_id: candidate.world_id,
    },
    reviewed_candidate: {
      ...structuredClone(candidate),
      status: reviewedStatus,
      review: {
        human_review_required: true,
        reviewed: true,
        decision,
      },
    },
    authority: {
      source_candidate_mutable: false,
      preview_compilation_allowed: decision === 'approved',
      render_authorized: false,
      autoplay_authorized: false,
      sensory_bus_published: false,
      tone_changed: false,
      haptic_changed: false,
      separate_preview_plan_required: decision === 'approved',
      separate_user_launch_required: decision === 'approved',
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    review_id: `arcsweep-runa-renderer-review-${fingerprint.slice(0, 24)}`,
    review_fingerprint: fingerprint,
  });
}
