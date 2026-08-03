import {
  createBifrostBridgePacket,
  evolveTemporalState,
  premaqToTemporalState,
  projectWorldState,
  validateTemporalState,
} from './engine.js';
import { compressRelease } from './compression-release.js';

export const BIFROST_RUNTIME_VERSION = '0.2.0';
export const BIFROST_RUNTIME_SCHEMA = 'arcsweep.bifrost-dual-presence-runtime/v0.2';
export const BIFROST_STATE_STORAGE_KEY = 'arcsweep:bifrost-temporal-state:v2';
export const BIFROST_BRIDGE_STORAGE_KEY = 'arcsweep:bifrost-bridge-packet:v2';

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

function validateEnvelope(value) {
  if (!value) return null;
  if (value.schema === BIFROST_RUNTIME_SCHEMA) {
    return {
      schema: BIFROST_RUNTIME_SCHEMA,
      hearthside: validateTemporalState(value.hearthside),
      targetside: validateTemporalState(value.targetside),
    };
  }
  const legacy = validateTemporalState(value);
  return {
    schema: BIFROST_RUNTIME_SCHEMA,
    hearthside: legacy,
    targetside: clone(legacy),
  };
}

export function createArcsweepBifrostRuntime({ storage = globalThis.localStorage } = {}) {
  let envelope = null;
  let bridge = readJson(storage, BIFROST_BRIDGE_STORAGE_KEY);

  try {
    envelope = validateEnvelope(readJson(storage, BIFROST_STATE_STORAGE_KEY));
  } catch {
    envelope = null;
    storage?.removeItem?.(BIFROST_STATE_STORAGE_KEY);
  }

  function requireEnvelope() {
    if (!envelope) throw new Error('Bifröst temporal state is not initialised. Load a PREMAQ v2 packet first.');
    return envelope;
  }

  function persistEnvelope(next) {
    envelope = validateEnvelope(next);
    writeJson(storage, BIFROST_STATE_STORAGE_KEY, envelope);
    return clone(envelope.targetside);
  }

  return Object.freeze({
    version: BIFROST_RUNTIME_VERSION,
    schema: BIFROST_RUNTIME_SCHEMA,
    initialise(premaq, options = {}) {
      const initial = premaqToTemporalState(premaq, options);
      bridge = null;
      storage?.removeItem?.(BIFROST_BRIDGE_STORAGE_KEY);
      return persistEnvelope({
        schema: BIFROST_RUNTIME_SCHEMA,
        hearthside: initial,
        targetside: clone(initial),
      });
    },
    evolve(options = {}) {
      const current = requireEnvelope();
      return persistEnvelope({
        ...current,
        targetside: evolveTemporalState(current.targetside, options),
      });
    },
    cycle(options = {}) {
      const current = requireEnvelope();
      return persistEnvelope({
        ...current,
        targetside: compressRelease(current.targetside, options),
      });
    },
    compressRelease(options = {}) {
      const current = requireEnvelope();
      return persistEnvelope({
        ...current,
        targetside: compressRelease(current.targetside, options),
      });
    },
    bridge({ premaq, targetside, ...options } = {}) {
      const current = requireEnvelope();
      const packet = createBifrostBridgePacket({
        premaq,
        hearthside: current.hearthside,
        targetside: targetside ? validateTemporalState(targetside) : current.targetside,
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
      return clone(envelope?.targetside ?? null);
    },
    getHearthside() {
      return clone(envelope?.hearthside ?? null);
    },
    getTargetside() {
      return clone(envelope?.targetside ?? null);
    },
    getBridge() {
      return clone(bridge);
    },
    clear() {
      envelope = null;
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
  if (target.dispatchEvent && globalThis.CustomEvent) {
    target.dispatchEvent(new CustomEvent('arcsweep:bifrost-ready', {
      detail: { version: runtime.version, schema: runtime.schema },
    }));
  }
  return runtime;
}
