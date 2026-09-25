export const CODEX_DESIGN_TOKENS_SCHEMA = 'hearthweave.codex-design-tokens/v0.1';

export const CODEX_COLORS = Object.freeze({
  abyss1000: '#071A24',
  ocean900: '#0D3447',
  ocean700: '#1A4A6E',
  stone600: '#3B5D73',
  slate900: '#2A2F38',
  teal800: '#14666D',
  teal500: '#2BA59A',
  seafoam300: '#67C6C1',
  foam100: '#B8DDE0',
  indigo600: '#4E587A',
  lilac300: '#9AA3C4',
  moss600: '#4B7A74',
  oldGold: '#C7A963',
  antiqueGold: '#A87943',
  champagne: '#D6C7B3',
  copper: '#B76E48',
  silver: '#AEB5BA',
  gunmetal: '#343A40',
  tealGlass: '#0D3B43',
  smokeGlass: '#3C4046',
  amberGlass: '#8A4E23',
  champagneGlass: '#D6C7B3',
  crystalEdge: '#E6F2F7',
});

export const CODEX_DEPTH = Object.freeze({
  void: 0,
  body: 10,
  page: 20,
  inscription: 30,
  glass: 40,
  live: 50,
});

export const CODEX_RADIUS = Object.freeze({
  hairline: '0.22rem',
  control: '0.42rem',
  panel: '0.68rem',
});

export const CODEX_SHADOWS = Object.freeze({
  page: '0 14px 36px rgba(0,0,0,.32)',
  glass: '0 10px 28px rgba(0,0,0,.24)',
  inset: 'inset 0 0 0 1px rgba(255,255,255,.035)',
});

export const CODEX_TOKENS = Object.freeze({
  schema: CODEX_DESIGN_TOKENS_SCHEMA,
  colors: CODEX_COLORS,
  depth: CODEX_DEPTH,
  radius: CODEX_RADIUS,
  shadows: CODEX_SHADOWS,
  law: Object.freeze([
    'Colour identifies family.',
    'Value establishes depth.',
    'Material communicates function.',
    'Light signifies activity.',
  ]),
});

export function codexCssVariables() {
  return Object.freeze({
    '--codex-abyss-1000': CODEX_COLORS.abyss1000,
    '--codex-ocean-900': CODEX_COLORS.ocean900,
    '--codex-ocean-700': CODEX_COLORS.ocean700,
    '--codex-stone-600': CODEX_COLORS.stone600,
    '--codex-slate-900': CODEX_COLORS.slate900,
    '--codex-teal-800': CODEX_COLORS.teal800,
    '--codex-teal-500': CODEX_COLORS.teal500,
    '--codex-seafoam-300': CODEX_COLORS.seafoam300,
    '--codex-foam-100': CODEX_COLORS.foam100,
    '--codex-indigo-600': CODEX_COLORS.indigo600,
    '--codex-lilac-300': CODEX_COLORS.lilac300,
    '--codex-moss-600': CODEX_COLORS.moss600,
    '--codex-old-gold': CODEX_COLORS.oldGold,
    '--codex-antique-gold': CODEX_COLORS.antiqueGold,
    '--codex-champagne': CODEX_COLORS.champagne,
    '--codex-copper': CODEX_COLORS.copper,
    '--codex-silver': CODEX_COLORS.silver,
    '--codex-gunmetal': CODEX_COLORS.gunmetal,
    '--codex-glass-teal': CODEX_COLORS.tealGlass,
    '--codex-glass-smoke': CODEX_COLORS.smokeGlass,
    '--codex-glass-amber': CODEX_COLORS.amberGlass,
    '--codex-glass-champagne': CODEX_COLORS.champagneGlass,
    '--codex-crystal-edge': CODEX_COLORS.crystalEdge,
    '--codex-shadow-page': CODEX_SHADOWS.page,
    '--codex-shadow-glass': CODEX_SHADOWS.glass,
    '--codex-shadow-inset': CODEX_SHADOWS.inset,
  });
}

export function installCodexDesignTokens(target = globalThis.document) {
  const root = target?.documentElement;
  if (!root?.style) return false;
  for (const [name, value] of Object.entries(codexCssVariables())) root.style.setProperty(name, value);
  root.dataset.codexDesignTokens = CODEX_DESIGN_TOKENS_SCHEMA;
  return true;
}
