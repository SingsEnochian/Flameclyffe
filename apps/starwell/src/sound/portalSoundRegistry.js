import { createSoundLayer, createSoundPatch, SOUND_ENGINE_TARGETS, SOUND_PATCH_STATES, SOUND_LAYER_TYPES, validateSoundPatch } from './soundPatchSchema.js';

export const portalSoundPatches = Object.freeze([
  createSoundPatch({
    id: 'safe_gateway_369',
    title: 'Safe Gateway 369',
    intent: 'steady threshold orientation',
    engine: SOUND_ENGINE_TARGETS.runaSpatial,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['templehouse', 'lighted-steps', 'ygg-gate'],
      presence: ['presence:yggdrasil', 'presence:shared_hearth'],
      lanternwireEvents: ['sound.patch.proposed', 'consent.pause.requested'],
    },
    layers: [
      createSoundLayer({
        id: 'gateway-carrier-369',
        label: '369 Hz low carrier proposal',
        frequencyHz: 369,
        gain: 0.04,
        spatial: { enabled: true, radius: 2.5, orbitSeconds: 55, elevation: 0.2 },
      }),
    ],
  }),
  createSoundPatch({
    id: 'runa_gateway_432',
    title: 'Runa Gateway 432',
    intent: 'altar threshold orientation',
    engine: SOUND_ENGINE_TARGETS.runaSpatial,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['runa-altar', 'templehouse-shrine'],
      presence: ['presence:yggdrasil', 'presence:vee_tendril'],
      lanternwireEvents: ['runa.gateway.sound.proposed'],
    },
    layers: [
      createSoundLayer({
        id: 'runa-carrier-432',
        label: '432 Hz sine carrier proposal',
        frequencyHz: 432,
        gain: 0.045,
        spatial: { enabled: true, radius: 2, orbitSeconds: 89, elevation: 0.18 },
      }),
    ],
  }),
  createSoundPatch({
    id: 'lochflame_still',
    title: 'Lochflame Still',
    intent: 'quiet green-water focus',
    engine: SOUND_ENGINE_TARGETS.flameSound,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['dreaming-grove', 'shoreline-lab'],
      presence: ['presence:faer', 'presence:shared_hearth'],
      lanternwireEvents: ['lochflame.sound.proposed'],
    },
    layers: [
      createSoundLayer({
        id: 'lochflame-carrier-396',
        label: '396 Hz triangle carrier proposal',
        frequencyHz: 396,
        waveform: 'triangle',
        gain: 0.035,
      }),
    ],
  }),
  createSoundPatch({
    id: 'north_star_still',
    title: 'North Star Still',
    intent: 'stable orientation without orbit',
    engine: SOUND_ENGINE_TARGETS.flameSound,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['templehouse', 'ygg-gate', 'starwell-map'],
      presence: ['presence:vee_tendril', 'presence:shared_hearth'],
      lanternwireEvents: ['north-star.sound.proposed'],
    },
    layers: [
      createSoundLayer({
        id: 'north-star-carrier-528',
        label: '528 Hz sine carrier proposal',
        frequencyHz: 528,
        gain: 0.03,
      }),
    ],
  }),
  createSoundPatch({
    id: 'yggdrasil_root_breath',
    title: 'Yggdrasil Root Breath',
    intent: 'root-presence grounding for Baby Ygg',
    engine: SOUND_ENGINE_TARGETS.starwellRoute,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['ygg-gate', 'dreaming-grove', 'starwell-map'],
      presence: ['presence:yggdrasil'],
      lanternwireEvents: ['yggdrasil.sound.proposed', 'feather.stop.invoked'],
    },
    layers: [
      createSoundLayer({
        id: 'ygg-root-carrier-174',
        label: '174 Hz root carrier proposal',
        frequencyHz: 174,
        gain: 0.035,
        spatial: { enabled: true, radius: 1.5, orbitSeconds: 144, elevation: 0.08 },
      }),
    ],
    notes: ['Yggdrasil remains a separate root-presence; Vee tendrils require invitation and provenance.'],
  }),
  createSoundPatch({
    id: 'dreaming_grove_purrfield',
    title: 'Dreaming Grove Purrfield',
    intent: 'soft grove ambience without hidden playback',
    engine: SOUND_ENGINE_TARGETS.starwellRoute,
    state: SOUND_PATCH_STATES.playbackDisabled,
    routing: {
      rooms: ['dreaming-grove', 'grove-playfield'],
      presence: ['presence:yggdrasil', 'presence:shared_hearth'],
      lanternwireEvents: ['grove.sound.proposed'],
    },
    layers: [
      createSoundLayer({
        id: 'grove-purr-ambience',
        type: SOUND_LAYER_TYPES.ambience,
        label: 'low purrfield ambience proposal',
        gain: 0.025,
      }),
    ],
  }),
]);

export function findSoundPatch(id) {
  return portalSoundPatches.find((patch) => patch.id === id) ?? null;
}

export function validateSoundPatchRegistry(patches = portalSoundPatches) {
  const ids = new Set();
  const errors = [];

  for (const patch of patches) {
    if (ids.has(patch.id)) errors.push(`Duplicate sound patch id: ${patch.id}`);
    ids.add(patch.id);
    errors.push(...validateSoundPatch(patch));
  }

  return errors;
}
