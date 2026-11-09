'use strict';
// Host-owned ingress. A queued receipt is evidence of submission, never a reply.
const { randomUUID } = require('node:crypto');
const { SCHEMA, MAX_BYTES, digest, safeString, validResource, snapshot, assertPayload, receiptKey, assertReceipt } = require('./wayglass-presentation-receipt.cjs');
const REQUIRED_SCOPE = 'wayglass:present';
function fail(message) { const error = new Error(message); error.code = 'WAYGLASS_PRESENT_DENIED'; throw error; }
function makeWayglassPresentationIngress({ store, reviewBridge, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.putIfAbsent !== 'function' || typeof store.get !== 'function') throw new TypeError('Durable atomic presentation store required');
  if (typeof reviewBridge !== 'function') throw new TypeError('Attributable review bridge required');
  return async function present({ principal, payload, resource } = {}) {
    if (!principal || principal.active !== true || principal.ownerAuthorized !== true ||
        principal.revoked === true || principal.consentRevoked === true ||
        !Array.isArray(principal.scopes) || !principal.scopes.includes(REQUIRED_SCOPE) ||
        !safeString(principal.subject) || !safeString(principal.grantId) ||
        typeof principal.verifyCurrentGrant !== 'function' || !validResource(resource)) fail('Authorization denied');
    // Freeze the request's meaning before the first asynchronous boundary. Caller
    // objects must not alter payload, identity or grant while authorization runs.
    const subject = principal.subject, grantId = principal.grantId;
    const verify = principal.verifyCurrentGrant.bind(principal);
    let captured;
    try {
      const raw = JSON.stringify(payload);
      if (typeof raw !== 'string' || Buffer.byteLength(raw,'utf8') > MAX_BYTES) fail('Presentation too large');
      captured = JSON.parse(raw); assertPayload(captured);
    } catch { fail('Invalid presentation'); }
    const current = await verify({subject,grantId,scope:REQUIRED_SCOPE,resource,action:'present',presentationId:captured.presentation_id});
    if (current !== true) fail('Authorization revoked or unavailable');
    const record = {schema:SCHEMA,math_spine:'hearthgate.math-spine/v1.8',receipt_id:randomUUID(),resource,principal_id:subject,grant_id:grantId,
      presentation_id:captured.presentation_id,source_ref:captured.source_ref,digest:digest(JSON.stringify(captured)),
      created_at:clock(),status:'queued_for_review',wayglass_reply:null,payload:captured};
    record.key = receiptKey(record); assertReceipt(record,record.key);
    const duplicate = existing => {
      assertReceipt(existing,record.key);
      if (existing.digest !== record.digest) fail('Idempotency conflict');
      return {accepted:true,duplicate:true,receipt_id:existing.receipt_id,status:existing.status,wayglass_reply:null};
    };
    const existing = await store.get(record.key);
    if (existing) return duplicate(existing);
    if (!await store.putIfAbsent(record.key,snapshot(record))) {
      const raced = await store.get(record.key);
      if (!raced) fail('Receipt unavailable');
      return duplicate(raced);
    }
    // Failed queue notification leaves an immutable discoverable record. Recovery
    // must recheck the current resource-bound grant at delivery, including Feather.
    try { await reviewBridge({receipt_id:record.receipt_id,key:record.key,resource,principal_id:subject,
      grant_id:grantId,source_ref:record.source_ref,digest:record.digest}); } catch { /* recovery owns retry */ }
    return {accepted:true,duplicate:false,receipt_id:record.receipt_id,status:record.status,wayglass_reply:null};
  };
}
module.exports = { makeWayglassPresentationIngress, REQUIRED_SCOPE };
