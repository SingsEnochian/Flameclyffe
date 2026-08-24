import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const RUNA_SENSORY_PROFILE_SCHEMA = 'arcsweep.runa-sensory-transfer-profile/v1';
export const RUNA_SENSORY_PLAN_SCHEMA = 'arcsweep.runa-sensory-transfer-plan/v1';
export const RUNA_SENSORY_RENDER_SCHEMA = 'arcsweep.runa-sensory-transfer-render/v1';
export const RUNA_SENSORY_RESPONSE_SCHEMA = 'arcsweep.runa-sensory-transfer-response/v1';

export const SENSORY_MODES = Object.freeze(['air', 'bone', 'field']);
export const SENSORY_CARRIERS = Object.freeze([
  'air_audio',
  'surface_bone_audio',
  'implant_bone_audio',
  'surface_haptic',
  'visual',
  'spatial',
]);

export const SENSORY_CARRIER_CAPABILITIES = Object.freeze({
  air_audio: Object.freeze({
    carrier_class: 'auditory',
    execution: 'browser-audio',
    frequency_control: true,
    medical_device_control: false,
  }),
  surface_bone_audio: Object.freeze({
    carrier_class: 'bone-auditory',
    execution: 'adapter-required',
    frequency_control: true,
    medical_device_control: false,
    note: 'External bone-audio devices require an explicit streaming/output adapter.',
  }),
  implant_bone_audio: Object.freeze({
    carrier_class: 'bone-auditory',
    execution: 'adapter-required',
    frequency_control: true,
    medical_device_control: false,
    note: 'Implant-class bone-audio routing is stream-only. Runa does not alter medical fitting, gain prescription, or implant behaviour.',
  }),
  surface_haptic: Object.freeze({
    carrier_class: 'somatic',
    execution: 'browser-vibration',
    frequency_control: false,
    medical_device_control: false,
  }),
  visual: Object.freeze({
    carrier_class: 'visual',
    execution: 'adapter-required',
    frequency_control: false,
    medical_device_control: false,
  }),
  spatial: Object.freeze({
    carrier_class: 'spatial',
    execution: 'adapter-required',
    frequency_control: false,
    medical_device_control: false,
  }),
});

export const SENSORY_SEMANTIC_STATES = Object.freeze({
  presence: Object.freeze({
    label: 'Presence',
    operation: 'HOLD',
    audio_ratio: 1,
    haptic_pattern_ms: [420, 180, 420, 820],
    envelope: 'steady',
  }),
  call: Object.freeze({
    label: 'Call',
    operation: 'CALL',
    audio_ratio: 1.5,
    haptic_pattern_ms: [180, 420],
    envelope: 'attack',
  }),
  response: Object.freeze({
    label: 'Response',
    operation: 'WEAVE',
    audio_ratio: 4 / 3,
    haptic_pattern_ms: [140, 120, 240, 520],
    envelope: 'paired',
  }),
  stability: Object.freeze({
    label: 'Stability',
    operation: 'HOLD',
    audio_ratio: 2,
    haptic_pattern_ms: [220, 220, 220, 220],
    envelope: 'regular',
  }),
  crossing: Object.freeze({
    label: 'Crossing',
    operation: 'CROSS',
    audio_ratio: 5 / 4,
    haptic_pattern_ms: [90, 100, 140, 100, 220, 460],
    envelope: 'transition',
  }),
  release: Object.freeze({
    label: 'Release',
    operation: 'RETURN',
    audio_ratio: 0.5,
    haptic_pattern_ms: [260, 140, 180, 180, 100, 520],
    envelope: 'decay',
  }),
});

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_SENSORY_TRANSFER: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveWorldRootHz(world) {
  const candidate = Number(world?.soundscape?.rootHz ?? world?.root_hz ?? world?.rootHz);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : 369;
}

function audibleFrequency(rootHz, ratio) {
  let value = rootHz * ratio;
  while (value < 120) value *= 2;
  while (value > 2400) value /= 2;
  return Number(value.toFixed(6));
}

function normalizeProfile(profile = {}) {
  const participantRef = String(profile.participant_ref || 'local-participant').trim();
  invariant(participantRef, 'participant_ref is required');
  const version = Math.max(1, Math.floor(Number(profile.version) || 1));
  return Object.freeze({
    schema: RUNA_SENSORY_PROFILE_SCHEMA,
    profile_id: String(profile.profile_id || `sensory-profile:${participantRef}:v${version}`),
    participant_ref: participantRef,
    version,
    carriers: structuredClone(Array.isArray(profile.carriers) ? profile.carriers : []),
    coupling_preferences: structuredClone(Array.isArray(profile.coupling_preferences) ? profile.coupling_preferences : []),
    aversive_regions: structuredClone(Array.isArray(profile.aversive_regions) ? profile.aversive_regions : []),
    preferred_regions: structuredClone(Array.isArray(profile.preferred_regions) ? profile.preferred_regions : []),
    default_confirmation_carrier: profile.default_confirmation_carrier || 'air_audio',
    default_alert_carrier: profile.default_alert_carrier || 'surface_haptic',
    calibration_receipt_refs: structuredClone(Array.isArray(profile.calibration_receipt_refs) ? profile.calibration_receipt_refs : []),
    created_at: profile.created_at || new Date(0).toISOString(),
    updated_at: profile.updated_at || new Date(0).toISOString(),
    authority: Object.freeze({
      participant_specific: true,
      unknown_is_open_not_zero: true,
      qualia_inferred: false,
      universal_human_curve_assumed: false,
    }),
  });
}

