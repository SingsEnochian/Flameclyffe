import {
  collapseRelease,
  createBifrostBridgePacket,
  evolveTemporalState,
  premaqToTemporalState,
  projectWorldState,
  validateTemporalState,
} from './engine.js';

export const BIFROST_RUNTIME_VERSION = '0.1.0';
export const BIFROST_STATE_STORAGE_KEY = 'arcsweep:bifrost-temporal-state:v1';
export const BIFROST_BRIDGE_STORAGE_KEY = 'arcsweep:bifrost-bridge-packet:v1';

function clone(value) {
  return value == null ? null : structuredClone(value);
}

function readJson(storage, key) {
  if (!storage?.getItem) return null;
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch {
    storage.removeItem?.(key);
    return null;
  }
}

function writeJson(storage, key, value) {
  storage?.setItem?.(key, JSON.stringify(value));
}

export function createArcsweepBifrostRuntime({ storage = globalThis.localStorage } = {}) {
  let state = readJson(storage, BIFROST_STATE_STORAGE_KEY);
  let bridge = readJson(storage, BIFROST_BRIDGE_STORAGE_KEY);

  try {
    if (state) state = validateTemporalState(state);
  } catch {
    state = null;
    storage?.removeItem?.(BIFROST_STATE_STORAGE_KEY);
  }

  function requireState() {
    if (!state) throw new Error('Bifröst temporal state is not initialised. Load a PREMAQ v2 packet first.');
    return state;
  }

  function persistState(next) {
    state = validateTemporalState(next);
    writeJson(storage, BIFROST_STATE_STORAGE_KEY, state);
    return clone(state);
  }

  return Object.freeze({
    version: BIFROST_RUNTIME_VERSION,
    initialise(premaq, options = {}) {
      bridge = null;
      storage?.removeItem?.(BIFROST_BRIDGE_STORAGE_KEY);
      return persistState(premaqToTemporalState(premaq, options));
    },
    evolve(options = {}) {
      return persistState(evolveTemporalState(requireState(), options));
    },
    cycle(options = {}) {
      return persistState(collapseRelease(requireState(), options));
    },
    bridge({ premaq, targetside = state, ...options } = {}) {
      const packet = createBifrostBridgePacket({
        premaq,
        hearthside: requireState(),
        targetside: validateTemporalState(targetside),
        ...options,
      });
      bridge = packet;
      writeJson(storage, BIFROST_BRIDGE_STORAGE_KEY, bridge);
      return clone(bridge);
    },
    project(options = {}) {
      if (!bridge) throw new Error('Bifröst bridge packet is not available. Create the bridge first.');
      return projectWorldState(bridge, options);
    },
    getState() {
      return clone(state);
    },
    getBridge() {
      return clone(bridge);
    },
    clear() {
      state = null;
      bridge = null;
      storage?.removeItem?.(BIFROST_STATE_STORAGE_KEY);
      storage?.removeItem?.(BIFROST_BRIDGE_STORAGE_KEY);
    },
  });
}

export function installBifrostRuntime(target = globalThis, options = {}) {
  const runtime = createArcsweepBifrostRuntime(options);
  Object.defineProperty(target, 'ARCSWEEP_BIFROST', {
    value: runtime,
    configurable: true,
    enumerable: true,
    writable: false,
  });
  target.dispatchEvent?.(new CustomEvent('arcsweep:bifrost-ready', {
    detail: { version: runtime.version },
  }));
  return runtime;
}
