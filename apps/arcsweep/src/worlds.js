import { createDefaultAppletLayout } from './applets.js';

export const WORLD_SURFACES = [
  ['portal', 'Portal or doorway'],
  ['journal', 'Journal or codex'],
  ['mirror', 'Mirror or reflective surface'],
  ['pearl', 'Pearl, crystal, or carried object'],
  ['watch', 'Watch, clock, or timepiece'],
  ['moving-picture', 'Moving photograph or picture'],
  ['candle', 'Candle, flame, or light'],
  ['familiar', 'Animal, familiar, or companion'],
  ['custom', 'Custom world-native form'],
];

export const SUMMON_MODES = [
  ['phrase', 'Spoken or silent phrase'],
  ['gesture', 'Gesture or movement'],
  ['touch', 'Touch pattern'],
  ['object', 'Held or summoned object'],
  ['voice', 'Voice command'],
  ['presence', 'Appears when intentionally called'],
  ['none', 'Always available'],
];

export const VISIBILITY_MODES = [
  ['only-me', 'Only me'],
  ['approved', 'Me and approved people'],
  ['world-visible', 'Visible within this world'],
  ['custom', 'Custom visibility rule'],
];

function mergeAppletLayout(importedLayout) {
  const defaults = createDefaultAppletLayout();
  if (!Array.isArray(importedLayout)) return defaults;
  return defaults.map((defaultItem) => {
    const importedItem = importedLayout.find((item) => item?.id === defaultItem.id);
    return importedItem ? { ...defaultItem, ...importedItem } : defaultItem;
  });
}

export function createWorld(id, now = new Date().toISOString()) {
  return {
    id,
    name: 'Unassigned World',
    kind: 'Desired Reality',
    description: '',
    surface: {
      type: 'portal',
      name: 'Arcsweep',
      appearance: '',
      summonMode: 'phrase',
      summonCue: 'Arcsweep',
      veilEnabled: true,
      visibility: 'only-me',
      approvedPeople: '',
    },
    time: {
      wakingMinutes: 60,
      worldMinutes: 10080,
      pauseWhenAway: false,
      arrivalDate: '',
      arrivalTime: '',
    },
    arrival: {
      location: '',
      context: '',
      memories: '',
      orientation: 'I arrive calm, oriented, and able to recognise the people, place, date, and immediate situation.',
    },
    competencies: {
      languages: '',
      worldSystems: '',
      movement: '',
      socialContext: '',
      accessibility: '',
    },
    safetyWeave: {
      general: 'I remain safe, capable of choosing, and able to return by intention.',
      exclusions: '',
      returnAlwaysAvailable: true,
      anchorIntentGated: true,
    },
    recall: {
      onArrival: 'Relevant world memories and context are available without confusion.',
      onReturn: 'The Continuity Log preserves what I choose to carry forward.',
      selectiveForgetting: '',
    },
    companion: {
      enabled: false,
      name: '',
      form: '',
      role: '',
      communication: '',
      agency: 'This companion may speak honestly, refuse, negotiate, rest, change, and leave. Loyalty is relational, not compulsory.',
    },
    applets: createDefaultAppletLayout(),
    createdAt: now,
    updatedAt: now,
  };
}

export function normaliseWorld(value, fallbackId, now = new Date().toISOString()) {
  const defaults = createWorld(fallbackId, now);
  const world = value && typeof value === 'object' ? value : {};
  return {
    ...defaults,
    ...world,
    id: world.id || fallbackId,
    surface: { ...defaults.surface, ...(world.surface || {}) },
    time: { ...defaults.time, ...(world.time || {}) },
    arrival: { ...defaults.arrival, ...(world.arrival || {}) },
    competencies: { ...defaults.competencies, ...(world.competencies || {}) },
    safetyWeave: { ...defaults.safetyWeave, ...(world.safetyWeave || {}) },
    recall: { ...defaults.recall, ...(world.recall || {}) },
    companion: { ...defaults.companion, ...(world.companion || {}) },
    applets: mergeAppletLayout(world.applets),
  };
}

export function getActiveWorld(state) {
  return state.worlds?.find((world) => world.id === state.activeWorldId) || state.worlds?.[0] || null;
}

export function getSessionWorld(state) {
  return state.worlds?.find((world) => world.id === state.session?.targetWorldId) || getActiveWorld(state);
}

export function worldSurfaceLabel(world) {
  const match = WORLD_SURFACES.find(([id]) => id === world?.surface?.type);
  return match?.[1] || 'Custom world-native form';
}
