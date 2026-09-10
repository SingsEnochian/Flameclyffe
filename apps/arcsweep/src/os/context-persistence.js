import { ARCSWEEP_OS_MANIFEST } from './version.js';

const STORAGE_KEY = 'arcsweep.os.context/v1';
const MAX_CAPSULES = 64;

export function normaliseContextState(parsed) {
  if (parsed?.schema !== 'arcsweep.os-context-state/v1' || parsed?.session?.schema !== 'arcsweep.os-session/v1'
    || !parsed.session.session_id || typeof parsed.session.active_room !== 'string') return null;
  return {
    schema: parsed.schema,
    session: clone(parsed.session),
    capsules: (Array.isArray(parsed.capsules) ? parsed.capsules : []).filter((item) =>
      item?.schema === ARCSWEEP_OS_MANIFEST.contracts.contextCapsule && item.session_id === parsed.session.session_id).slice(-MAX_CAPSULES).map(clone),
    receipts: (Array.isArray(parsed.receipts) ? parsed.receipts : []).filter((item) =>
      ['arcsweep.os-capability-receipt/v1', 'arcsweep.repair-receipt/v1'].includes(item?.schema)).slice(-32).map(clone),
    saved_at: parsed.saved_at || null,
  };
}

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
      return normaliseContextState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function save({ session, capsules = [], receipts = [] } = {}) {
    if (!available() || session?.schema !== 'arcsweep.os-session/v1') return false;
    const state = {
      schema: 'arcsweep.os-context-state/v1',
      session: clone(session),
      capsules: clone(capsules.slice(-MAX_CAPSULES)),
      receipts: clone(receipts.slice(-32)),
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
    capture: () => { if (!available()) throw new Error('Session context storage unavailable.'); return storage.getItem(key); },
    restore: (raw) => {
      if (!available()) throw new Error('Session context storage unavailable.');
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
    },
  });
}

export { STORAGE_KEY as ARCSWEEP_OS_CONTEXT_STORAGE_KEY };
