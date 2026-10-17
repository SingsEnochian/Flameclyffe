export const UNIVERSAL_SKIN_SCHEMA = 'hearthweave.universal-skin/v0.1';

const HEX_RE = /^#?[0-9a-f]{6}$/i;

function clamp8(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

export function normaliseHex(value) {
  const text = String(value || '').trim();
  if (!HEX_RE.test(text)) throw new Error(`Invalid six-digit hex colour: ${value}`);
  return `#${text.replace(/^#/, '').toUpperCase()}`;
}

export function hexToRgb(value) {
  const hex = normaliseHex(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => clamp8(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function mixHex(a, b, amount = 0.5) {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const t = Math.max(0, Math.min(1, Number(amount) || 0));
  return rgbToHex({
    r: left.r + (right.r - left.r) * t,
    g: left.g + (right.g - left.g) * t,
    b: left.b + (right.b - left.b) * t,
  });
}

function channelLuminance(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(a, b) {
  const light = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (light + 0.05) / (dark + 0.05);
}

function saturationScore(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function pickReadableText(candidate, background) {
  const options = [candidate, '#F8F6F0', '#FFFFFF'];
  return options.sort((a, b) => contrastRatio(b, background) - contrastRatio(a, background))[0];
}

function freezePack(pack) {
  return Object.freeze({
    ...pack,
    palette: Object.freeze([...pack.palette]),
    tokens: Object.freeze({ ...pack.tokens }),
    material: Object.freeze({ ...(pack.material || {}) }),
    namedColors: Object.freeze((pack.namedColors || []).map((entry) => Object.freeze({ ...entry }))),
    provenance: Object.freeze({ ...(pack.provenance || {}) }),
  });
}

export function createSkinPackFromPalette({
  id,
  name,
  colors,
  sourceKind = 'original',
  provenance = {},
  namedColors = [],
  tokenOverrides = {},
  material = {},
  radiusPanel = 18,
  radiusControl = 12,
  blur = 18,
} = {}) {
  if (!id || !name) throw new Error('Skin packs require id and name.');
  const palette = [...new Set((colors || []).map(normaliseHex))];
  if (palette.length < 3) throw new Error('Skin packs require at least three unique colours.');

  const byLight = [...palette].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const bySaturation = [...palette].sort((a, b) => saturationScore(b) - saturationScore(a));
  const darkest = byLight[0];
  const secondDark = byLight[Math.min(1, byLight.length - 1)];
  const lightest = byLight.at(-1);
  const accent = bySaturation[0];
  const accentSecondary = bySaturation.find((colour) => colour !== accent) || byLight[Math.floor(byLight.length / 2)];
  const accentCool = byLight[Math.floor(byLight.length / 2)];

  const bg = mixHex(darkest, '#05070A', 0.72);
  const bgAlt = mixHex(secondDark, '#090D12', 0.66);
  const panel = mixHex(darkest, secondDark, 0.48);
  const panelRaised = mixHex(panel, lightest, 0.12);
  const input = mixHex(bg, '#000000', 0.24);
  const text = pickReadableText(lightest, bg);
  const muted = mixHex(text, bgAlt, 0.48);
  const line = mixHex(accent, bg, 0.48);
  const lineSoft = mixHex(line, bg, 0.46);

  const tokens = {
    bg,
    bgAlt,
    sidebar: mixHex(bgAlt, bg, 0.36),
    panel,
    panelRaised,
    input,
    line,
    lineSoft,
    text,
    muted,
    accent,
    accentSecondary,
    accentCool,
    accentWarm: bySaturation[Math.min(2, bySaturation.length - 1)],
    accentDeep: darkest,
    danger: '#E68181',
    success: '#7FD5A4',
    shadow: '#000000',
    radiusPanel,
    radiusControl,
    blur,
    ...tokenOverrides,
  };

  return freezePack({
    schema: UNIVERSAL_SKIN_SCHEMA,
    id: String(id),
    name: String(name),
    sourceKind,
    palette,
    namedColors,
    provenance,
    tokens,
    material: {
      id: 'living-glass',
      family: 'glass',
      panelOpacity: 0.58,
      raisedOpacity: 0.72,
      inputOpacity: 0.72,
      blur,
      saturate: 1.16,
      borderAlpha: 0.48,
      highlightAlpha: 0.12,
      shadowAlpha: 0.48,
      glowAlpha: 0.14,
      tint: tokens.panel,
      rim: tokens.line,
      glow: tokens.accent,
      ...material,
    },
  });
}

export const ROWAN_SKIN_PALETTES = Object.freeze([
  { id: 'reeses-pieces', name: "Reese's Pieces", year: 2008, colors: ['#302F3D', '#324557', '#878787', '#D4A537', '#B00038'] },
  { id: 'delicate', name: 'Delicate', year: 2014, colors: ['#AFA574', '#A29D73', '#898D6A', '#6D7B62', '#4B644E'] },
  { id: 'to-the-nines', name: 'To the Nines', year: 2008, colors: ['#7A0C2F', '#99123D', '#B31547', '#ED3B41', '#FF9195'] },
  { id: 'help-is-on-the-way', name: 'Help Is On The Way', year: 2015, colors: ['#394FFF', '#0076FF', '#FF833B', '#E0E394', '#A4C400'] },
  { id: 'babylonian', name: 'Babylonian', year: 2015, colors: ['#0585AF', '#0C9D52', '#EA5800', '#B7A8A9', '#635254'] },
  { id: 'flowers', name: 'Flowers', year: 2015, colors: ['#567B84', '#7CC8FA', '#7ADCF7', '#C1E7FC', '#FFF0D7'] },
]);

export const ROWAN_NAMED_COLORS = Object.freeze([
  { hex: '#3D504B', name: 'Her Eyes Like Moss' },
  { hex: '#84A29A', name: 'In the Green' },
  { hex: '#988FBD', name: 'Gooseberry & Lilac' },
  { hex: '#342C54', name: 'Midnight Lilac' },
  { hex: '#280181', name: 'Lapis Winged' },
  { hex: '#012819', name: null, status: 'awaiting-name' },
]);

export const MOSS_LAPIS_SKIN = createSkinPackFromPalette({
  id: 'rowan-her-eyes-like-moss',
  name: 'Rowan · Her Eyes Like Moss',
  colors: ['#012819', '#3D504B', '#84A29A', '#988FBD', '#342C54', '#280181'],
  sourceKind: 'rowan-session',
  namedColors: ROWAN_NAMED_COLORS,
  provenance: {
    declaredBy: 'Rowan',
    declaredAt: '2026-10-01',
    ownerAuthorised: true,
    note: 'Built from Rowan-authored named colours supplied directly in session; #012819 remains intentionally unnamed.',
  },
  tokenOverrides: {
    bg: '#010E09',
    bgAlt: '#071B15',
    sidebar: '#081B16',
    panel: '#0B201A',
    panelRaised: '#132C26',
    input: '#06130F',
    line: '#3D504B',
    lineSoft: '#263A34',
    text: '#EEF5F2',
    muted: '#A9BCB6',
    accent: '#84A29A',
    accentSecondary: '#988FBD',
    accentCool: '#3D504B',
    accentWarm: '#988FBD',
    accentDeep: '#280181',
    shadow: '#000B07',
    radiusPanel: 24,
    radiusControl: 14,
    blur: 26,
  },
  material: {
    id: 'mossglass',
    family: 'glass',
    panelOpacity: 0.48,
    raisedOpacity: 0.66,
    inputOpacity: 0.68,
    blur: 26,
    saturate: 1.24,
    borderAlpha: 0.5,
    highlightAlpha: 0.14,
    shadowAlpha: 0.56,
    glowAlpha: 0.16,
    tint: '#0B201A',
    rim: '#84A29A',
    glow: '#280181',
  },
});

export const BUILTIN_SKIN_PACKS = Object.freeze([
  freezePack({
    schema: UNIVERSAL_SKIN_SCHEMA,
    id: 'hearthglass',
    name: 'Hearthglass',
    sourceKind: 'original',
    palette: ['#080B12', '#151923', '#F5EADF', '#F6C453', '#2D7A5F', '#6BB5D4'],
    namedColors: [],
    provenance: { note: 'Project-native default.' },
    tokens: {
      bg: '#080B12', bgAlt: '#111827', sidebar: '#101715', panel: '#151923', panelRaised: '#1D2230', input: '#0D1119',
      line: '#3D4353', lineSoft: '#262D39', text: '#F5EADF', muted: '#B7AEA8', accent: '#F6C453', accentSecondary: '#2D7A5F',
      accentCool: '#6BB5D4', accentWarm: '#C97A4A', accentDeep: '#111827', danger: '#DF7B7B', success: '#7FD5A4', shadow: '#000000', radiusPanel: 22, radiusControl: 12, blur: 16,
    },
    material: {
      id: 'hearthglass', family: 'glass', panelOpacity: 0.62, raisedOpacity: 0.76, inputOpacity: 0.74, blur: 16, saturate: 1.12,
      borderAlpha: 0.5, highlightAlpha: 0.12, shadowAlpha: 0.48, glowAlpha: 0.12, tint: '#151923', rim: '#3D4353', glow: '#F6C453',
    },
  }),
  MOSS_LAPIS_SKIN,
  ...ROWAN_SKIN_PALETTES.map((palette) => createSkinPackFromPalette({
    id: `rowan-${palette.id}`,
    name: `Rowan · ${palette.name}`,
    colors: palette.colors,
    sourceKind: 'rowan-owned',
    provenance: {
      profile: 'https://www.colourlovers.com/lover/brilliantrouble',
      year: palette.year,
      paletteName: palette.name,
      ownerAuthorised: true,
    },
  })),
]);

export function parsePaletteText(text) {
  const matches = String(text || '').match(/#[0-9a-f]{6}\b/gi) || [];
  const colours = [...new Set(matches.map(normaliseHex))];
  if (colours.length < 3) throw new Error('Paste at least three six-digit hex colours.');
  return colours.slice(0, 12);
}

export function findBuiltinSkin(id) {
  return BUILTIN_SKIN_PACKS.find((pack) => pack.id === id) || null;
}
