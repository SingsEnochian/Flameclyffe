import {
  emitSomaticCue,
  getSomaticCue,
  listSomaticCues,
  somaticCueIsActive,
  stopSomaticCue,
} from '../somatic-runtime.js';

const SOMATIC_CUE_EMITTED_EVENT = 'arcsweep:somatic-cue-emitted';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function ensureSomaticEvent(bus) {
  if (!bus?.define) return;
  const knownEvents = typeof bus.eventNames === 'function' ? bus.eventNames() : [];
  if (knownEvents.includes(SOMATIC_CUE_EMITTED_EVENT)) return;
  bus.define(SOMATIC_CUE_EMITTED_EVENT, (payload) => (
    payload?.schema === 'arcsweep.somatic-receipt/v1'
    && Boolean(payload?.cue_id)
    && typeof payload.completed_at === 'string'
  ));
}

export function registerSomaticService(registry, {
  bus = null,
  emitCue = emitSomaticCue,
  stopCue = stopSomaticCue,
  isCueActive = somaticCueIsActive,
  audioContextProvider = () => globalThis.AudioContext || globalThis.webkitAudioContext || null,
  vibrationProvider = () => globalThis.navigator?.vibrate || null,
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Somatic service requires the ArcSweep capability registry.');
  ensureSomaticEvent(bus);

  registry.registerService({
    service_id: 'somatic-interface',
    label: 'ArcSweep Somatic Interface',
    authority_boundary: {
      explicit_user_launch_required: true,
      autoplay: false,
      persistent_stimulation: false,
      system_audio_route_only: true,
      medical_device_control: false,
      implant_control: false,
      expressive_modulation_bounded: true,
    },
    consumes: ['arcsweep:feather-paused'],
    emits: [SOMATIC_CUE_EMITTED_EVENT],
  });

  registry.registerCapability({
    capability_id: 'somatic.status',
    service_id: 'somatic-interface',
    description: 'Inspect somatic interface readiness without producing sensory output.',
    authority: 'read',
    execute: () => ({
      schema: 'arcsweep.somatic-status/v1',
      cue_active: Boolean(isCueActive()),
      web_audio_available: typeof audioContextProvider() === 'function',
      vibration_available: typeof vibrationProvider() === 'function',
      bone_conduction_ready: typeof audioContextProvider() === 'function',
      audio_route: 'system-selected-output',
      explicit_user_launch_required: true,
      expressive_modulation_bounded: true,
    }),
  });

  registry.registerCapability({
    capability_id: 'somatic.list-cues',
    service_id: 'somatic-interface',
    description: 'List the bounded semantic cue vocabulary available to the somatic layer.',
    authority: 'read',
    execute: () => ({ schema: 'arcsweep.somatic-cue-catalog/v1', cues: listSomaticCues() }),
  });

  registry.registerCapability({
    capability_id: 'somatic.inspect-cue',
    service_id: 'somatic-interface',
    description: 'Inspect one semantic somatic cue without emitting it.',
    authority: 'read',
    input_schema: { required: ['cue_id'] },
    validate: (input) => Boolean(getSomaticCue(input?.cue_id)),
    execute: (input) => clone(getSomaticCue(input.cue_id)),
  });

  registry.registerCapability({
    capability_id: 'somatic.emit-cue',
    service_id: 'somatic-interface',
    description: 'Emit one brief semantic cue through bounded audio and haptic channels after explicit human confirmation.',
    authority: 'operate',
    requires_confirmation: true,
    input_schema: { required: ['cue_id'] },
    validate: (input) => Boolean(getSomaticCue(input?.cue_id)),
    execute: async (input, context) => {
      const receipt = await emitCue(input.cue_id, {
        channels: input.channels || { audio: true, haptic: true },
        gainCeiling: input.gain_ceiling,
        modulation: input.modulation || {},
        context: input.context || null,
        source: context.actor_id || context.source || 'human-ui',
      });
      bus?.publish?.(SOMATIC_CUE_EMITTED_EVENT, receipt, { source: 'somatic-interface' });
      return receipt;
    },
  });

  registry.registerCapability({
    capability_id: 'somatic.stop',
    service_id: 'somatic-interface',
    description: 'Immediately stop the active somatic cue.',
    authority: 'operate',
    execute: () => ({ stopped: Boolean(stopCue('OS stop')), reason: 'OS stop' }),
  });

  let unsubscribe = null;
  if (bus?.subscribe) {
    unsubscribe = bus.subscribe('arcsweep:feather-paused', () => { stopCue('Feather'); }, { id: 'somatic-feather-stop' });
  }

  return Object.freeze({
    service_id: 'somatic-interface',
    capabilities: ['somatic.status', 'somatic.list-cues', 'somatic.inspect-cue', 'somatic.emit-cue', 'somatic.stop'],
    destroy: () => unsubscribe?.(),
  });
}
