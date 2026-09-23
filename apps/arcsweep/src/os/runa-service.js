import { RUNA_PREVIEW_PLAN_SCHEMA, createRunaPreviewRenderReceipt } from '../runa-preview-render.js';
import { launchRunaPreviewPlan, previewIsActive, stopRunaPreview } from '../runa-preview-player.js';
import { RUNA_MANIFESTATION_RECEIPT_SCHEMA, createRunaManifestationAdapter } from './runa-manifestation.js';

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

function semanticCue(kind, input = {}) {
  return {
    schema: 'arcsweep.runa-somatic-cue/v1',
    kind,
    applied: true,
    supported: true,
    hardware_output: false,
    browser_autoplay_required: false,
    cue: clone(input || {}),
    presented_at: new Date().toISOString(),
  };
}

function defineManifestationEvent(bus) {
  if (!bus?.define || !bus?.eventNames) return;
  const known = new Set(bus.eventNames());
  if (!known.has('arcsweep:runa-manifested')) {
    bus.define('arcsweep:runa-manifested', (payload) => payload?.schema === RUNA_MANIFESTATION_RECEIPT_SCHEMA && Boolean(payload?.receipt_id));
  }
}

function sameOrigin(event) {
  const expected = globalThis.location?.origin;
  if (!expected || !event?.origin) return true;
  return event.origin === expected;
}

function messageStroke(event) {
  if (!sameOrigin(event)) return null;
  const data = event?.data;
  if (!data || typeof data !== 'object') return null;
  const type = data.type || data.name;
  if (type !== 'starwell:glyph-stroke-committed') return null;
  if (data.schema && data.schema !== 'starwell.glyph-studio-event-message/v1') return null;
  const stroke = data.detail || data.payload || null;
  return stroke?.schema === 'starwell.glyph-stroke-receipt/v1' ? stroke : null;
}

