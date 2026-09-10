import { RUNA_PREVIEW_PLAN_SCHEMA, createRunaPreviewRenderReceipt } from '../runa-preview-render.js';
import { launchRunaPreviewPlan, previewIsActive, stopRunaPreview } from '../runa-preview-player.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function planSummary(plan) {
  if (!plan || plan.schema !== RUNA_PREVIEW_PLAN_SCHEMA) return null;
  return Object.freeze(clone({
    schema: plan.schema,
    plan_id: plan.plan_id || null,
    plan_fingerprint: plan.plan_fingerprint || null,
    world_id: plan.world?.id || null,
    duration_ms: Number(plan.preview?.duration_ms) || null,
    base_hz: Number(plan.preview?.base_hz) || null,
    target_hz: Number(plan.preview?.target_hz) || null,
    waveform: plan.preview?.waveform || null,
    keyboard_harmonics: Boolean(plan.preview?.keyboard_harmonics?.assigned),
    environmental_soundscape: Boolean(plan.preview?.environmental_soundscape?.assigned),
    haptic: false,
    midi: false,
    soundfont: false,
    requires_explicit_user_launch: plan.authority?.requires_explicit_user_launch === true,
    persistent_world_root_mutable: plan.authority?.persistent_world_root_mutable === true,
  }));
}

function validPlan(plan) {
  return Boolean(
    plan?.schema === RUNA_PREVIEW_PLAN_SCHEMA
    && plan?.authority?.requires_explicit_user_launch === true
    && plan?.authority?.autoplay_authorized === false
    && plan?.authority?.persistent_world_root_mutable === false
    && plan?.preview?.haptic === false
    && plan?.preview?.midi === false
    && plan?.preview?.soundfont === false
    && Number.isFinite(Number(plan?.preview?.duration_ms))
    && Number(plan.preview.duration_ms) > 0
  );
}

export function registerRunaService(registry, {
  bus = null,
  launchPreview = launchRunaPreviewPlan,
  stopPreview = stopRunaPreview,
  isPreviewActive = previewIsActive,
  renderReceipt = createRunaPreviewRenderReceipt,
  audioContextProvider = () => globalThis.AudioContext || globalThis.webkitAudioContext || null,
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Runa service requires the ArcSweep capability registry.');

  registry.registerService({
    service_id: 'runa-sensory',
    label: 'Runa Sensory Runtime',
    authority_boundary: {
      temporary_preview_audio: true,
      explicit_user_launch_required: true,
      autoplay: false,
      persistent_world_root_mutation: false,
      haptic_preview: false,
      midi_preview: false,
      soundfont_preview: false,
    },
    consumes: ['arcsweep:feather-paused'],
    emits: [],
  });

  registry.registerCapability({
    capability_id: 'runa.status',
    service_id: 'runa-sensory',
    description: 'Read Runa temporary-preview readiness without starting sensory output.',
    authority: 'read',
    execute: () => ({
      schema: 'arcsweep.runa-status/v1',
      preview_active: Boolean(isPreviewActive()),
      web_audio_available: typeof audioContextProvider() === 'function',
      explicit_user_launch_required: true,
      temporary_audio_only: true,
      haptic_preview_authorized: false,
      midi_preview_authorized: false,
      soundfont_preview_authorized: false,
    }),
  });

  registry.registerCapability({
    capability_id: 'runa.inspect-preview-plan',
    service_id: 'runa-sensory',
    description: 'Inspect a compiled Runa preview plan as a bounded summary without executing it.',
    authority: 'read',
    input_schema: { required: ['plan'] },
    validate: (input) => validPlan(input?.plan),
    execute: (input) => planSummary(input.plan),
  });

  registry.registerCapability({
    capability_id: 'runa.launch-preview',
    service_id: 'runa-sensory',
    description: 'Launch one already-reviewed temporary Runa audio preview after an explicit user confirmation.',
    authority: 'operate',
    requires_confirmation: true,
    input_schema: { required: ['plan'] },
    validate: (input) => validPlan(input?.plan),
    execute: async (input, context) => {
      const startedAt = now().toISOString();
      const runtime = await launchPreview(input.plan);
      return renderReceipt({
        plan: input.plan,
        runtime,
        launchedBy: context.actor_id || 'human-ui',
        launchedAt: startedAt,
        completedAt: now().toISOString(),
      });
    },
  });

  registry.registerCapability({
    capability_id: 'runa.stop-preview',
    service_id: 'runa-sensory',
    description: 'Stop the active temporary Runa preview without changing persistent soundscape state.',
    authority: 'operate',
    execute: () => ({ stopped: Boolean(stopPreview('OS stop')), reason: 'OS stop' }),
  });

  let unsubscribe = null;
  if (bus?.subscribe) {
    unsubscribe = bus.subscribe('arcsweep:feather-paused', () => { stopPreview('Feather'); }, { id: 'runa-feather-stop' });
  }

  return Object.freeze({
    service_id: 'runa-sensory',
    capabilities: ['runa.status', 'runa.inspect-preview-plan', 'runa.launch-preview', 'runa.stop-preview'],
    destroy: () => unsubscribe?.(),
  });
}
