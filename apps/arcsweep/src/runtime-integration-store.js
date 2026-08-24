import { ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA } from './runtime-integration-envelope.js';

export const RUNTIME_INTEGRATION_STORAGE_KEY = 'arcsweep.runtime-integration-envelope/v1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cleanWorldId(value) {
  const id = String(value || '').trim();
  return id || null;
}

export function runtimeIntegrationStorageKey(worldId = null) {
  const id = cleanWorldId(worldId);
  return id ? `${RUNTIME_INTEGRATION_STORAGE_KEY}:${encodeURIComponent(id)}` : RUNTIME_INTEGRATION_STORAGE_KEY;
}

export function serialiseRuntimeIntegrationEnvelope(envelope) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime integration store requires a valid envelope.');
  }
  return JSON.stringify(envelope);
}

export function parseRuntimeIntegrationEnvelope(raw) {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
  if (parsed?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) return null;
  return parsed;
}

export function saveRuntimeIntegrationEnvelope(envelope, storage = globalThis.localStorage, worldId = null) {
  const serialised = serialiseRuntimeIntegrationEnvelope(envelope);
  const resolvedWorldId = cleanWorldId(worldId)
    || cleanWorldId(envelope?.world?.identity_anchor?.world_id)
    || cleanWorldId(envelope?.world?.world_id)
    || cleanWorldId(envelope?.world?.id);
  storage?.setItem?.(runtimeIntegrationStorageKey(resolvedWorldId), serialised);
  return clone(envelope);
}

export function loadRuntimeIntegrationEnvelope(storage = globalThis.localStorage, worldId = null) {
  try {
    const scoped = parseRuntimeIntegrationEnvelope(storage?.getItem?.(runtimeIntegrationStorageKey(worldId)));
    if (scoped) return scoped;
    if (cleanWorldId(worldId)) {
      const legacy = parseRuntimeIntegrationEnvelope(storage?.getItem?.(RUNTIME_INTEGRATION_STORAGE_KEY));
      const legacyWorldId = cleanWorldId(legacy?.world?.identity_anchor?.world_id)
        || cleanWorldId(legacy?.world?.world_id)
        || cleanWorldId(legacy?.world?.id);
      return legacyWorldId === cleanWorldId(worldId) ? legacy : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearRuntimeIntegrationEnvelope(storage = globalThis.localStorage, worldId = null) {
  storage?.removeItem?.(runtimeIntegrationStorageKey(worldId));
}
