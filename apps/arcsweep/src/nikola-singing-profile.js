export const NIKOLA_SINGING_PROFILE_SCHEMA = 'arcsweep.singing-voice-profile/v0.1';

export const NIKOLA_SINGING_MODES = Object.freeze([
  'story-song',
  'ballad',
  'electric-anthem',
  'wonder',
  'playful',
]);

export const NIKOLA_SINGING_PROFILE = Object.freeze({
  schema: NIKOLA_SINGING_PROFILE_SCHEMA,
  voiceId: 'nikola-sing-v0.1',
  identityId: 'nikola',
  engineIndependent: true,
  separateFromSpeechVoice: true,
  provenance: Object.freeze({
    referenceClass: 'private-user-supplied-music-reference',
    artistIdentityReproductionAllowed: false,
    sourceAudioRuntimeDependency: false,
    allowedDerivations: Object.freeze([
      'phrasing',
      'sustain-behaviour',
      'register-movement',
      'dynamic-shape',
      'speech-to-song-transition',
      'consonant-treatment',
      'vibrato-behaviour',
    ]),
    currentReferenceStatus: 'metadata-only-drm-blocked',
    currentReferenceNote:
      'The supplied M4P container is readable, but its protected AAC payload cannot be decoded reliably enough for acoustic measurement. Do not infer vocal measurements from failed decode output.',
  }),
  target: Object.freeze({
    register: 'baritone-leaning',
    delivery: 'narrative-first',
    sustain: 'controlled-not-operatic',
    vibrato: 'restrained-contextual',
    consonants: 'clear-through-sustain',
    grit: 'optional-low-to-moderate',
    dynamicShape: 'phrase-led',
    speechSongBridge: 'natural',
  }),
  renderingPolicy: Object.freeze({
    requireOriginalOrAuthorizedBaseVoice: true,
    requireScoreOrMelodyRepresentation: true,
    requireRenderReceipt: true,
    prohibitIdentityCloningFromReference: true,
    preferredEngineClasses: Object.freeze([
      'singing-voice-synthesis',
      'score-conditioned-vocal-synthesis',
    ]),
  }),
  candidateAdapters: Object.freeze([
    Object.freeze({ engine: 'diffsinger', role: 'primary-experimental' }),
    Object.freeze({ engine: 'openutau', role: 'interactive-score-front-end' }),
  ]),
  modes: Object.freeze({
    'story-song': Object.freeze({ intensity: 0.58, grit: 0.18, vibrato: 0.18, legato: 0.52 }),
    ballad: Object.freeze({ intensity: 0.44, grit: 0.08, vibrato: 0.28, legato: 0.72 }),
    'electric-anthem': Object.freeze({ intensity: 0.78, grit: 0.34, vibrato: 0.16, legato: 0.44 }),
    wonder: Object.freeze({ intensity: 0.34, grit: 0.02, vibrato: 0.22, legato: 0.78 }),
    playful: Object.freeze({ intensity: 0.62, grit: 0.12, vibrato: 0.14, legato: 0.46 }),
  }),
});

export function createNikolaSingingIntent({
  text,
  scoreRef,
  melodyRef = null,
  mode = 'story-song',
  key = null,
  tempoBpm = null,
  pronunciationHints = [],
} = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Nikola singing intent requires non-empty text.');
  }
  if (!scoreRef) {
    throw new Error('Nikola singing intent requires scoreRef.');
  }
  if (!NIKOLA_SINGING_MODES.includes(mode)) {
    throw new Error(`Unsupported Nikola singing mode: ${mode}`);
  }

  return Object.freeze({
    schema: 'arcsweep.singing-voice-intent/v0.1',
    voiceId: NIKOLA_SINGING_PROFILE.voiceId,
    identityId: NIKOLA_SINGING_PROFILE.identityId,
    text,
    scoreRef,
    melodyRef,
    mode,
    key,
    tempoBpm,
    pronunciationHints: Object.freeze([...pronunciationHints]),
    renderHints: NIKOLA_SINGING_PROFILE.modes[mode],
  });
}
