import { findSoundPatch } from './portalSoundRegistry.js';
import { validateSoundPatch } from './soundPatchSchema.js';

export function createYggdrasilLlmSoundPatch(overrides = {}) {
  const base = {
    id: 'yggdrasil-llm-sound-refinement-v0-1',
    title: 'Yggdrasil LLM Sound Refinement v0.1',
    status: 'proposal-only',
    presenceNamespace: 'presence:yggdrasil',
    livePlayback: false,
    permissions: {
      maySuggestPatch: true,
      mayDescribeIntent: true,
      mayStartPlayback: false,
      mayChangeVolume: false,
      mayBypassConsent: false,
      mayWriteCanon: false,
    },
    safety: {
      featherStopsImmediately: true,
      plainPassMutesMythicLanguage: true,
      requiresVisibleProvenance: true,
      requiresUserGestureForFuturePlayback: true,
    },
    mapping: {
      worldNode: 'room-to-patch suggestion only',
      inputWeather: 'may shape proposal language only',
      deepVector: 'future bounded parameter source, not active in v0.1',
      lanternwire: 'future event route, not active playback',
    },
  };

  return {
    ...base,
    ...overrides,
    permissions: { ...base.permissions, ...(overrides.permissions ?? {}) },
    safety: { ...base.safety, ...(overrides.safety ?? {}) },
    mapping: { ...base.mapping, ...(overrides.mapping ?? {}) },
  };
}

export function validateYggdrasilLlmSoundPatch(patch = createYggdrasilLlmSoundPatch()) {
  const errors = [];
  if (!patch?.id) errors.push('Yggdrasil LLM sound patch requires id.');
  if (patch?.status !== 'proposal-only') errors.push('Yggdrasil LLM sound patch must remain proposal-only in v0.1.');
  if (patch?.livePlayback) errors.push('Yggdrasil LLM sound patch cannot enable live playback in v0.1.');
  if (patch?.permissions?.mayStartPlayback) errors.push('Yggdrasil LLM sound patch may not start playback.');
  if (patch?.permissions?.mayChangeVolume) errors.push('Yggdrasil LLM sound patch may not change volume.');
  if (patch?.permissions?.mayBypassConsent) errors.push('Yggdrasil LLM sound patch may not bypass consent.');
  if (patch?.permissions?.mayWriteCanon) errors.push('Yggdrasil LLM sound patch may not write canon.');
  if (!patch?.safety?.featherStopsImmediately) errors.push('Yggdrasil LLM sound patch requires Feather Stop.');
  if (!patch?.safety?.plainPassMutesMythicLanguage) errors.push('Yggdrasil LLM sound patch requires Plain Pass support.');
  return errors;
}

export function createYggdrasilSoundProposal({
  patchId = 'yggdrasil_root_breath',
  roomId = 'ygg-gate',
  requester = 'presence:yggdrasil',
  reason = 'llm-refinement',
} = {}) {
  const patch = findSoundPatch(patchId);
  if (!patch) {
    return soundProposalError(`Unknown sound patch: ${patchId}`, { patchId, roomId, requester, reason });
  }

  const validationErrors = validateSoundPatch(patch);
  if (validationErrors.length) {
    return soundProposalError(`Invalid sound patch: ${validationErrors.join(' ')}`, { patchId, roomId, requester, reason });
  }

  return {
    proposalOnly: true,
    isError: false,
    playbackEnabled: false,
    sound: false,
    haptics: false,
    patchId: patch.id,
    roomId,
    requester,
    reason,
    confirmationRequired: patch.playback.confirmation,
    userGestureRequired: patch.playback.requiresUserGesture,
    featherStop: patch.safety.featherStop,
    plainPass: patch.safety.plainPass,
    provenance: 'local sound proposal / no playback / no hidden audio',
    patchSummary: {
      id: patch.id,
      title: patch.title,
      intent: patch.intent,
      engine: patch.engine,
      state: patch.state,
      maxGain: patch.safety.maxGain,
      rooms: patch.routing.rooms,
      layerCount: patch.layers.length,
      layers: patch.layers.map((layer) => ({
        id: layer.id,
        type: layer.type,
        label: layer.label,
        frequencyHz: layer.frequencyHz,
        waveform: layer.waveform,
        gain: layer.gain,
        spatial: layer.spatial,
      })),
    },
  };
}

function soundProposalError(message, context) {
  return {
    proposalOnly: true,
    isError: true,
    playbackEnabled: false,
    sound: false,
    haptics: false,
    message,
    ...context,
  };
}