export function createDefaultSensoryTransferProfile({ participantRef = 'local-participant', createdAt } = {}) {
  const stamp = createdAt ?? new Date().toISOString();
  return normalizeProfile({
    participant_ref: participantRef,
    version: 1,
    created_at: stamp,
    updated_at: stamp,
    carriers: [
      { carrier: 'air_audio', enabled: true, regions: [] },
      { carrier: 'surface_haptic', enabled: true, regions: [] },
      { carrier: 'surface_bone_audio', enabled: false, regions: [] },
      { carrier: 'implant_bone_audio', enabled: false, regions: [] },
      { carrier: 'visual', enabled: false, regions: [] },
      { carrier: 'spatial', enabled: false, regions: [] },
    ],
  });
}

export function sensoryModeCarriers(mode) {
  invariant(SENSORY_MODES.includes(mode), `mode must be one of ${SENSORY_MODES.join(', ')}`);
  if (mode === 'air') return Object.freeze(['air_audio']);
  if (mode === 'bone') return Object.freeze(['surface_haptic']);
  return Object.freeze(['air_audio', 'surface_haptic']);
}

function carrierEnabled(profile, carrier) {
  const configured = profile.carriers.find((item) => item?.carrier === carrier);
  return configured ? configured.enabled !== false : true;
}

export async function compileSensoryTransferPlan({
  world,
  profile,
  semanticKey = 'presence',
  mode = 'field',
  intensity = 0.45,
  durationMs = 2800,
  generatedAt,
} = {}) {
  invariant(world?.id, 'world is required');
  const semantic = SENSORY_SEMANTIC_STATES[semanticKey];
  invariant(semantic, `unknown semantic state: ${semanticKey}`);
  invariant(SENSORY_MODES.includes(mode), `unknown sensory mode: ${mode}`);
  const sensoryProfile = normalizeProfile(profile || createDefaultSensoryTransferProfile());
  const normalizedIntensity = Number(clamp(finite(intensity, 'intensity'), 0.05, 1).toFixed(4));
  const normalizedDuration = Math.round(clamp(finite(durationMs, 'durationMs'), 350, 12000));
  const rootHz = resolveWorldRootHz(world);
  const audioHz = audibleFrequency(rootHz, semantic.audio_ratio);
  const requestedCarriers = sensoryModeCarriers(mode);
  const carrierPlans = [];

  if (requestedCarriers.includes('air_audio') && carrierEnabled(sensoryProfile, 'air_audio')) {
    carrierPlans.push(Object.freeze({
      carrier: 'air_audio',
      semantic_role: 'primary',
      frequency_hz: audioHz,
      amplitude_norm: Number(Math.min(0.08, 0.018 + normalizedIntensity * 0.045).toFixed(5)),
      duration_ms: normalizedDuration,
      envelope: semantic.envelope,
      harmonic_lineage: Object.freeze({ root_hz: rootHz, ratio: semantic.audio_ratio }),
    }));
  }

  if (requestedCarriers.includes('surface_haptic') && carrierEnabled(sensoryProfile, 'surface_haptic')) {
    carrierPlans.push(Object.freeze({
      carrier: 'surface_haptic',
      semantic_role: mode === 'field' ? 'reinforcement' : 'primary',
      pattern_ms: structuredClone(semantic.haptic_pattern_ms),
      intensity_norm: normalizedIntensity,
      duration_ms: normalizedDuration,
      envelope: semantic.envelope,
      frequency_hz: null,
      note: 'Browser surface-haptic APIs expose timing, not a guaranteed actuator frequency.',
    }));
  }

  invariant(carrierPlans.length > 0, 'selected mode has no enabled carriers in this profile');

  const core = {
    schema: RUNA_SENSORY_PLAN_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world: { id: world.id, name: world.name || world.id },
    semantic: {
      key: semanticKey,
      label: semantic.label,
      operation: semantic.operation,
      envelope: semantic.envelope,
    },
    transfer: {
      mode,
      requested_carriers: requestedCarriers,
      carrier_plans: carrierPlans,
      coupling: mode === 'field'
        ? Object.freeze({ relation: 'phase_locked', semantic_invariant: semanticKey, offset_ms: 0 })
        : null,
    },
    profile: {
      profile_id: sensoryProfile.profile_id,
      participant_ref: sensoryProfile.participant_ref,
      version: sensoryProfile.version,
    },
    authority: {
      requires_explicit_user_launch: true,
      autoplay_authorized: false,
      persistent_world_root_mutable: false,
      automatic_intensity_escalation: false,
      aversive_override_required: true,
      qualia_inferred: false,
      premaqc_mutable: false,
      canon_commit: false,
      semantic_invariant_preserved_across_carriers: true,
      surface_bone_audio_execution_authorized: false,
      implant_bone_audio_execution_authorized: false,
      medical_device_fitting_mutable: false,
      medical_device_control_authorized: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    plan_id: `arcsweep-runa-sensory-${fingerprint.slice(0, 24)}`,
    plan_fingerprint: fingerprint,
  });
}

