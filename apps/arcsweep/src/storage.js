import { validateImportedState } from './core.js';

const STORAGE_KEY = 'hearthgate.arcsweep.local.v0.1';

function uid(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultState() {
  const now = new Date().toISOString();
  return {
    version: '0.1.0',
    settings: {
      crLabel: 'Waking World',
      drLabel: 'Desired Reality',
      crMinutes: 60,
      drMinutes: 10080,
      returnAnchor: 'Notch',
      reduceMotion: false,
    },
    session: {
      active: false,
      startedAt: null,
      targetWorld: '',
      intention: '',
    },
    scripts: [
      {
        id: uid('script'),
        name: 'First DR Script',
        world: 'Unassigned',
        status: 'Draft I',
        content: 'Identity:\nEmbodiment:\nWorld:\nRelationships:\nArrival:\nReturn:',
        updatedAt: now,
      },
    ],
    continuity: [],
    manifestations: [],
    appearance: {
      name: '',
      form: '',
      sensorySignature: '',
      notes: '',
      updatedAt: now,
    },
    returnHistory: [],
  };
}

export function normaliseState(value) {
  const imported = validateImportedState(value);
  const defaults = createDefaultState();
  return {
    ...defaults,
    ...imported,
    settings: { ...defaults.settings, ...(imported.settings || {}) },
    session: { ...defaults.session, ...(imported.session || {}) },
    appearance: { ...defaults.appearance, ...(imported.appearance || {}) },
    scripts: Array.isArray(imported.scripts) ? imported.scripts : defaults.scripts,
    continuity: Array.isArray(imported.continuity) ? imported.continuity : [],
    manifestations: Array.isArray(imported.manifestations) ? imported.manifestations : [],
    returnHistory: Array.isArray(imported.returnHistory) ? imported.returnHistory : [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normaliseState(JSON.parse(raw)) : createDefaultState();
  } catch (error) {
    console.warn('[Hearthgate: Arcsweep] Could not load state; using defaults.', error);
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function newId(prefix) {
  return uid(prefix);
}

export function downloadState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hearthgate-arcsweep-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readStateFile(file) {
  const text = await file.text();
  return normaliseState(JSON.parse(text));
}
