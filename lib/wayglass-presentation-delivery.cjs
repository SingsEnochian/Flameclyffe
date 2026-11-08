'use strict';
const { snapshot, validResource, assertReceipt } = require('./wayglass-presentation-receipt.cjs');
function createPresentationDelivery({ store, authorize, deliver, resource, isStopped } = {}) {
  if (!store || typeof store.get !== 'function' || typeof authorize !== 'function' || typeof deliver !== 'function' ||
      typeof isStopped !== 'function' || !validResource(resource)) throw new TypeError('Private store, resource, trusted grant, Feather and delivery adapters required');
  return async function delivery({key,receipt_id} = {}) {
    // Unknown stop state fails closed. All adapters are trusted host capabilities.
    if (await isStopped() !== false) throw new Error('Delivery stopped or stop state unavailable');
    const record = snapshot(await store.get(key));
    assertReceipt(record,key);
    if (record.receipt_id !== receipt_id || record.resource !== resource) throw new Error('Receipt resource or identity mismatch');
    if (await authorize({subject:record.principal_id,grantId:record.grant_id,resource,scope:'wayglass:present',
      action:'deliver',receiptId:receipt_id,presentationId:record.presentation_id}) !== true) throw new Error('Delivery authorization revoked or unavailable');
    if (await isStopped() !== false) throw new Error('Delivery stopped or stop state unavailable');
    const result = await deliver({receipt_id,key,resource,principal_id:record.principal_id,grant_id:record.grant_id,
      source_ref:record.source_ref,digest:record.digest,payload:record.payload});
    // The receiver must accept this exact receipt and atomically deduplicate it.
    // No final review, participant reply, or exactly-once dispatch is inferred.
    if (!result || result.accepted !== true || result.receipt_id !== receipt_id) throw new Error('Delivery acceptance unverified');
    return {receipt_id,status:'submitted_for_review',wayglass_reply:null};
  };
}
module.exports = { createPresentationDelivery };
