import { RUNA_PREVIEW_PLAN_SCHEMA, createRunaPreviewRenderReceipt } from '../runa-preview-render.js';
import { launchRunaPreviewPlan, previewIsActive, stopRunaPreview } from '../runa-preview-player.js';
import { registerSomaticService } from './somatic-service.js';

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

function defaultVibrate(pattern) {
  const vibrate = globalThis.navigator?.vibrate;
  if (typeof vibrate !== 'function') return false;
  return vibrate.call(globalThis.navigator, pattern) !== false;
}

function hapticPattern({ bpm = 55, pattern = 'pulse.single.soft', haptic_pattern = null } = {}) {
  const beat = Math.max(250, Math.round(60000 / Math.max(1, Number(bpm) || 55)));
  const name = haptic_pattern || pattern;
  if (name === 'pulse.double') return [70, 90, 70, Math.max(80, beat - 230)];
  if (name === 'pulse.arc.55') return [55, 80, 90, 110, 125, Math.max(80, beat - 460)];
  return [70, Math.max(80, beat - 70)];
}

function defaultSpeak(text) {
  const synthesis = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (!synthesis || typeof Utterance !== 'function') return false;
  synthesis.speak(new Utterance(String(text || '').trim()));
  return true;
}

export function registerRunaService(registry, {
  bus = null,
  launchPreview = launchRunaPreviewPlan,
  stopPreview = stopRunaPreview,
  isPreviewActive = previewIsActive,
  renderReceipt = createRunaPreviewRenderReceipt,
  audioContextProvider = () => globalThis.AudioContext || globalThis.webkitAudioContext || null,
  vibrate = defaultVibrate,
  speak = defaultSpeak,
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
      bounded_somatic_haptic: true,
      bounded_somatic_audio: true,
      midi_preview: false,
      soundfont_preview: false,
    },
    consumes: ['arcsweep:feather-paused'],
    emits: [],
  });

  registry.registerCapability({
    capability_id: 'runa.status',
    service_id: 'runa-sensory',
    description: 'Read Runa temporary-preview and somatic-output readiness without starting sensory output.',
    authority: 'read',
    execute: () => ({
      schema: 'arcsweep.runa-status/v1',
      preview_active: Boolean(isPreviewActive()),
      web_audio_available: typeof audioContextProvider() === 'function',
      explicit_user_launch_required: true,
      temporary_audio_only: true,
      haptic_preview_authorized: false,
      somatic_haptic_available: typeof vibrate === 'function',
      somatic_speech_available: typeof speak === 'function',
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
    capability_id: 'runa.haptic.start',
    service_id: 'runa-sensory',
    description: 'Emit a short bounded haptic cadence cue for a somatic course.',
    authority: 'operate',
    input_schema: { required: ['bpm'] },
    validate: (input) => Number.isFinite(Number(input?.bpm)) && Number(input.bpm) > 0,
    execute: (input) => {
      const vibration = hapticPattern(input);
      const applied = Boolean(vibrate(vibration));
      return { applied, supported: applied, bpm: Number(input.bpm), pattern_name: input.pattern || 'pulse.single.soft', vibration_pattern: vibration };
    },
  });

  registry.registerCapability({
    capability_id: 'runa.haptic.pattern',
    service_id: 'runa-sensory',
    description: 'Emit one named bounded haptic glyph pattern without changing persistent world state.',
    authority: 'operate',
    execute: (input) => {
      const vibration = hapticPattern(input);
      const applied = Boolean(vibrate(vibration));
      return { applied, supported: applied, bpm: Number(input?.bpm || 55), pattern_name: input?.haptic_pattern || input?.pattern || 'pulse.single.soft', vibration_pattern: vibration };
    },
  });

  registry.registerCapability({
    capability_id: 'runa.audio.play',
    service_id: 'runa-sensory',
    description: 'Speak one short somatic phoneme cue through the local browser speech surface.',
    authority: 'operate',
    input_schema: { required: ['phoneme'] },
    validate: (input) => Boolean(String(input?.phoneme || '').trim()),
    execute: (input) => {
      const phoneme = String(input.phoneme).trim().slice(0, 80);
      const applied = Boolean(speak(phoneme));
      return { applied, supported: applied, phoneme };
    },
  });

  registry.registerCapability({
    capability_id: 'runa.stop-preview',
    service_id: 'runa-sensory',
    description: 'Stop the active temporary Runa preview without changing persistent soundscape state.',
    authority: 'operate',
    execute: () => ({ stopped: Boolean(stopPreview('OS stop')), reason: 'OS stop' }),
  });

  const somatic = registerSomaticService(registry, { bus, now });

  let unsubscribe = null;
  if (bus?.subscribe) {
    unsubscribe = bus.subscribe('arcsweep:feather-paused', () => {
      stopPreview('Feather');
      try { vibrate(0); } catch { /* no-op */ }
    }, { id: 'runa-feather-stop' });
  }

  return Object.freeze({
    service_id: 'runa-sensory',
    capabilities: [
      'runa.status', 'runa.inspect-preview-plan', 'runa.launch-preview', 'runa.stop-preview',
      'runa.haptic.start', 'runa.haptic.pattern', 'runa.audio.play',
    ],
    somatic,
    destroy: () => {
      unsubscribe?.();
      somatic.destroy?.();
    },
  });
}
