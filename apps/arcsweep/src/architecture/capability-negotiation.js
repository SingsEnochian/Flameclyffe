export const CAPABILITY_REQUEST_SCHEMA = 'arcsweep.capability-request/v0.1';
export const CAPABILITY_DECISION_SCHEMA = 'arcsweep.capability-decision/v0.1';
export const EXECUTION_RECEIPT_SCHEMA = 'arcsweep.execution-receipt/v0.1';

function nowIso(now) {
  return typeof now === 'function' ? now().toISOString() : new Date().toISOString();
}

function cleanList(value) {
  return Object.freeze([...(Array.isArray(value) ? value : [])].map(String));
}

export function createCapabilityRequest({
  id,
  trajectoryId,
  capability,
  scope = null,
  constraints = {},
  requestedAuthority = 'read-only',
  reason = '',
} = {}, { now = () => new Date() } = {}) {
  if (!id) throw new Error('capability-request-id-required');
  if (!trajectoryId) throw new Error('capability-request-trajectory-required');
  if (!capability) throw new Error('capability-request-capability-required');
  return Object.freeze({
    schema: CAPABILITY_REQUEST_SCHEMA,
    id: String(id),
    trajectoryId: String(trajectoryId),
    capability: String(capability),
    scope,
    constraints: Object.freeze({ ...(constraints || {}) }),
    requestedAuthority: String(requestedAuthority || 'read-only'),
    reason: String(reason || ''),
    createdAt: nowIso(now),
  });
}

export function evaluateCapabilityRequest(request, {
  allowedCapabilities = [],
  authorityGrants = ['read-only'],
  route = null,
  reason = '',
} = {}, { now = () => new Date() } = {}) {
  const capabilityAllowed = allowedCapabilities.includes(request.capability);
  const authorityAllowed = authorityGrants.includes(request.requestedAuthority);
  const granted = capabilityAllowed && authorityAllowed;
  return Object.freeze({
    schema: CAPABILITY_DECISION_SCHEMA,
    requestId: request.id,
    trajectoryId: request.trajectoryId,
    capability: request.capability,
    granted,
    authority: granted ? request.requestedAuthority : null,
    route: granted ? route : null,
    reason: granted ? String(reason || 'granted') : String(reason || (!capabilityAllowed ? 'capability-not-allowed' : 'authority-not-granted')),
    decidedAt: nowIso(now),
  });
}

export function createExecutionReceipt({
  id,
  requestId,
  status,
  evidenceRefs = [],
  changes = [],
  result = null,
  executor = null,
} = {}, { now = () => new Date() } = {}) {
  if (!id) throw new Error('execution-receipt-id-required');
  if (!requestId) throw new Error('execution-receipt-request-required');
  if (!['applied', 'failed', 'denied', 'no-op'].includes(status)) {
    throw new Error(`invalid-execution-receipt-status:${status}`);
  }
  return Object.freeze({
    schema: EXECUTION_RECEIPT_SCHEMA,
    id: String(id),
    requestId: String(requestId),
    status,
    evidenceRefs: cleanList(evidenceRefs),
    changes: cleanList(changes),
    result,
    executor,
    observedAt: nowIso(now),
  });
}

export function validateExecutionReceipt(receipt, request) {
  if (!receipt || receipt.schema !== EXECUTION_RECEIPT_SCHEMA) {
    return Object.freeze({ valid: false, reason: 'receipt-schema-invalid' });
  }
  if (receipt.requestId !== request.id) {
    return Object.freeze({ valid: false, reason: 'receipt-request-mismatch' });
  }
  if (receipt.status === 'applied' && receipt.evidenceRefs.length === 0) {
    return Object.freeze({ valid: false, reason: 'applied-receipt-requires-evidence' });
  }
  return Object.freeze({ valid: true, reason: 'verified' });
}

export function receiptCanChangeExternalTruth(receipt, request) {
  const validation = validateExecutionReceipt(receipt, request);
  return validation.valid && receipt.status === 'applied' && receipt.evidenceRefs.length > 0;
}
