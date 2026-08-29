export const SOUND_ORGAN_REGISTRY_VERSION = 'arcsweep.sound-organs/v1';

export const SOUND_ORGANS = Object.freeze([
  Object.freeze({
    id: 'sound-room',
    label: 'Sound Room',
    glyph: '♫',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '[data-story-soundscape]',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=sound-room',
    deployedPath: 'apps/arcsweep/index.html',
    sourceOwner: 'apps/arcsweep/src/story-soundscape.js',
    description: 'The existing ArcSweep World Sound Mixer, story-event audio, stems, MIDI, recording, and world hum.',
  }),
  Object.freeze({
    id: 'runa',
    label: 'Runa',
    glyph: 'ᚱ',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.synaptic-heartfield',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=runa',
    deployedPath: 'apps/arcsweep/index.html',
    sourceOwner: 'apps/arcsweep/src/synaptic-heartfield.js',
    description: 'Runa auditory coherence instrument, preserving the existing Synaptic Heartfield implementation.',
  }),
  Object.freeze({
    id: 'tone-lab',
    label: 'Tone Lab',
    glyph: '◉',
    kind: 'external',
    pagesHref: '/Flameclyffe/starwell-react-lab/world-tone-approval/',
    deployedPath: 'starwell-react-lab/world-tone-approval/index.html',
    sourceOwner: 'apps/starwell/world-tone-approval/index.html',
    description: 'Existing somatic World-Tone Gate for audition, compression-release geometry, device routing, and explicit approval.',
  }),
  Object.freeze({
    id: 'sound-banks',
    label: 'Sound Banks',
    glyph: '▤',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.soundfont-rack',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=sound-banks',
    deployedPath: 'apps/arcsweep/index.html',
    sourceOwner: 'apps/arcsweep/src/story-soundscape.js',
    description: 'Existing local SoundFont bank loader and preset rack, repaired to use a bundled AudioWorklet asset.',
  }),
  Object.freeze({
    id: 'haptics',
    label: 'Haptics',
    glyph: '≋',
    kind: 'native-focus',
    roomId: 'theme',
    focusSelector: '.sound-output-row',
    pagesHref: '/Flameclyffe/apps/arcsweep/?soundOrgan=haptics',
    deployedPath: 'apps/arcsweep/index.html',
    sourceOwner: 'apps/arcsweep/src/story-soundscape.js',
    description: 'Existing ArcSweep cue haptics and output controls, with Tone Lab carrying the external somatic gate.',
  }),
]);

export function soundOrgan(id) {
  return SOUND_ORGANS.find((organ) => organ.id === id) || null;
}
