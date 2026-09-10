import { ARCSWEEP_OS_MANIFEST } from './version.js';

const STORAGE_KEY = 'arcsweep.os.context/v1';
const MAX_CAPSULES = 64;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function createContextPersistence({ storage = null, key = STORAGE_KEY } = {}) {
  function available() {
    return Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function');
  }

  function load() {
    if (!available()) return null;
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.schema !== 'arcsweep.os-context-state/v1') return null;
      if (parsed?.session?.schema !== 'arcsweep.os-session/v1') return null;
      const capsules = Array.isArray(parsed.capsules)
        ? parsed.capsules.filter((item) => item?.schema === ARCSWEEP_OS_MANIFEST.contracts.contextCapsule).slice(-MAX_CAPSULES)
        : [];
      return {
        schema: parsed.schema,
        session: clone(parsed.session),
        capsules: clone(capsules),
        saved_at: parsed.saved_at || null,
      };
    } catch {
      return null;
    }
  }

  function save({ session, capsules = [] } = {}) {
    if (!available() || session?.schema !== 'arcsweep.os-session/v1') return false;
    const state = {
      schema: 'arcsweep.os-context-state/v1',
      session: clone(session),
      capsules: clone(capsules.slice(-MAX_CAPSULES)),
      saved_at: new Date().toISOString(),
    };
    try {
      storage.setItem(key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    if (!available() || typeof storage.removeItem !== 'function') return false;
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({
    key,
    available,
    load,
    save,
    clear,
  });
}

export { STORAGE_KEY as ARCSWEEP_OS_CONTEXT_STORAGE_KEY };
