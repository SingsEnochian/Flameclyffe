import { loadState, saveState, setStateExtensionSnapshot } from './storage.js';

const STATE_KEY = 'scriptCortex';

function cleanIds(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}

export function normaliseScriptCortexMetadata(value = {}) {
  const scriptId = String(value.scriptId || '').trim();
  if (!scriptId) throw new Error('Script cortex metadata requires a script id.');
  const order = value.storyOrder === '' || value.storyOrder == null ? null : Number(value.storyOrder);
  return {
    contract: 'arcsweep.script-cortex-metadata/v2',
    scriptId,
    worldId: String(value.worldId || '').trim().toLowerCase() || null,
    storyAt: String(value.storyAt || '').trim() || null,
    storyOrder: Number.isFinite(order) ? order : null,
    povCharacterId: String(value.povCharacterId || '').trim().toLowerCase() || null,
    narrativeVoiceId: String(value.narrativeVoiceId || '').trim().toLowerCase() || null,
    writingStyleId: String(value.writingStyleId || '').trim().toLowerCase() || null,
    sceneCharacterIds: cleanIds(value.sceneCharacterIds),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function normaliseStore(value = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const byScript = input.byScript && typeof input.byScript === 'object' && !Array.isArray(input.byScript) ? structuredClone(input.byScript) : {};
  return { schema: 'arcsweep.script-cortex-store/v2', version: 2, byScript };
}

async function loadStore() {
  const state = await loadState();
  const store = normaliseStore(state[STATE_KEY]);
  setStateExtensionSnapshot(STATE_KEY, store);
  return { state, store };
}

async function persist(state, store, reason) {
  state[STATE_KEY] = store;
  setStateExtensionSnapshot(STATE_KEY, store);
  await saveState(state, { reason });
  return store;
}

export async function loadScriptCortexMetadata(scriptId) {
  const id = String(scriptId || '').trim();
  if (!id) return null;
  const { store } = await loadStore();
  return store.byScript[id] ? structuredClone(store.byScript[id]) : null;
}

export async function saveScriptCortexMetadata(value) {
  const metadata = normaliseScriptCortexMetadata(value);
  const { state, store } = await loadStore();
  store.byScript[metadata.scriptId] = metadata;
  await persist(state, store, 'script-cortex-metadata-update');
  return { stored: true, metadata: structuredClone(metadata), storage: 'hearthfire-state' };
}

export async function deleteScriptCortexMetadata(scriptId) {
  const id = String(scriptId || '').trim();
  if (!id) return false;
  const { state, store } = await loadStore();
  const existed = Object.hasOwn(store.byScript, id);
  if (!existed) return false;
  delete store.byScript[id];
  await persist(state, store, 'script-cortex-metadata-delete');
  return true;
}

export async function listScriptCortexMetadata() {
  const { store } = await loadStore();
  return Object.values(store.byScript).map((item) => structuredClone(item));
}
