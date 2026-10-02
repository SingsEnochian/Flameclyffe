export const PRESENCE_SCHEMA = 'arcsweep.presence/v1';
export const PRESENCE_LINEAGE_RECEIPT_SCHEMA = 'arcsweep.presence-lineage-receipt/v1';
export const PRESENCE_UNKNOWN = 'UNKNOWN';

export const PRESENCE_PARTICIPATION_MODES = Object.freeze([
  'silent',
  'addressed',
  'reply-only',
  'ambient',
  'active',
]);

export const PRESENCE_LINEAGE_ACTIONS = Object.freeze([
  'created',
  'provider-rebound',
  'surface-projected',
  'participation-changed',
  'torn-down',
]);

const PARTICIPATION_SET = new Set(PRESENCE_PARTICIPATION_MODES);
const ACTION_SET = new Set(PRESENCE_LINEAGE_ACTIONS);
const MAX_ID_LENGTH = 256;
const MAX_LABEL_LENGTH = 160;
const MAX_REASON_LENGTH = 500;
const PRESENCE_SURFACES = new Set(['web', 'discord', 'tui', 'mobile', 'ar', 'house-commons', 'api', 'unknown', PRESENCE_UNKNOWN]);

function text(value) {
  return String(value ?? '').trim();
}

function bounded(value, fallback, maxLength = MAX_LABEL_LENGTH) {
  const normalised = text(value);
  if (!normalised) return fallback;
  if (normalised.length > maxLength) throw new Error(`PRESENCE: value exceeds ${maxLength} characters.`);
  return normalised;
}

function required(value, field) {
  const normalised = bounded(value, null, MAX_ID_LENGTH);
  if (!normalised) throw new Error(`PRESENCE: ${field} is required.`);
  return normalised;
}

function timestamp(value, field) {
  const normalised = bounded(value, new Date().toISOString(), MAX_LABEL_LENGTH);
  if (Number.isNaN(Date.parse(normalised))) throw new Error(`PRESENCE: ${field} must be an ISO timestamp.`);
  return normalised;
}

function participationMode(value) {
  const normalised = text(value).toLowerCase();
  if (!PARTICIPATION_SET.has(normalised)) throw new Error(`PRESENCE: unsupported participation mode '${normalised || PRESENCE_UNKNOWN}'.`);
  return normalised;
}

function providerBinding({ providerId, modelId, bindingId } = {}) {
  return {
    provider_id: bounded(providerId, PRESENCE_UNKNOWN),
    model_id: bounded(modelId, PRESENCE_UNKNOWN),
    binding_id: bounded(bindingId, PRESENCE_UNKNOWN),
  };
}

