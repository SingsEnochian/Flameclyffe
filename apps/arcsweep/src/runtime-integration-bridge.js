import {
  ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA,
  buildRuntimeIntegrationEnvelope,
  updateRuntimePresence,
  appendRuntimeFeedback,
} from './runtime-integration-envelope.js';
import { CONSTELLATION_RUNTIME_EVENTS } from './constellation-runtime-adapter.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';

export const RUNTIME_INTEGRATION_EVENTS = Object.freeze({
  changed: 'arcsweep:runtime-integration-changed',
});

const STATUS_TO_PRESENCE = Object.freeze({
  ready: 'ready',
  checking: 'waking',
  waking: 'waking',
  thinking: 'thinking',
  speaking: 'speaking',
  replied: 'ready',
  quiet: 'ready',
  refused: 'ready',
  'house-offline': 'offline',
  'runtime-unreachable': 'offline',
  'model-unavailable': 'degraded',
  unavailable: 'degraded',
  'route-unavailable': 'degraded',
  'route-error': 'error',
  'runtime-mismatch': 'error',
  'voice-error': 'error',
});

let activeEnvelope = null;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function runtimePresenceFromStatus(status) {
  return STATUS_TO_PRESENCE[String(status || '').trim().toLowerCase()] || 'degraded';
}

export function initialiseRuntimeIntegrationEnvelope(input = {}) {
  activeEnvelope = buildRuntimeIntegrationEnvelope(input);
  return clone(activeEnvelope);
}

export function readRuntimeIntegrationEnvelope() {
  return clone(activeEnvelope);
}

export function replaceRuntimeIntegrationEnvelope(envelope) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime integration bridge requires a valid envelope.');
  }
  activeEnvelope = clone(envelope);
  return clone(activeEnvelope);
}

export function applyRuntimeStatusToEnvelope(envelope, detail = {}) {
  const voiceId = String(detail.voiceId || detail.voice_id || '').trim();
  if (!voiceId) return clone(envelope);
  return updateRuntimePresence(envelope, voiceId, runtimePresenceFromStatus(detail.state || detail.status));
}

export function applyLensReplyToEnvelope(envelope, detail = {}) {
  const voiceId = String(detail.voiceId || detail.voice_id || '').trim();
  if (!voiceId) return clone(envelope);
  let next = updateRuntimePresence(envelope, voiceId, detail.kind === 'quiet' || detail.kind === 'refusal' ? 'ready' : 'speaking');
  next = appendRuntimeFeedback(next, {
    id: detail.requestId ? `lens-${detail.requestId}-${voiceId}` : undefined,
    voice_id: voiceId,
    kind: detail.kind || 'observation',
    text: detail.text || '',
    supporting_receipts: [
      detail.runtimeWorldContextId,
      ...(Array.isArray(detail.citedSources) ? detail.citedSources : []),
    ].filter(Boolean),
    created_at: detail.createdAt || new Date().toISOString(),
  });
  return next;
}

function publish() {
  if (typeof document === 'undefined' || !activeEnvelope) return;
  document.dispatchEvent(new CustomEvent(RUNTIME_INTEGRATION_EVENTS.changed, { detail: clone(activeEnvelope) }));
}

export function installRuntimeIntegrationBridge({ initialEnvelope } = {}) {
  if (initialEnvelope) replaceRuntimeIntegrationEnvelope(initialEnvelope);
  if (typeof document === 'undefined') return;

  document.addEventListener(CONSTELLATION_RUNTIME_EVENTS.state, (event) => {
    if (!activeEnvelope) return;
    activeEnvelope = applyRuntimeStatusToEnvelope(activeEnvelope, event.detail || {});
    publish();
  });

  document.addEventListener(CONSTELLATION_LENS_EVENTS.response, (event) => {
    if (!activeEnvelope) return;
    activeEnvelope = applyLensReplyToEnvelope(activeEnvelope, event.detail || {});
    publish();
  });
}
