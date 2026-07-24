const STORAGE_KEY = 'hearthgate.lifa.local.v0.1';

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

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...parsed,
      settings: { ...defaults.settings, ...parsed.settings },
      session: { ...defaults.session, ...parsed.session },
      appearance: { ...defaults.appearance, ...parsed.appearance },
      scripts: Array.isArray(parsed.scripts) ? parsed.scripts : defaults.scripts,
      continuity: Array.isArray(parsed.continuity) ? parsed.continuity : [],
      manifestations: Array.isArray(parsed.manifestations) ? parsed.manifestations : [],
      returnHistory: Array.isArray(parsed.returnHistory) ? parsed.returnHistory : [],
    };
  } catch (error) {
    console.warn('[LIFA Local] Could not load state; using defaults.', error);
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
  link.download = `lifa-local-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readStateFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The selected file does not contain a LIFA state object.');
  }
  return parsed;
}
