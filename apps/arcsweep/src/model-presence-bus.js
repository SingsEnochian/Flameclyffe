import { getConstellationRuntimeVoiceStatus } from './constellation-runtime-adapter.js';
import { WRITER_CONTEXT_EVENTS } from './writer-context-resolver.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import { CONSTELLATION_RUNTIME_EVENTS } from './constellation-runtime-adapter.js';

export const MODEL_PRESENCE_SCHEMA = 'arcsweep.model-presence/v1';
export const MODEL_PRESENCE_EVENT = 'arcsweep:model-presence';
export const MODEL_PRESENCE_STATES = Object.freeze([
  'offline',
  'waking',
  'ready',
  'thinking',
  'speaking',
  'degraded',
  'error',
]);

const STATE_SET = new Set(MODEL_PRESENCE_STATES);
const presence = new Map();
let installed = false;

function nowIso() {
  return new Date().toISOString();
}

function text(value) {
  return String(value ?? '').trim();
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function normalisePresenceState(status) {
  const value = text(status).toLowerCase();
  if (STATE_SET.has(value)) return value;
  if (['house-offline', 'voice-unregistered', 'voice-id-required'].includes(value)) return 'offline';
  if (['house-route-defined', 'checking', 'connecting'].includes(value)) return 'waking';
  if (['model-unavailable', 'runtime-unreachable', 'route-unavailable', 'runtime-mismatch', 'unavailable', 'route-error'].includes(value)) return 'degraded';
  if (['voice-error', 'error'].includes(value)) return 'error';
  if (['replied', 'live'].includes(value)) return 'ready';
  return 'degraded';
}

export function createModelPresence({
  voiceId,
  displayName = null,
  state = 'offline',
  provider = null,
  model = null,
  route = null,
  latencyMs = null,
  worldId = null,
  runtimeWorldContextId = null,
  task = null,
  reason = null,
  observedAt = nowIso(),
} = {}) {
  const id = text(voiceId).toLowerCase();
  if (!id) throw new Error('MODEL_PRESENCE: voiceId is required');
  const normalised = normalisePresenceState(state);
  return deepFreeze({
    schema: MODEL_PRESENCE_SCHEMA,
    voice_id: id,
    display_name: text(displayName) || id,
    state: normalised,
    provider: text(provider) || null,
    model: text(model) || null,
    route: text(route) || null,
    latency_ms: Number.isFinite(Number(latencyMs)) ? Number(latencyMs) : null,
    world_id: text(worldId) || null,
    runtime_world_context_id: text(runtimeWorldContextId) || null,
    task: text(task) || null,
    reason: text(reason) || null,
    observed_at: observedAt,
  });
}

export function currentModelPresence(voiceId = null) {
  if (voiceId) return clone(presence.get(text(voiceId).toLowerCase()) || null);
  return [...presence.values()].map(clone);
}

export function publishModelPresence(input, target = globalThis.document) {
  const previous = presence.get(text(input?.voiceId).toLowerCase()) || null;
  const next = createModelPresence({
    ...(previous ? {
      displayName: previous.display_name,
      provider: previous.provider,
      model: previous.model,
      route: previous.route,
      latencyMs: previous.latency_ms,
      worldId: previous.world_id,
      runtimeWorldContextId: previous.runtime_world_context_id,
      task: previous.task,
    } : {}),
    ...input,
  });
  presence.set(next.voice_id, next);
  if (target?.dispatchEvent && typeof CustomEvent !== 'undefined') {
    target.dispatchEvent(new CustomEvent(MODEL_PRESENCE_EVENT, { detail: clone(next) }));
  }
  return next;
}

export async function refreshModelPresence(voiceId, fetchImpl = fetch) {
  const id = text(voiceId).toLowerCase();
  publishModelPresence({ voiceId: id, state: 'waking', task: 'runtime-status-check' });
  try {
    const status = await getConstellationRuntimeVoiceStatus(id, fetchImpl);
    return publishModelPresence({
      voiceId: status.voiceId || id,
      displayName: status.displayName,
      state: status.status,
      provider: status.provider,
      model: status.model,
      route: status.route?.route || status.route,
      latencyMs: status.latencyMs,
      reason: status.runtimeError || status.detail || null,
      task: null,
    });
  } catch (error) {
    return publishModelPresence({ voiceId: id, state: 'error', reason: error?.message || String(error), task: null });
  }
}

function writerReady(event) {
  const packet = event.detail || {};
  for (const voice of packet.voices || []) {
    publishModelPresence({
      voiceId: voice.voiceId || voice.id,
      displayName: voice.displayName || voice.name,
      state: 'thinking',
      worldId: packet.fieldContext?.page?.worldId || null,
      task: packet.fieldContext?.field?.key || packet.mode || 'writer-context',
    });
  }
}

function runtimeState(event) {
  const detail = event.detail || {};
  if (!detail.voiceId) return;
  publishModelPresence({
    voiceId: detail.voiceId,
    state: detail.state,
    reason: detail.reason || detail.error || null,
    task: detail.fieldKey || null,
  });
}

function lensResponse(event) {
  const detail = event.detail || {};
  if (!detail.voiceId) return;
  publishModelPresence({
    voiceId: detail.voiceId,
    displayName: detail.voiceLabel,
    state: 'speaking',
    provider: detail.provider,
    model: detail.model,
    latencyMs: detail.latencyMs,
    worldId: detail.worldId || detail.fieldContext?.page?.worldId || null,
    runtimeWorldContextId: detail.runtimeWorldContextId,
    task: detail.fieldContext?.field?.key || detail.mode || null,
  });
  queueMicrotask(() => publishModelPresence({
    voiceId: detail.voiceId,
    state: 'ready',
    provider: detail.provider,
    model: detail.model,
    latencyMs: detail.latencyMs,
    worldId: detail.worldId || detail.fieldContext?.page?.worldId || null,
    runtimeWorldContextId: detail.runtimeWorldContextId,
    task: null,
  }));
}

export function installModelPresenceBus(target = globalThis.document) {
  if (installed || !target?.addEventListener) return;
  installed = true;
  target.addEventListener(WRITER_CONTEXT_EVENTS.ready, writerReady);
  target.addEventListener(CONSTELLATION_RUNTIME_EVENTS.state, runtimeState);
  target.addEventListener(CONSTELLATION_LENS_EVENTS.response, lensResponse);
}

if (typeof document !== 'undefined') installModelPresenceBus(document);
