export const TOYBOX_SCHEMA = 'wayglass.toybox/v0.1';
export const SENSORY_PROFILE_SCHEMA = 'wayglass.sensory-profile/v0.1';

const profiles = Object.freeze({
  quiet: Object.freeze({
    id: 'quiet',
    label: 'Soft',
    motion: 0.28,
    particle_density: 0.45,
    glow: 0.42,
    contrast: 0.72,
    audio_gain: 0.35,
    haptic_scale: 0.45,
    trail_persistence: 0.86,
    description: 'Slow, soft, rounded, low-density sensory expression.',
  }),
  balanced: Object.freeze({
    id: 'balanced',
    label: 'Balanced',
    motion: 0.62,
    particle_density: 0.72,
    glow: 0.68,
    contrast: 0.88,
    audio_gain: 0.58,
    haptic_scale: 0.7,
    trail_persistence: 0.72,
    description: 'Moderate movement, detail, sound and haptic expression.',
  }),
  sparkly: Object.freeze({
    id: 'sparkly',
    label: 'Sparkly',
    motion: 1,
    particle_density: 1,
    glow: 1,
    contrast: 1,
    audio_gain: 0.82,
    haptic_scale: 1,
    trail_persistence: 0.58,
    description: 'Fast, crisp, bright and highly reactive sensory expression.',
  }),
});

export const TOYBOX_TOYS = Object.freeze([
  Object.freeze({
    toy_id: 'mote-herd',
    label: 'Mote Herd',
    kind: 'visual-kinetic',
    verbs: Object.freeze(['attract', 'repel', 'swirl']),
    inputs: Object.freeze(['pointer', 'touch', 'keyboard-controls']),
    outputs: Object.freeze(['motion', 'light']),
    purpose: 'Move a flock of luminous motes with no task attached.',
  }),
  Object.freeze({
    toy_id: 'ghost-trace',
    label: 'Ghost Trace',
    kind: 'visual-drawing',
    verbs: Object.freeze(['trace', 'layer', 'clear']),
    inputs: Object.freeze(['pointer', 'touch']),
    outputs: Object.freeze(['light', 'temporal-trail']),
    purpose: 'Draw luminous wakes that fade at the pace you choose.',
  }),
  Object.freeze({
    toy_id: 'click-garden',
    label: 'Click Garden',
    kind: 'tactile-toggle',
    verbs: Object.freeze(['press', 'toggle', 'pattern']),
    inputs: Object.freeze(['pointer', 'touch', 'keyboard']),
    outputs: Object.freeze(['light', 'optional-haptic']),
    purpose: 'A field of satisfying state changes that does not become a checklist.',
  }),
  Object.freeze({
    toy_id: 'vibe-stone',
    label: 'Vibe Stone',
    kind: 'haptic',
    verbs: Object.freeze(['pulse', 'wave', 'heartbeat']),
    inputs: Object.freeze(['pointer', 'touch', 'keyboard']),
    outputs: Object.freeze(['optional-haptic']),
    purpose: 'User-triggered vibration patterns on supported devices.',
  }),
  Object.freeze({
    toy_id: 'sound-nest',
    label: 'Sound Nest',
    kind: 'audio',
    verbs: Object.freeze(['hum', 'pink-noise', 'brown-noise', 'stop']),
    inputs: Object.freeze(['pointer', 'touch', 'keyboard']),
    outputs: Object.freeze(['audio']),
    purpose: 'Layer-free local sound textures generated in the browser after explicit activation.',
  }),
  Object.freeze({
    toy_id: 'time-puddle',
    label: 'Time Puddle',
    kind: 'visual-time',
    verbs: Object.freeze(['fill', 'drain', 'pause', 'reset']),
    inputs: Object.freeze(['pointer', 'touch', 'keyboard']),
    outputs: Object.freeze(['visual-progress']),
    purpose: 'A non-scolding visual container for a chosen span of time.',
  }),
]);

export function listToyboxToys() {
  return TOYBOX_TOYS.map(toy => ({ ...toy, verbs: [...toy.verbs], inputs: [...toy.inputs], outputs: [...toy.outputs] }));
}

export function resolveSensoryProfile(id = 'balanced', { reducedMotion = false } = {}) {
  const base = profiles[id] || profiles.balanced;
  if (!reducedMotion) return Object.freeze({ schema: SENSORY_PROFILE_SCHEMA, ...base, reduced_motion: false });
  return Object.freeze({
    schema: SENSORY_PROFILE_SCHEMA,
    ...base,
    motion: 0,
    particle_density: Math.min(base.particle_density, 0.5),
    trail_persistence: Math.max(base.trail_persistence, 0.9),
    reduced_motion: true,
    description: base.description + ' Browser reduced-motion preference suppresses autonomous motion while preserving interaction.',
  });
}

export function listSensoryProfiles() {
  return Object.keys(profiles).map(id => resolveSensoryProfile(id));
}

export function toyboxSnapshot({ profile = 'balanced', reducedMotion = false, hapticsAvailable = false, audioAvailable = false } = {}) {
  return Object.freeze({
    schema: TOYBOX_SCHEMA,
    profile: resolveSensoryProfile(profile, { reducedMotion }),
    toys: listToyboxToys(),
    capabilities: Object.freeze({
      haptics: hapticsAvailable === true,
      audio: audioAvailable === true,
    }),
    rule: 'Toys are optional sensory play. They do not diagnose, score productivity, infer interior state, or change participant authority.',
  });
}
