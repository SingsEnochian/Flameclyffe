import { defineHouseProfile } from '../contracts.js';

// Axes: [P, C, R, E, M, A, Q]
// Terra Aeterna physics: resonant work heightens presence; deep entanglement
// tensions coherence; memory grounds agency; qualia feeds resonance.
const TERRA_AETERNA_JACOBIAN = Object.freeze([
  Object.freeze([1,    0,     0.08, 0,     0,     0,    0    ]), // P ← R
  Object.freeze([0,    1,     0,   -0.07,  0,     0,    0    ]), // C ← −E
  Object.freeze([0.05, 0,     1,    0,     0,     0,    0.09 ]), // R ← P, Q
  Object.freeze([0,    0,     0,    1,     0,     0,    0    ]), // E self-only
  Object.freeze([0,    0.04,  0,    0,     1,     0,    0    ]), // M ← C
  Object.freeze([0,    0,     0,    0,     0.07,  1,    0    ]), // A ← M
  Object.freeze([0.06, 0,     0.09, 0,     0,     0,    1    ]), // Q ← P, R
]);

export const terraAeternaProfile = defineHouseProfile({
  id: 'terra-aeterna',
  name: 'Terra Aeterna',
  world: 'Terra Aeterna',
  theme: 'terra-aeterna',
  language: 'kelyran-en',
  calendar: 'terra-v0.1',
  clock: { timeZone: 'America/New_York', format: '24h', worldTime: true },
  canon: {
    foundation: {
      id: 'terra-aeterna-novelverse',
      name: 'Terra Aeterna Novelverse',
      version: 'terra-canon/0.1',
      source_class: 'authored-canon-foundation',
      authority: 'foundation-only',
    },
    overlay: {
      id: 'templehouse-continuity',
      name: 'Templehouse continuity overlay',
      version: 'templehouse-continuity/0.1',
      source_class: 'authored-overlay',
      authority: 'overlay-only',
    },
  },
  sovereignty: {
    foundation_preserved: true,
    overlay_silently_merges: false,
    house_identity_preserved: true,
    crossing_may_commit_canon: false,
  },
  temporalProfile: {
    timeline: 'terra-aeterna-v0.1',
    initialDelta: 1,
    bridgeCoupling: 0.08,
    compressionRelease: {
      focusAxis: 'Q',
      enterThreshold: 0.82,
      releaseThreshold: 0.68,
      compressionGain: 1,
      releaseFraction: 0.35,
      derivativeRelease: 0.08,
      memoryRelease: 0.04,
      phaseReleaseGain: Math.PI / 4,
      radialGain: 0.5,
      entropyGain: 0.1,
      angularGain: Math.PI / 3,
      temporalWeights: { fold: 0.55, derivative: 0.20, entropy: 0.15, phase: 0.10 },
    },
  },
  harmonicIdentity: {
    voice: 'hearthlight-north-star-lochflame',
    baseCarrierHz: 144,
    beatFloorHz: 3.69,
    beatCeilingHz: 7.38,
    anchorInterval: 'perfect-fifth',
    livingInterval: 'minor-third',
    compressionReleaseTone: {
      toneLayerId: 'hearthlight-root',
      rootHz: 220,
      excursion: 5,
      approvalState: 'pending',
      approvalReceiptId: null,
    },
  },
  visualIdentity: {
    structure: 'stonewood-moon-lattice',
    atmosphere: 'black-diamond-shore-and-three-moons',
    palette: ['bone-white', 'hearth-copper', 'seaglass', 'moss', 'north-star-gold'],
  },
  culturalIdentity: {
    arrivalPrompt: 'A traveller reaches Hearthweave without displacing the life already rooted there.',
    receptionPrompt: 'Templehouse answers through Stonewood, memory, chosen kinship, and the laws of the three moons.',
    values: ['loyalty', 'love', 'joy', 'compassion'],
  },
  transferFunctions: {
    version: 'terra-transfer/1.1.0',
    source_axes: ['P', 'C', 'R', 'E', 'M', 'A', 'Q'],
    outputs: ['glyph', 'tone', 'visual', 'haptic', 'narrative'],
    jacobianVersion: 'terra-jacobian/world-coupled-v1',
    jacobian: TERRA_AETERNA_JACOBIAN,
  },
  packages: [
    'hearthgate.design',
    'hearthgate.arcsweep',
    'terra.canon',
    'kelyran.language',
    'kelyran.glyphs',
    'deep.observer',
    'runa.audio',
  ],
  rooms: ['hearth', 'library', 'foundry', 'observatory', 'laboratory', 'conservatory', 'archive', 'house', 'bridge', 'ledger'],
  capabilities: {
    observer: true,
    audio: true,
    glyphs: true,
    canon: true,
    timeline: true,
    dualAspect: true,
    compressionRelease: true,
  },
});