function generatedPresenceId(identityId, surface, sessionId) {
  return `presence:${[identityId, surface, sessionId].map((value) => encodeURIComponent(value)).join(':')}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function createPresence({
  presenceId,
  identityId,
  surface = PRESENCE_UNKNOWN,
  participationMode: mode = 'ambient',
  sessionId,
  providerId = PRESENCE_UNKNOWN,
  modelId = PRESENCE_UNKNOWN,
  bindingId = PRESENCE_UNKNOWN,
  continuityRef = null,
  createdAt,
  updatedAt,
} = {}) {
  const identity = required(identityId, 'identityId');
  const candidateSurface = bounded(surface, PRESENCE_UNKNOWN).toLowerCase();
  const resolvedSurface = PRESENCE_SURFACES.has(candidateSurface) ? candidateSurface : PRESENCE_UNKNOWN;
  const session = required(sessionId, 'sessionId');
  const created = timestamp(createdAt, 'createdAt');
  const updated = timestamp(updatedAt || created, 'updatedAt');
  const continuity = continuityRef == null ? null : bounded(continuityRef, null, MAX_ID_LENGTH);
  return deepFreeze({
    schema: PRESENCE_SCHEMA,
    version: 1,
    presence_id: bounded(presenceId, generatedPresenceId(identity, resolvedSurface, session), MAX_ID_LENGTH),
    identity_id: identity,
    surface: resolvedSurface,
    participation_mode: participationMode(mode),
    session_id: session,
    provider_binding: providerBinding({ providerId, modelId, bindingId }),
    continuity_ref: continuity,
    created_at: created,
    updated_at: updated,
  });
}

function assertPresence(value) {
  if (!value || value.schema !== PRESENCE_SCHEMA) throw new Error('PRESENCE: expected an arcsweep.presence/v1 record.');
  return value;
}

function transition(presence, overrides = {}) {
  const current = assertPresence(presence);
  return createPresence({
    presenceId: current.presence_id,
    identityId: current.identity_id,
    surface: current.surface,
    participationMode: current.participation_mode,
    sessionId: current.session_id,
    providerId: current.provider_binding?.provider_id,
    modelId: current.provider_binding?.model_id,
    bindingId: current.provider_binding?.binding_id,
    continuityRef: current.continuity_ref,
    createdAt: current.created_at,
    ...overrides,
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  });
}

export function rebindPresenceProvider(presence, { providerId = PRESENCE_UNKNOWN, modelId = PRESENCE_UNKNOWN, bindingId = PRESENCE_UNKNOWN, updatedAt } = {}) {
  return transition(presence, { providerId, modelId, bindingId, updatedAt });
}

export function projectPresence(presence, { presenceId, surface = PRESENCE_UNKNOWN, sessionId, updatedAt } = {}) {
  const current = assertPresence(presence);
  return createPresence({
    presenceId,
    identityId: current.identity_id,
    surface,
    participationMode: current.participation_mode,
    sessionId: sessionId || current.session_id,
    providerId: current.provider_binding?.provider_id,
    modelId: current.provider_binding?.model_id,
    bindingId: current.provider_binding?.binding_id,
    continuityRef: current.continuity_ref,
    createdAt: updatedAt || new Date().toISOString(),
    updatedAt,
  });
}

export function setPresenceParticipation(presence, mode, { updatedAt } = {}) {
  return transition(presence, { participationMode: mode, updatedAt });
}

function receiptSummary(value) {
  if (!value) return null;
  const current = assertPresence(value);
  return {
    presence_id: current.presence_id,
    identity_id: current.identity_id,
    surface: current.surface,
    participation_mode: current.participation_mode,
    session_id: current.session_id,
    provider_binding: clone(current.provider_binding),
    continuity_ref: current.continuity_ref,
  };
}

export function createPresenceLineageReceipt({ action, before = null, after = null, reason = null, occurredAt } = {}) {
  const normalisedAction = text(action).toLowerCase();
  if (!ACTION_SET.has(normalisedAction)) throw new Error(`PRESENCE: unsupported lineage action '${normalisedAction || PRESENCE_UNKNOWN}'.`);
  if (!before && !after) throw new Error('PRESENCE: lineage receipt requires before or after.');
  if (normalisedAction === 'torn-down' && after) throw new Error('PRESENCE: teardown receipts cannot contain an after presence.');
  const subject = after || before;
  const occurred = timestamp(occurredAt, 'occurredAt');
  const safeReason = reason == null ? null : bounded(reason, null, MAX_REASON_LENGTH);
  return deepFreeze({
    schema: PRESENCE_LINEAGE_RECEIPT_SCHEMA,
    version: 1,
    receipt_id: `presence-receipt:${normalisedAction}:${subject.presence_id}:${occurred}`,
    action: normalisedAction,
    presence_id: subject.presence_id,
    identity_id: subject.identity_id,
    before: receiptSummary(before),
    after: receiptSummary(after),
    continuity_ref: subject.continuity_ref,
    authority_grants: Object.freeze([]),
    reason: safeReason,
    occurred_at: occurred,
  });
}

export function teardownPresence(presence, { reason = 'presence-teardown', occurredAt } = {}) {
  return createPresenceLineageReceipt({ action: 'torn-down', before: presence, reason, occurredAt });
}
