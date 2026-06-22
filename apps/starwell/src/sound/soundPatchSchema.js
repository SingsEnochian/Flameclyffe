export const SOUND_ENGINE_TARGETS = Object.freeze({
  contractOnly: 'contract-only',
  runaSpatial: 'runa-spatial',
  flameSound: 'flame-sound',
  starwellRoute: 'starwell-route',
});

export const SOUND_PATCH_STATES = Object.freeze({
  defined: 'defined',
  proposed: 'proposed',
  playbackDisabled: 'playback-disabled',
});

export const SOUND_LAYER_TYPES = Object.freeze({
  carrier: 'carrier',
  ambience: 'ambience',
  cue: 'cue',
  hapticProxy: 'haptic-proxy',
});

export const SOUND_CONFIRMATION_POLICIES = Object.freeze({
  userGesture: 'user-gesture',
  askFirst: 'ask-first',
  explicitApproval: 'explicit-approval',
  disabled: 'disabled',
});

export function createSoundLayer(overrides = {}) {
  const base = {
    id: '',
    type: SOUND_LAYER_TYPES.carrier,
    label: '',
    frequencyHz: null,
    waveform: 'sine',
    gain: 0,
    enabled: false,
    spatial: {
      enabled: false,
      radius: 0,
      orbitSeconds: null,
      elevation: 0,
    },
    notes: [],
  };

  return {
    ...base,
    ...overrides,
    spatial: { ...base.spatial, ...(overrides.spatial ?? {}) },
    notes: overrides.notes ?? base.notes,
  };
}

export function createSoundPatch(overrides = {}) {
  const base = {
    id: '',
    title: '',
    intent: 'focused-listening',
    engine: SOUND_ENGINE_TARGETS.contractOnly,
    state: SOUND_PATCH_STATES.defined,
    playback: {
      enabled: false,
      autoplay: false,
      muted: true,
      requiresUserGesture: true,
      confirmation: SOUND_CONFIRMATION_POLICIES.disabled,
    },
    safety: {
      featherStop: true,
      plainPass: true,
      maxGain: 0.08,
      fadeInSeconds: 0.25,
      fadeOutSeconds: 0.25,
      highFrequencyLimitHz: 1000,
      orbitOptional: true,
    },
    routing: {
      rooms: [],
      presence: [],
      lanternwireEvents: [],
    },
    layers: [],
    notes: [],
  };

  return {
    ...base,
    ...overrides,
    playback: { ...base.playback, ...(overrides.playback ?? {}) },
    safety: { ...base.safety, ...(overrides.safety ?? {}) },
    routing: { ...base.routing, ...(overrides.routing ?? {}) },
    layers: overrides.layers ?? base.layers,
    notes: overrides.notes ?? base.notes,
  };
}

export function validateSoundPatch(patch) {
  const errors = [];
  if (!patch || typeof patch !== 'object') errors.push('Sound patch must be an object.');
  if (!patch?.id) errors.push('Sound patch requires id.');
  if (!patch?.title) errors.push('Sound patch requires title.');
  if (!Object.values(SOUND_ENGINE_TARGETS).includes(patch?.engine)) errors.push(`Unknown sound engine target: ${patch?.engine}`);
  if (!Object.values(SOUND_PATCH_STATES).includes(patch?.state)) errors.push(`Unknown sound patch state: ${patch?.state}`);
  if (patch?.playback?.enabled) errors.push('Sound patch playback.enabled must remain false in Portal Kernel v0.1.');
  if (patch?.playback?.autoplay) errors.push('Sound patch playback.autoplay must remain false.');
  if (!patch?.playback?.requiresUserGesture) errors.push('Sound patches require a user gesture before any future playback.');
  if (patch?.playback?.confirmation === SOUND_CONFIRMATION_POLICIES.disabled && patch?.playback?.enabled) {
    errors.push('Disabled confirmation cannot accompany enabled playback.');
  }
  if (!patch?.safety?.featherStop) errors.push('Sound patches require Feather Stop.');
  if (!patch?.safety?.plainPass) errors.push('Sound patches require Plain Pass.');
  if (patch?.safety?.maxGain > 0.12) errors.push('Sound patch maxGain must stay at or below 0.12 in v0.1.');
  if (patch?.safety?.maxGain < 0) errors.push('Sound patch maxGain cannot be negative.');

  for (const layer of patch?.layers ?? []) {
    errors.push(...validateSoundLayer(layer, patch));
  }

  return errors;
}

export function validateSoundLayer(layer, patch = {}) {
  const errors = [];
  if (!layer || typeof layer !== 'object') errors.push('Sound layer must be an object.');
  if (!layer?.id) errors.push('Sound layer requires id.');
  if (!Object.values(SOUND_LAYER_TYPES).includes(layer?.type)) errors.push(`Unknown sound layer type: ${layer?.type}`);
  if (layer?.enabled) errors.push(`${layer.id} must remain disabled in Portal Kernel v0.1.`);
  if (layer?.gain < 0) errors.push(`${layer?.id ?? 'Sound layer'} gain cannot be negative.`);
  if (layer?.gain > (patch?.safety?.maxGain ?? 0.08)) errors.push(`${layer.id} gain exceeds patch safety.maxGain.`);
  if (typeof layer?.frequencyHz === 'number' && layer.frequencyHz > (patch?.safety?.highFrequencyLimitHz ?? 1000)) {
    errors.push(`${layer.id} exceeds highFrequencyLimitHz.`);
  }
  if (layer?.spatial?.enabled && !patch?.safety?.orbitOptional) {
    errors.push(`${layer.id} spatial orbit must remain optional.`);
  }
  return errors;
}
