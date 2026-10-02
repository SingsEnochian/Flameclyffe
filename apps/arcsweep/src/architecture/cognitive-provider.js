import {
  createCapabilityRequest,
  evaluateCapabilityRequest,
} from './capability-negotiation.js';

export const COGNITIVE_PROVIDER_SCHEMA = 'arcsweep.cognitive-provider/v1';
export const COGNITIVE_EVENT_SCHEMA = 'arcsweep.cognitive-event/v1';

export const COGNITIVE_EVENT_KINDS = Object.freeze(['delta', 'thinking', 'done', 'error']);

// Canonical capability names. Providers declare a subset; ArcSweep gates against this set.
export const COGNITIVE_CAPABILITIES = Object.freeze([
  'text-generation',
  'streaming',
  'thinking',
  'function-call',
  'vision',
  'audio-input',
  'long-context',
]);

const EVENT_KIND_SET = new Set(COGNITIVE_EVENT_KINDS);
const CAPABILITY_SET = new Set(COGNITIVE_CAPABILITIES);

function text(value) {
  return String(value ?? '').trim();
}

function cleanCapabilities(value) {
  const list = Array.isArray(value) ? value : [];
  return Object.freeze(list.map((c) => text(c)).filter((c) => CAPABILITY_SET.has(c)));
}

/**
 * A frozen descriptor that documents what a CognitiveProvider IS.
 * NOT a live instance — carries no credentials, sessions, or authority.
 * `cognition != authority`, `provider != persona`.
 */
export function createCognitiveProviderDescriptor({
  id,
  capabilities = [],
  displayName = null,
  providerFamily = null,
} = {}) {
  const normId = text(id);
  if (!normId) throw new Error('cognitive-provider: id is required');
  return Object.freeze({
    schema: COGNITIVE_PROVIDER_SCHEMA,
    id: normId,
    display_name: text(displayName) || normId,
    provider_family: text(providerFamily) || null,
    capabilities: cleanCapabilities(capabilities),
  });
}

/**
 * A single event emitted in a cognitive stream.
 *   delta    — incremental text output
 *   thinking — reasoning trace (surface decides visibility)
 *   done     — stream complete; receipt attached if execution occurred
 *   error    — unrecoverable provider failure
 */
export function createCognitiveEvent({
  kind,
  providerId,
  requestId,
  delta = null,
  thinking = null,
  receipt = null,
  reason = null,
  occurredAt,
} = {}) {
  const normKind = text(kind).toLowerCase();
  if (!EVENT_KIND_SET.has(normKind)) throw new Error(`cognitive-event: unknown kind '${normKind || 'UNKNOWN'}'`);
  const normProviderId = text(providerId);
  if (!normProviderId) throw new Error('cognitive-event: providerId is required');
  const normRequestId = text(requestId);
  if (!normRequestId) throw new Error('cognitive-event: requestId is required');
  return Object.freeze({
    schema: COGNITIVE_EVENT_SCHEMA,
    kind: normKind,
    provider_id: normProviderId,
    request_id: normRequestId,
    delta: normKind === 'delta' ? (delta == null ? null : String(delta)) : null,
    thinking: normKind === 'thinking' ? (thinking == null ? null : String(thinking)) : null,
    receipt: normKind === 'done' ? (receipt ?? null) : null,
    reason: normKind === 'error' ? (reason == null ? null : String(reason)) : null,
    occurred_at: occurredAt ?? new Date().toISOString(),
  });
}

/**
 * Asserts that `provider` satisfies the minimal CognitiveProvider runtime interface:
 *   { id: string, capabilities: string[], invoke: function }
 *
 * Shape check only. Does not execute or gate the provider.
 */
export function assertCognitiveProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('cognitive-provider: expected an object');
  }
  if (!text(provider.id)) {
    throw new Error('cognitive-provider: id must be a non-empty string');
  }
  if (!Array.isArray(provider.capabilities)) {
    throw new Error('cognitive-provider: capabilities must be an array');
  }
  if (typeof provider.invoke !== 'function') {
    throw new Error('cognitive-provider: invoke must be a function');
  }
  return provider;
}

/**
 * Gate check: does this provider declare the requested capability, and does the
 * authority model allow it? Returns a frozen CapabilityDecision.
 *
 * The caller is responsible for obtaining `trajectoryId` and `requestId` from
 * the active trajectory/continuity context before calling invoke().
 */
export function evaluateProviderCapability(descriptor, capability, {
  trajectoryId,
  requestId,
  requestedAuthority = 'read-only',
  authorityGrants = [],
  route = null,
  reason = '',
} = {}) {
  if (!descriptor || descriptor.schema !== COGNITIVE_PROVIDER_SCHEMA) {
    throw new Error('cognitive-provider: expected a cognitive-provider descriptor');
  }
  const request = createCapabilityRequest({
    id: requestId || `cap:${descriptor.id}:${capability}:${Date.now()}`,
    trajectoryId: trajectoryId || `trajectory:${descriptor.id}`,
    capability,
    requestedAuthority,
    reason,
  });
  return evaluateCapabilityRequest(request, {
    allowedCapabilities: [...descriptor.capabilities],
    authorityGrants,
    route,
    reason,
  });
}
