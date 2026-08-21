import { publishSocketEnvelope } from './projectZeroSocket.js';
import { PROJECT_ZERO_COMPANION_OWNERSHIP } from './ownershipBoundary.js';

export const DEEP_OBSERVER_BRIDGE_SCHEMA = 'flameclyffe.project-zero-companion.deep-observer-bridge/v1';
export const DEEP_OBSERVER_BRIDGE_STORAGE_KEY = 'flameclyffe:project-zero-companion:deep-observer-bridge/v1';
export const DEEP_OBSERVER_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
const MAX_RECEIPTS = 128;

function uid(prefix = 'deep-bridge') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function clamp01(value) {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

export function normaliseDeepObserverVector(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(DEEP_OBSERVER_AXES.map((axis) => [axis, clamp01(source[axis])]));
}

function vectorKey(vector) {
  return JSON.stringify(DEEP_OBSERVER_AXES.map((axis) => vector[axis]));
}

export function createDeepObserverBridgeReceipt({
  vector,
  source = 'deep-observer:update',
  observedAt = new Date().toISOString(),
  sourceReceiptId = null,
} = {}) {
  const normalised = normaliseDeepObserverVector(vector);
  return Object.freeze({
    schema: DEEP_OBSERVER_BRIDGE_SCHEMA,
    receipt_id: uid('deep-observer'),
    bridge_owner: PROJECT_ZERO_COMPANION_OWNERSHIP.bridge_owner,
    integration_target: PROJECT_ZERO_COMPANION_OWNERSHIP.integration_target,
    project_zero_core_authority: false,
    source,
    source_receipt_id: sourceReceiptId,
    observed_at: observedAt,
    deep_vector: normalised,
    availability: Object.fromEntries(DEEP_OBSERVER_AXES.map((axis) => [axis, normalised[axis] == null ? 'unavailable' : 'observed'])),
    vector_key: vectorKey(normalised),
    authority: {
      kind: 'companion-bridge-receipt',
      claims_external_consumption: false,
      claims_project_zero_adoption: false,
    },
  });
}

export function loadDeepObserverBridgeLedger(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DEEP_OBSERVER_BRIDGE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_RECEIPTS) : [];
  } catch {
    return [];
  }
}

export function persistDeepObserverBridgeReceipt(receipt, storage = globalThis.localStorage) {
  const current = loadDeepObserverBridgeLedger(storage);
  const last = current[current.length - 1];
  if (last?.vector_key === receipt.vector_key && last?.source === receipt.source) return last;
  const next = [...current, receipt].slice(-MAX_RECEIPTS);
  try { storage?.setItem(DEEP_OBSERVER_BRIDGE_STORAGE_KEY, JSON.stringify(next)); } catch {}
  return receipt;
}

export function emitDeepObserverBridgeReceipt(input = {}, { storage = globalThis.localStorage } = {}) {
  const receipt = persistDeepObserverBridgeReceipt(createDeepObserverBridgeReceipt(input), storage);
  publishSocketEnvelope({
    pluginId: 'deep-observer-bridge',
    channel: 'observer',
    type: 'observer.deep_state.received',
    requestId: receipt.receipt_id,
    payload: receipt,
  });
  return receipt;
}

export function installDeepObserverBridge(target = globalThis, storage = globalThis.localStorage) {
  if (!target?.addEventListener || target.__flameclyffeDeepObserverBridgeInstalled) return false;
  target.__flameclyffeDeepObserverBridgeInstalled = true;

  target.addEventListener('deep-observer:update', (event) => {
    emitDeepObserverBridgeReceipt({ vector: event.detail, source: 'deep-observer:update' }, { storage });
  });

  try {
    const restored = JSON.parse(storage?.getItem('runaDeepObserverState') || 'null');
    if (restored && typeof restored === 'object') {
      emitDeepObserverBridgeReceipt({ vector: restored, source: 'runaDeepObserverState:restore' }, { storage });
    }
  } catch {}

  return true;
}

if (typeof window !== 'undefined') installDeepObserverBridge(window, window.localStorage);
