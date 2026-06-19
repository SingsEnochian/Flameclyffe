export const WORLD_NODE_KINDS = Object.freeze([
  'house',
  'room',
  'shrine',
  'city',
  'lab',
  'grove',
  'world',
  'instrument',
  'playfield',
  'gallery',
  'archive',
  'book',
  'custom',
]);

export const WORLD_NODE_VISIBILITY = Object.freeze({
  public: 'public',
  shared: 'shared',
  private: 'private',
  shrine: 'shrine',
});

export const WORLD_NODE_CONSENT = Object.freeze({
  open: 'open',
  askFirst: 'ask-first',
  explicitEntry: 'explicit-entry',
  inviteOnly: 'invite-only',
  locked: 'locked',
});

export function createWorldNode(overrides = {}) {
  return {
    id: '',
    kind: 'room',
    title: '',
    parentId: null,
    world: 'starwell',
    access: {
      visibility: WORLD_NODE_VISIBILITY.private,
      consent: WORLD_NODE_CONSENT.askFirst,
      exitRoute: 'templehouse',
      shared: false,
      ageGate: null,
    },
    theme: {
      biome: 'velvet-twilight',
      palette: 'moon-gold-blackwood',
      motion: 'safe',
      contrast: 'normal',
    },
    soundscape: {
      enabled: false,
      autoplay: false,
      muted: true,
      intensity: 0,
      layers: [],
    },
    narrative: {
      canonLayer: 'draft',
      tone: 'gentle-threshold',
      allowedGuides: [],
      ambiguity: 'preserve',
    },
    embodiment: {
      typing: 'soft-pulse',
      touch: 'gentle-ripple',
      pointer: 'hover-glow',
      motion: 'permission-required',
      haptics: 'off',
      gaze: 'future-opt-in',
    },
    participants: {
      allowed: [],
      invited: [],
      waiting: [],
      blocked: [],
    },
    ...overrides,
  };
}

export function validateWorldNode(node) {
  const errors = [];
  if (!node || typeof node !== 'object') errors.push('World node must be an object.');
  if (!node?.id) errors.push('World node requires id.');
  if (!node?.title) errors.push('World node requires title.');
  if (!WORLD_NODE_KINDS.includes(node?.kind)) errors.push(`Unknown world node kind: ${node?.kind}`);
  if (!node?.access?.exitRoute) errors.push('World node requires an access.exitRoute return path.');
  if (node?.soundscape?.autoplay) errors.push('World node soundscape.autoplay must remain false in v0.1.');
  if (node?.access?.visibility === WORLD_NODE_VISIBILITY.shrine && node?.access?.consent !== WORLD_NODE_CONSENT.explicitEntry) {
    errors.push('Shrine nodes require explicit-entry consent.');
  }
  return errors;
}
