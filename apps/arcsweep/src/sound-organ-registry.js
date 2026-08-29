export const SOUND_ORGAN_REGISTRY_VERSION = 'arcsweep.sound-organs/v1';

export const SOUND_ORGANS = Object.freeze([
  Object.freeze({
    id: 'sound-room',
    label: 'Sound Room',
    glyph: '♫',
    family: 'sound',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '[data-story-soundscape]',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=sound-room',
    deployedPath: 'apps/arcsweep/index.html',
    sourcePath: 'apps/arcsweep/src/story-soundscape.js',
    implementation: 'ArcSweep StorySoundscape · World Sound Mixer',
    description: 'The existing ArcSweep World Sound Mixer, story-event audio, stems, MIDI, recording, and world hum.',
  }),
  Object.freeze({
    id: 'runa',
    label: 'Runa',
    glyph: 'ᚱ',
    family: 'sound',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.synaptic-heartfield',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=runa',
    deployedPath: 'apps/arcsweep/index.html',
    sourcePath: 'apps/arcsweep/src/synaptic-heartfield.js',
    implementation: 'ArcSweep Synaptic Heartfield · StorySoundscape',
    description: 'Runa auditory coherence instrument, preserving the existing Synaptic Heartfield implementation.',
  }),
  Object.freeze({
    id: 'tone-lab',
    label: 'Tone Lab',
    glyph: '◉',
    family: 'sound',
    kind: 'external',
    pagesHref: '/Flameclyffe/starwell-react-lab/world-tone-approval/',
    deployedPath: 'starwell-react-lab/world-tone-approval/index.html',
    sourcePath: 'apps/starwell/world-tone-approval/index.html',
    implementation: 'STARWELL Somatic World-Tone Gate',
    description: 'Existing somatic World-Tone Gate for audition, compression-release geometry, device routing, and explicit approval.',
  }),
  Object.freeze({
    id: 'sound-banks',
    label: 'Sound Banks',
    glyph: '▤',
    family: 'sound',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.soundfont-rack',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=sound-banks',
    deployedPath: 'apps/arcsweep/index.html',
    sourcePath: 'apps/arcsweep/src/story-soundscape.js',
    implementation: 'ArcSweep StorySoundscape · SoundFont rack',
    description: 'Existing local SoundFont bank loader and preset rack, repaired to use a bundled AudioWorklet asset.',
  }),
  Object.freeze({
    id: 'haptics',
    label: 'Haptics',
    glyph: '≋',
    family: 'sound',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.sound-output-row',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=haptics',
    deployedPath: 'apps/arcsweep/index.html',
    sourcePath: 'apps/arcsweep/src/story-soundscape.js',
    implementation: 'ArcSweep StorySoundscape · cue haptics',
    description: 'Existing ArcSweep cue haptics and output controls, with Tone Lab carrying the external somatic gate.',
  }),
]);

export const SOUND_ORGAN_IDS = Object.freeze(SOUND_ORGANS.map((organ) => organ.id));

export function soundOrgan(id) {
  return SOUND_ORGANS.find((organ) => organ.id === id) || null;
}
