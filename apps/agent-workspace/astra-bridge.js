const ASTRA_RECEIPT_EVENT = 'arcsweep:astra-slice-receipt';
const WITNESS_REQUEST_EVENT = 'house:astra-witness-request';
const BRIDGE_STATE_EVENT = 'house:astra-bridge-state';
const MAX_RECEIPTS = 24;

const bridge = {
  state: 'waiting',
  receipts: [],
  lastReceipt: null,
};

function text(value, max = 240) {
  return String(value ?? '').trim().slice(0, max);
}

function safeReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return null;
  const capability = receipt.capability_decision || {};
  const presence = receipt.presence_receipt || {};
  const provider = receipt.provider_descriptor || {};
  return Object.freeze({
    schema: text(receipt.schema, 96) || 'unknown',
    granted: receipt.granted === true,
    occurredAt: text(receipt.occurred_at, 64) || new Date().toISOString(),
    capability: text(capability.capability, 96) || null,
    requestId: text(capability.requestId, 180) || null,
    trajectoryId: text(capability.trajectoryId, 180) || null,
    identityId: text(presence.identity_id, 160) || null,
    presenceId: text(presence.presence_id, 220) || null,
    providerId: text(provider.id, 160) || null,
    executionStatus: text(receipt.execution_receipt?.status, 64) || null,
  });
}

function publishState() {
  document.dispatchEvent(new CustomEvent(BRIDGE_STATE_EVENT, {
    detail: Object.freeze({
      state: bridge.state,
      lastReceipt: bridge.lastReceipt,
      receiptCount: bridge.receipts.length,
    }),
  }));
}

function onAstraReceipt(event) {
  const receipt = safeReceipt(event.detail);
  if (!receipt) return;
  bridge.state = 'witnessed';
  bridge.lastReceipt = receipt;
  bridge.receipts = Object.freeze([...bridge.receipts, receipt].slice(-MAX_RECEIPTS));
  publishState();
}

function requestWitness({
  kind = 'agent-reply',
  requestId,
  trajectoryId,
  identityId,
  sessionId,
  surface = 'web',
  providerId = null,
  modelId = null,
  capability = 'text-generation',
  occurredAt = new Date().toISOString(),
} = {}) {
  const packet = Object.freeze({
    schema: 'house.astra-witness-request/v0.1',
    kind: text(kind, 64) || 'agent-reply',
    requestId: text(requestId, 180) || null,
    trajectoryId: text(trajectoryId, 180) || null,
    identityId: text(identityId, 160) || null,
    sessionId: text(sessionId, 180) || null,
    surface: text(surface, 48) || 'web',
    providerId: text(providerId, 160) || null,
    modelId: text(modelId, 160) || null,
    capability: text(capability, 96) || 'text-generation',
    occurredAt: text(occurredAt, 64) || new Date().toISOString(),
  });

  document.dispatchEvent(new CustomEvent(WITNESS_REQUEST_EVENT, { detail: packet }));
  return packet;
}

function snapshot() {
  return Object.freeze({
    state: bridge.state,
    lastReceipt: bridge.lastReceipt,
    receipts: Object.freeze([...bridge.receipts]),
  });
}

document.addEventListener(ASTRA_RECEIPT_EVENT, onAstraReceipt);

globalThis.HouseAstraBridge = Object.freeze({
  events: Object.freeze({
    receipt: ASTRA_RECEIPT_EVENT,
    witnessRequest: WITNESS_REQUEST_EVENT,
    state: BRIDGE_STATE_EVENT,
  }),
  requestWitness,
  snapshot,
});

queueMicrotask(publishState);