export async function createSensoryTransferRenderReceipt({ plan, runtime, launchedBy, launchedAt, completedAt } = {}) {
  invariant(plan?.schema === RUNA_SENSORY_PLAN_SCHEMA, 'a sensory transfer plan is required');
  const actor = String(launchedBy || '').trim();
  invariant(actor, 'launchedBy is required');
  invariant(runtime && typeof runtime === 'object', 'runtime result is required');
  const core = {
    schema: RUNA_SENSORY_RENDER_SCHEMA,
    schema_version: 1,
    world_id: plan.world.id,
    semantic_key: plan.semantic.key,
    launched_by: actor,
    launched_at: launchedAt ?? runtime.started_at ?? new Date().toISOString(),
    completed_at: completedAt ?? runtime.completed_at ?? new Date().toISOString(),
    source: {
      plan_id: plan.plan_id,
      plan_fingerprint: plan.plan_fingerprint,
      sensory_profile_id: plan.profile.profile_id,
      sensory_profile_version: plan.profile.version,
    },
    requested_mode: plan.transfer.mode,
    runtime: {
      audio_requested: Boolean(runtime.audio_requested),
      audio_rendered: Boolean(runtime.audio_rendered),
      haptic_requested: Boolean(runtime.haptic_requested),
      haptic_supported: Boolean(runtime.haptic_supported),
      haptic_rendered: Boolean(runtime.haptic_rendered),
      stopped_early: Boolean(runtime.stopped_early),
      stop_reason: runtime.stopped_early ? String(runtime.stop_reason || 'stopped') : null,
      actual_duration_ms: Math.max(0, Number(runtime.actual_duration_ms) || 0),
      rendered_carriers: structuredClone(runtime.rendered_carriers || []),
    },
    authority: {
      explicit_user_launch: true,
      runtime_capability_reported_truthfully: true,
      failed_perception_did_not_escalate_intensity: true,
      participant_response_inferred: false,
      qualia_inferred: false,
      premaqc_effect_inferred: false,
      canon_commit: false,
      medical_device_fitting_changed: false,
      medical_device_control_used: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    render_id: `arcsweep-runa-sensory-render-${fingerprint.slice(0, 24)}`,
    render_fingerprint: fingerprint,
  });
}

export async function createSensoryTransferResponse({
  renderReceipt,
  noticed,
  identifiedSemanticKey = null,
  clarity = null,
  comfort = null,
  confidence = null,
  participantReport = '',
  recordedAt,
} = {}) {
  invariant(renderReceipt?.schema === RUNA_SENSORY_RENDER_SCHEMA, 'a sensory render receipt is required');
  const score = (value, field) => {
    if (value == null || value === '') return null;
    return Number(clamp(finite(value, field), 1, 5).toFixed(2));
  };
  const core = {
    schema: RUNA_SENSORY_RESPONSE_SCHEMA,
    schema_version: 1,
    recorded_at: recordedAt ?? new Date().toISOString(),
    world_id: renderReceipt.world_id,
    semantic_key: renderReceipt.semantic_key,
    source: {
      render_id: renderReceipt.render_id,
      render_fingerprint: renderReceipt.render_fingerprint,
    },
    participant_report: {
      noticed: Boolean(noticed),
      identified_semantic_key: identifiedSemanticKey || null,
      clarity: score(clarity, 'clarity'),
      comfort: score(comfort, 'comfort'),
      confidence: score(confidence, 'confidence'),
      note: String(participantReport || '').trim(),
    },
    authority: {
      firsthand_report_only: true,
      behavioural_measurement_is_not_qualia: true,
      qualia_inferred: false,
      premaqc_inferred: false,
      automatic_profile_mutation: false,
      canon_commit: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    response_id: `arcsweep-runa-sensory-response-${fingerprint.slice(0, 24)}`,
    response_fingerprint: fingerprint,
  });
}

export function profileWithCalibrationReceipt(profile, responseReceipt, { updatedAt } = {}) {
  invariant(responseReceipt?.schema === RUNA_SENSORY_RESPONSE_SCHEMA, 'a sensory response receipt is required');
  const current = normalizeProfile(profile);
  return normalizeProfile({
    ...structuredClone(current),
    profile_id: `sensory-profile:${current.participant_ref}:v${current.version + 1}`,
    version: current.version + 1,
    calibration_receipt_refs: [...current.calibration_receipt_refs, responseReceipt.response_id],
    updated_at: updatedAt ?? new Date().toISOString(),
  });
}