export function registerRunaService(registry, {
  bus = null,
  eventTarget = globalThis,
  manifestation = null,
  launchPreview = launchRunaPreviewPlan,
  stopPreview = stopRunaPreview,
  isPreviewActive = previewIsActive,
  renderReceipt = createRunaPreviewRenderReceipt,
  audioContextProvider = () => globalThis.AudioContext || globalThis.webkitAudioContext || null,
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Runa service requires the ArcSweep capability registry.');

  defineManifestationEvent(bus);
  const manifestationRuntime = manifestation || createRunaManifestationAdapter({
    now,
    onReceipt: (receipt) => bus?.publish?.('arcsweep:runa-manifested', receipt, { source: 'runa-sensory' }),
  });

  registry.registerService({
    service_id: 'runa-sensory',
    label: 'Runa Sensory Runtime',
    authority_boundary: {
      temporary_preview_audio: true,
      explicit_user_launch_required: true,
      autoplay: false,
      persistent_world_root_mutation: false,
      world_hum_output: 'explicit-human-launch',
      safe_gateway_output: 'explicit-human-launch',
      glyph_sonification: 'explicit-human-arm-then-observed-strokes',
      haptic_preview: false,
      midi_preview: false,
      soundfont_preview: false,
      somatic_semantic_cues: true,
      hardware_haptic_output: 'capability-detected-explicit-launch',
      legacy_heartfield_surface: 'compatibility-only',
    },
    consumes: ['arcsweep:feather-paused', 'starwell:glyph-stroke-committed', 'arcsweep:glyph-stroke-observed'],
    emits: ['arcsweep:runa-manifested'],
  });

  registry.registerCapability({
    capability_id: 'runa.status',
    service_id: 'runa-sensory',
    description: 'Read Runa preview and manifestation readiness without starting sensory output.',
    authority: 'read',
    execute: () => {
      const manifestationStatus = manifestationRuntime.status?.() || null;
      return {
        schema: 'arcsweep.runa-status/v1',
        preview_active: Boolean(isPreviewActive()),
        web_audio_available: typeof audioContextProvider() === 'function',
        explicit_user_launch_required: true,
        temporary_audio_only: false,
        haptic_preview_authorized: false,
        midi_preview_authorized: false,
        soundfont_preview_authorized: false,
        somatic_semantic_cues: true,
        hardware_haptic_output: Boolean(manifestationStatus?.native_haptics_available),
        manifestation: manifestationStatus,
      };
    },
  });

  registry.registerCapability({
    capability_id: 'runa.manifestation.status',
    service_id: 'runa-sensory',
    description: 'Read the live World Hum, Safe Gateway, glyph-sonification, and haptic manifestation state.',
    authority: 'read',
    execute: () => manifestationRuntime.status?.() || null,
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

  registry.registerCapability({
    capability_id: 'runa.world-hum.start',
    service_id: 'runa-sensory',
    description: 'Manifest the active World Hum through the existing ArcSweep StorySoundscape after explicit human launch.',
    authority: 'operate',
    requires_confirmation: true,
    execute: (input) => manifestationRuntime.startWorldHum(input || {}),
  });

  registry.registerCapability({
    capability_id: 'runa.world-hum.stop',
    service_id: 'runa-sensory',
    description: 'Stop the manifested World Hum without altering the canonical world profile.',
    authority: 'operate',
    execute: (input) => manifestationRuntime.stopWorldHum(input?.reason || 'OS stop'),
  });

  registry.registerCapability({
    capability_id: 'runa.safe-gateway.start',
    service_id: 'runa-sensory',
    description: 'Launch the existing Möbius Safe Gateway engine through Runa after explicit human confirmation.',
    authority: 'operate',
    requires_confirmation: true,
    execute: (input) => manifestationRuntime.startSafeGateway(input || {}),
  });

  registry.registerCapability({
    capability_id: 'runa.safe-gateway.stop',
    service_id: 'runa-sensory',
    description: 'Feather the active Möbius Safe Gateway output.',
    authority: 'operate',
    execute: (input) => manifestationRuntime.stopSafeGateway(input?.reason || 'OS stop'),
  });

  registry.registerCapability({
    capability_id: 'runa.glyph-sonification.set',
    service_id: 'runa-sensory',
    description: 'Arm or disarm observed Glyph Forge strokes as Runa sound/haptic manifestations.',
    authority: 'operate',
    requires_confirmation: true,
    execute: (input) => manifestationRuntime.setGlyphSonification(input || {}),
  });

  registry.registerCapability({
    capability_id: 'runa.haptic.pulse',
    service_id: 'runa-sensory',
    description: 'Attempt one explicit native haptic pulse when the current browser/device exposes vibration output.',
    authority: 'operate',
    requires_confirmation: true,
    execute: (input) => manifestationRuntime.pulseHaptic(input || {}),
  });

  registry.registerCapability({
    capability_id: 'runa.feather',
    service_id: 'runa-sensory',
    description: 'Stop Runa manifestation outputs and disarm glyph sonification.',
    authority: 'operate',
    execute: (input) => {
      stopPreview(input?.reason || 'Feather');
      return manifestationRuntime.feather(input?.reason || 'Feather');
    },
  });

  registry.registerCapability({
    capability_id: 'runa.haptic.start',
    service_id: 'runa-sensory',
    description: 'Present a semantic haptic-start cue for Somatic Cartography without activating hardware output.',
    authority: 'operate',
    execute: (input) => semanticCue('haptic-start', input),
  });

  registry.registerCapability({
    capability_id: 'runa.audio.play',
    service_id: 'runa-sensory',
    description: 'Present a semantic audio cue for Somatic Cartography without browser autoplay or persistent soundscape mutation.',
    authority: 'operate',
    execute: (input) => semanticCue('audio-cue', input),
  });

  registry.registerCapability({
    capability_id: 'runa.haptic.pattern',
    service_id: 'runa-sensory',
    description: 'Present a named haptic-pattern cue for Somatic Cartography without claiming device vibration occurred.',
    authority: 'operate',
    execute: (input) => semanticCue('haptic-pattern', input),
  });

  const observeStroke = (stroke, source) => {
    if (!stroke) return;
    Promise.resolve(manifestationRuntime.observeGlyphStroke?.(stroke, { source })).catch(() => {});
  };
  const onLocalStroke = (event) => observeStroke(event?.detail || null, 'glyph-forge-local');
  const onObservedStroke = (event) => observeStroke(event?.detail?.stroke || event?.detail || null, 'glyph-forge-observer');
  const onMessage = (event) => observeStroke(messageStroke(event), 'glyph-forge-postmessage');
  eventTarget?.addEventListener?.('starwell:glyph-stroke-committed', onLocalStroke);
  eventTarget?.addEventListener?.('arcsweep:glyph-stroke-observed', onObservedStroke);
  if (eventTarget !== globalThis) globalThis.addEventListener?.('message', onMessage);
  else eventTarget?.addEventListener?.('message', onMessage);

  let unsubscribe = null;
  if (bus?.subscribe) {
    unsubscribe = bus.subscribe('arcsweep:feather-paused', () => {
      stopPreview('Feather');
      manifestationRuntime.feather?.('Feather');
    }, { id: 'runa-feather-stop' });
  }

  const capabilities = [
    'runa.status',
    'runa.manifestation.status',
    'runa.inspect-preview-plan',
    'runa.launch-preview',
    'runa.stop-preview',
    'runa.world-hum.start',
    'runa.world-hum.stop',
    'runa.safe-gateway.start',
    'runa.safe-gateway.stop',
    'runa.glyph-sonification.set',
    'runa.haptic.pulse',
    'runa.feather',
    'runa.haptic.start',
    'runa.audio.play',
    'runa.haptic.pattern',
  ];

  return Object.freeze({
    service_id: 'runa-sensory',
    capabilities,
    manifestation: manifestationRuntime,
    destroy: () => {
      unsubscribe?.();
      eventTarget?.removeEventListener?.('starwell:glyph-stroke-committed', onLocalStroke);
      eventTarget?.removeEventListener?.('arcsweep:glyph-stroke-observed', onObservedStroke);
      if (eventTarget !== globalThis) globalThis.removeEventListener?.('message', onMessage);
      else eventTarget?.removeEventListener?.('message', onMessage);
    },
  });
}
