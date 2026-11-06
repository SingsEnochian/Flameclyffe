'use strict';

// Authorized presentation ingress for the existing Wayglass MCP HTTP boundary.
// No public endpoint, identity claim, or provider turn is created by this module.
// The host must supply a trusted durable store and an authenticated Wayglass review bridge.
const { createHash, randomUUID } = require('node:crypto');
const MAX_BYTES = 64 * 1024;
const MAX_ID = 160;
const REQUIRED_SCOPE = 'wayglass:present';

function fail(message) { const e = new Error(message); e.code = 'WAYGLASS_PRESENT_DENIED'; throw e; }
function safeString(value, limit = MAX_ID) {
  return typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\u0000-\u001f]/.test(value);
}
function makeWayglassPresentationIngress({ store, reviewBridge, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.putIfAbsent !== 'function' || typeof store.get !== 'function') {
    throw new TypeError('A durable, atomic, idempotent presentation store is required');
  }
  if (typeof reviewBridge !== 'function') throw new TypeError('An attributable Wayglass review bridge is required');
  return async function present({ principal, payload, resource }) {
    if (!principal || principal.active !== true || principal.ownerAuthorized !== true ||
      principal.revoked === true || principal.consentRevoked === true ||
      !Array.isArray(principal.scopes) || !principal.scopes.includes(REQUIRED_SCOPE) ||
      !safeString(principal.subject) || !safeString(principal.grantId) ||
      typeof principal.verifyCurrentGrant !== 'function') fail('Authorization denied');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !safeString(payload.presentation_id) || !safeString(payload.source_ref, 1024) ||
      !safeString(payload.intent, 1024) ||
      !Array.isArray(payload.phases || payload.eightfold) ||
      (payload.phases || payload.eightfold).length !== 8 ||
      (payload.phases || payload.eightfold).some((p, i) => !p || p.index !== i + 1 ||
        (p.name || p.phase) !== ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'][i])) {
      fail('Invalid presentation');
    }
    const bytes = Buffer.from(JSON.stringify(payload), 'utf8');
    if (bytes.length > MAX_BYTES) fail('Presentation too large');
    // The scope is not sufficient without a current host grant, checked on each call.
    const valid = await principal.verifyCurrentGrant({
      subject: principal.subject, grantId: principal.grantId, scope: REQUIRED_SCOPE,
      resource, action: 'present', presentationId: payload.presentation_id
    });
    if (valid !== true) fail('Authorization revoked or unavailable');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const key = createHash('sha256').update(JSON.stringify([
      principal.subject, principal.grantId, payload.presentation_id
    ])).digest('hex');
    const existing = await store.get(key);
    if (existing) {
      if (existing.digest !== digest) fail('Idempotency conflict');
      return { accepted: true, duplicate: true, receipt_id: existing.receipt_id,
        status: existing.status, wayglass_reply: existing.wayglass_reply ?? null };
    }
    const record = { receipt_id: randomUUID(), key, digest, presentation_id: payload.presentation_id,
      source_ref: payload.source_ref, principal_id: principal.subject,
      grant_id: principal.grantId, created_at: clock(), status: 'queued_for_review',
      wayglass_reply: null, payload };
    const inserted = await store.putIfAbsent(key, record);
    if (!inserted) {
      const raced = await store.get(key);
      if (!raced || raced.digest !== digest) fail('Idempotency conflict');
      return { accepted: true, duplicate: true, receipt_id: raced.receipt_id,
        status: raced.status, wayglass_reply: raced.wayglass_reply ?? null };
    }
    // The bridge may enqueue work only. A successful enqueue is NOT a Wayglass response.
    // If it fails, the durable receipt remains queued for explicit retry/recovery.
    try { await reviewBridge({ receipt_id: record.receipt_id, key, principal_id: principal.subject,
      grant_id: principal.grantId, source_ref: payload.source_ref, digest }); }
    catch { /* preserve queued state, do not claim delivery */ }
    return { accepted: true, duplicate: false, receipt_id: record.receipt_id,
      status: 'queued_for_review', wayglass_reply: null };
  };
}

module.exports = { makeWayglassPresentationIngress, REQUIRED_SCOPE };
