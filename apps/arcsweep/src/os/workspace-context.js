const WORKSPACE_SCHEMA = 'arcsweep.workspace-context/v1';
const DEFAULT_KEY = 'arcsweep.os.workspace-context.v1';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function boundedText(value, max = 240) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}

function sanitize(input = {}) {
  return Object.freeze(clone({
    schema: WORKSPACE_SCHEMA,
    active_world_id: boundedText(input.active_world_id, 160),
    active_project_id: boundedText(input.active_project_id, 160),
    active_scene_id: boundedText(input.active_scene_id, 160),
    active_document_id: boundedText(input.active_document_id, 160),
    active_room: boundedText(input.active_room, 120) || 'portal',
    current_goal: boundedText(input.current_goal, 240),
    presence_mode: boundedText(input.presence_mode, 80) || 'companion',
    updated_at: input.updated_at || new Date().toISOString(),
  }));
}

export function createWorkspaceContextStore({ storage = null, key = DEFAULT_KEY, now = () => new Date() } = {}) {
  function available() {
    return Boolean(storage?.getItem && storage?.setItem && storage?.removeItem);
  }

  function load() {
    if (!available()) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.schema !== WORKSPACE_SCHEMA) return null;
      return sanitize(parsed);
    } catch {
      return null;
    }
  }

  function save(session = {}) {
    if (!available()) return false;
    try {
      const record = sanitize({ ...session, updated_at: now().toISOString() });
      storage.setItem(key, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    if (!available()) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({
    schema: WORKSPACE_SCHEMA,
    key,
    available,
    load,
    save,
    clear,
    sanitize,
    restore: (record) => {
      if (!available()) throw new Error("Workspace mirror unavailable");
      if (record === null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(record));
    },
  });
}

export { WORKSPACE_SCHEMA, DEFAULT_KEY as WORKSPACE_STORAGE_KEY };

import { loadState, saveState, setStateExtensionSnapshot, clearStateExtensionSnapshot, readPersistedStateExtension } from '../storage.js';

export const OS_WORKSPACE_CONTEXT_KEY = 'arcsweepOSContext';

export function createWorkspaceContext({ load = loadState, save = saveState, read = readPersistedStateExtension,
  set = setStateExtensionSnapshot, clear = clearStateExtensionSnapshot } = {}) {
  let pending = Promise.resolve();
  function write(value) {
    const snapshot = structuredClone(value);
    const operation = pending.catch(() => {}).then(async () => {
      const previous = await read(OS_WORKSPACE_CONTEXT_KEY);
      const state = await load();
      set(OS_WORKSPACE_CONTEXT_KEY, snapshot);
      state[OS_WORKSPACE_CONTEXT_KEY] = snapshot;
      try {
        await save(state, { reason: 'arcsweep-os-context' });
        const actual = await read(OS_WORKSPACE_CONTEXT_KEY);
        if (JSON.stringify(actual) !== JSON.stringify(snapshot)) throw new Error('OS workspace context readback mismatch.');
        return { stored: true, storage: 'hearthfire-state', cloud_verified: false };
      } catch (error) {
        if (previous === null) clear(OS_WORKSPACE_CONTEXT_KEY);
        else set(OS_WORKSPACE_CONTEXT_KEY, previous);
        throw error;
      }
    });
    pending = operation;
    return operation;
  }
  return Object.freeze({
    read: () => read(OS_WORKSPACE_CONTEXT_KEY),
    write,
    activeContext: async () => {
      const state = await load();
      return { world_id: state.activeWorldId || null };
    },
  });
}
