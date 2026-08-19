const VERSION = 'hearthgate.bifrost-sync/v1';

export const SYNC_STREAM = Object.freeze({
  STATE: 'state',
  RECEIPT: 'receipt',
  WORK_ORDER: 'work-order',
  HANDOFF: 'handoff',
  CANON: 'canon',
  SETTINGS: 'settings',
  CONFLICT: 'conflict',
});

export const SYNC_OPERATION = Object.freeze({
  UPSERT: 'upsert',
  APPEND: 'append',
  DELETE: 'delete',
  RESOLVE: 'resolve',
});

export function createSyncEnvelope(input, { now = () => new Date(), uuid = cryptoUuid } = {}) {
  const stream = String(input.stream || '');
  const operation = String(input.operation || '');
  if (!Object.values(SYNC_STREAM).includes(stream)) throw new TypeError(`Unsupported sync stream: ${stream}`);
  if (!Object.values(SYNC_OPERATION).includes(operation)) throw new TypeError(`Unsupported sync operation: ${operation}`);
  if (!input.deviceId || !input.entityId) throw new TypeError('deviceId and entityId are required');

  const envelope = {
    schema: VERSION,
    envelopeId: input.envelopeId || uuid(),
    deviceId: String(input.deviceId),
    actorId: String(input.actorId || 'rowan'),
    stream,
    entityId: String(input.entityId),
    operation,
    baseRevision: Number.isInteger(input.baseRevision) ? input.baseRevision : 0,
    revision: Number.isInteger(input.revision) ? input.revision : 1,
    payload: input.payload ?? null,
    createdAt: input.createdAt || now().toISOString(),
    sourceRuntime: input.sourceRuntime || detectRuntime(),
  };
  return Object.freeze(envelope);
}

export function createConflict({ local, remote, reason, now = () => new Date(), uuid = cryptoUuid }) {
  return Object.freeze({
    schema: 'hearthgate.bifrost-sync-conflict/v1',
    conflictId: uuid(),
    stream: local.stream,
    entityId: local.entityId,
    reason,
    local,
    remote,
    status: 'OPEN',
    createdAt: now().toISOString(),
  });
}

export function mergePolicyFor(stream) {
  if ([SYNC_STREAM.RECEIPT, SYNC_STREAM.HANDOFF, SYNC_STREAM.WORK_ORDER].includes(stream)) return 'APPEND_ONLY';
  if (stream === SYNC_STREAM.SETTINGS) return 'LAST_WRITE_WINS';
  if ([SYNC_STREAM.CANON, SYNC_STREAM.STATE].includes(stream)) return 'EXPLICIT_CONFLICT';
  return 'APPEND_ONLY';
}

function detectRuntime() {
  if (typeof window === 'undefined') return 'desktop-service';
  if (window.bifrostDesktop) return 'desktop-renderer';
  return 'web';
}

function cryptoUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
