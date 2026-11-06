'use strict';
const { createHash } = require('node:crypto');
const digest = value => createHash('sha256').update(value).digest('hex');

// Each dequeue, including recovery, reloads durable evidence and current grants.
// The receiving host must deduplicate receipt_id and enforce its own Feather gate.
function createPresentationDelivery({ store, authorize, deliver, resource } = {}) {
  if (!store || typeof store.get !== 'function' || typeof authorize !== 'function' || typeof deliver !== 'function' || typeof resource !== 'string' || !resource) {
    throw new TypeError('Receipt store, trusted current-grant authorizer and delivery adapter required');
  }
  return async function delivery({ key, receipt_id } = {}) {
    const record = await store.get(key);
    if (!record || record.receipt_id !== receipt_id || record.status !== 'queued_for_review') throw new Error('Receipt unavailable');
    const expectedKey = digest(JSON.stringify([record.principal_id, record.grant_id, record.presentation_id]));
    if (record.key !== key || expectedKey !== key || !record.payload ||
        record.payload.presentation_id !== record.presentation_id || record.payload.source_ref !== record.source_ref ||
        digest(JSON.stringify(record.payload)) !== record.digest) throw new Error('Receipt integrity failure');
    const allowed = await authorize({ subject: record.principal_id, grantId: record.grant_id,
      resource, scope: 'wayglass:present', action: 'deliver', receiptId: receipt_id, presentationId: record.presentation_id });
    if (allowed !== true) throw new Error('Delivery authorization revoked or unavailable');
    await deliver({ receipt_id, key, principal_id: record.principal_id, grant_id: record.grant_id,
      source_ref: record.source_ref, digest: record.digest, payload: record.payload });
    return { receipt_id, status: 'submitted_for_review', wayglass_reply: null };
  };
}
module.exports = { createPresentationDelivery };
