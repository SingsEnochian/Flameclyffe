export const CREATIVE_ORGANS = Object.freeze([
  {
    id: 'glyph-lab',
    label: 'Glyph Lab',
    glyph: '◇',
    family: 'glyph',
    description: 'Draw, edit, layer, colour, letter, save and export glyph projects in the existing STARWELL Glyph Studio.',
    pagesHref: '/Flameclyffe/starwell-react-lab/glyph-studio/',
    deployedPath: 'starwell-react-lab/glyph-studio/index.html',
    sourcePath: 'apps/starwell/glyph-studio/index.html',
    implementation: 'STARWELL Glyph Studio',
  },
  {
    id: 'brush-foundry',
    label: 'Brush Foundry',
    glyph: '⌇',
    family: 'glyph',
    description: 'Open the existing Glyph Studio brush library and inspector without creating a second brush engine.',
    pagesHref: '/Flameclyffe/starwell-react-lab/glyph-studio/?panel=brush',
    deployedPath: 'starwell-react-lab/glyph-studio/index.html',
    sourcePath: 'apps/starwell/src/components/glyph-studio/BrushPanel.jsx',
    implementation: 'STARWELL Glyph Studio · BrushPanel',
  },
  {
    id: 'living-glyph',
    label: 'Living Glyph',
    glyph: '✺',
    family: 'glyph',
    description: 'The existing DEEP mathematical live-glyph instrument, mounted as its own deliberate surface.',
    pagesHref: '/Flameclyffe/starwell-react-lab/living-glyph/',
    deployedPath: 'starwell-react-lab/living-glyph/index.html',
    sourcePath: 'apps/starwell/src/live-glyph.jsx',
    implementation: 'STARWELL LiveGlyphViewer',
  },
  {
    id: 'font-foundry',
    label: 'Font Foundry',
    glyph: 'Ff',
    family: 'glyph',
    description: 'The existing local FontForge compiler dock with explicit health, package-only and offline states.',
    pagesHref: '/Flameclyffe/starwell-react-lab/font-foundry/',
    deployedPath: 'starwell-react-lab/font-foundry/index.html',
    sourcePath: 'apps/starwell/src/components/glyph-studio/FontForgeDock.jsx',
    implementation: 'STARWELL FontForgeDock',
  },
  {
    id: 'continuity-gate',
    label: 'Continuity Gate',
    glyph: '⌁',
    family: 'continuity',
    description: 'Import reviewed continuity, preserve boundary law and resolve bounded supplemental session context.',
    pagesHref: '/Flameclyffe/starwell-react-lab/arcsweep-continuity/',
    deployedPath: 'starwell-react-lab/arcsweep-continuity/index.html',
    sourcePath: 'apps/starwell/arcsweep-continuity/index.html',
    implementation: 'STARWELL Arcsweep Continuity Gate',
  },
]);

export const CREATIVE_ORGAN_IDS = Object.freeze(CREATIVE_ORGANS.map((organ) => organ.id));

export function creativeOrganById(id) {
  return CREATIVE_ORGANS.find((organ) => organ.id === id) || null;
}
