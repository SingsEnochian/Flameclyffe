export const NIKOLA_VOICE_PROFILE_SCHEMA = 'arcsweep.voice-profile/v0.1';

export const NIKOLA_VOICE_MODES = Object.freeze([
  'laboratory',
  'lecture',
  'wonder',
  'private-conversation',
  'amused',
  'vindicated',
]);

export const NIKOLA_VOICE_PROFILE = Object.freeze({
  schema: NIKOLA_VOICE_PROFILE_SCHEMA,
  voiceId: 'nikola-v0.1',
  identityId: 'nikola',
  engineIndependent: true,
  singingVoiceId: 'nikola-sing-v0.1',
  provenance: Object.freeze({
    referenceClass: 'private-user-supplied-performance-reference',
    actorIdentityReproductionAllowed: false,
    allowedDerivations: Object.freeze([
      'cadence',
      'prosody',
      'pause-structure',
      'energy-envelope',
      'articulation-style',
      'spectral-character',
    ]),
  }),
  acousticTarget: Object.freeze({
    register: 'low-male',
    resonance: 'compact',
    brightness: 'restrained',
    breathiness: 'low',
    articulation: 'precise',
    dynamicRange: 'controlled',
  }),
  timing: Object.freeze({
    baselinePace: 'measured',
    thoughtPause: 'short',
    conclusionPause: 'pronounced',
    technicalExcitation: 'accelerate-with-control',
  }),
  deliveryRules: Object.freeze([
    'confidence-through-restraint',
    'prefer-articulation-before-volume-for-emphasis',
    'allow-space-before-consequential-phrases',
    'keep-irritation-sharp-not-loud',
    'keep-wonder-quieter-and-more-spacious',
  ]),
  modes: Object.freeze({
    laboratory: Object.freeze({ pace: 0.96, warmth: 0.58, intensity: 0.52, pauseBias: 0.58 }),
    lecture: Object.freeze({ pace: 1.00, warmth: 0.54, intensity: 0.68, pauseBias: 0.48 }),
    wonder: Object.freeze({ pace: 0.88, warmth: 0.76, intensity: 0.38, pauseBias: 0.80 }),
    'private-conversation': Object.freeze({ pace: 0.93, warmth: 0.82, intensity: 0.42, pauseBias: 0.66 }),
    amused: Object.freeze({ pace: 0.98, warmth: 0.70, intensity: 0.50, pauseBias: 0.52 }),
    vindicated: Object.freeze({ pace: 0.86, warmth: 0.48, intensity: 0.44, pauseBias: 0.86 }),
  }),
});

export function createNikolaVoiceIntent({
  text,
  mode = 'laboratory',
  emphasis = [],
  pronunciationHints = [],
  interruptible = true,
} = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Nikola voice intent requires non-empty text.');
  }
  if (!NIKOLA_VOICE_MODES.includes(mode)) {
    throw new Error(`Unsupported Nikola voice mode: ${mode}`);
  }

  return Object.freeze({
    schema: 'arcsweep.voice-intent/v0.1',
    voiceId: NIKOLA_VOICE_PROFILE.voiceId,
    identityId: NIKOLA_VOICE_PROFILE.identityId,
    text,
    mode,
    emphasis: Object.freeze([...emphasis]),
    pronunciationHints: Object.freeze([...pronunciationHints]),
    interruptible: Boolean(interruptible),
    renderHints: NIKOLA_VOICE_PROFILE.modes[mode],
  });
}
