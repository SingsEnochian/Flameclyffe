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
  });
}

export { WORKSPACE_SCHEMA, DEFAULT_KEY as WORKSPACE_STORAGE_KEY };
