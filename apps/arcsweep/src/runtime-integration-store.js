import { ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA } from './runtime-integration-envelope.js';

export const RUNTIME_INTEGRATION_STORAGE_KEY = 'arcsweep.runtime-integration-envelope/v1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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

export function saveRuntimeIntegrationEnvelope(envelope, storage = globalThis.localStorage) {
  const serialised = serialiseRuntimeIntegrationEnvelope(envelope);
  storage?.setItem?.(RUNTIME_INTEGRATION_STORAGE_KEY, serialised);
  return clone(envelope);
}

export function loadRuntimeIntegrationEnvelope(storage = globalThis.localStorage) {
  try {
    return parseRuntimeIntegrationEnvelope(storage?.getItem?.(RUNTIME_INTEGRATION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearRuntimeIntegrationEnvelope(storage = globalThis.localStorage) {
  storage?.removeItem?.(RUNTIME_INTEGRATION_STORAGE_KEY);
}
