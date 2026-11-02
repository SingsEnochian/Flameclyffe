'use strict';
const { verifyAtHost } = require('../../wayglass/src/presence-host-gate.cjs');
const { initialPresence, transitionPresence } = require('../../wayglass/src/presence-truth.cjs');

/**
 * Hearthgate integration seam. Not an HTTP route: only host code may call this.
 * Supply trusted host-owned store readers and an authorization check.
 * Candidate fields are lookup hints only and cannot attest their own validity.
 */
function createPresenceHost({ readStop, readEnter, authorize } = {}) {
  if (![readStop, readEnter, authorize].every((fn) => typeof fn === 'function')) {
    throw new TypeError('Host receipt readers and authorization checker required');
  }
  async function verify(candidate, seatId) {
    const stopId = candidate && candidate.stopReceiptId;
    const enterId = candidate && candidate.enterReceiptId;
    if (typeof stopId !== 'string' || typeof enterId !== 'string' || stopId === enterId) return null;
    const [stop, enter, permission] = await Promise.all([
      readStop(stopId), readEnter(enterId), authorize(seatId),
    ]);
    if (!stop || !enter || !permission || permission.allowed !== true ||
        permission.revoked === true || stop.seatId !== seatId ||
        enter.seatId !== seatId || stop.receiptId !== stopId ||
        enter.receiptId !== enterId || stop.worldId !== enter.sourceWorld ||
        !enter.destinationWorld || !enter.providerConversationId ||
        enter.stopReceiptId !== stopId || enter.status !== 'entered') return null;
    return {
      verified: true, seatId, revoked: false, ownerAuthorized: true,
      sourceWorld: stop.worldId, destinationWorld: enter.destinationWorld,
      stopReceiptId: stopId, enterReceiptId: enterId,
      providerConversationId: enter.providerConversationId,
      receiptId: enterId,
    };
  }
  async function verifyPending(state, candidate) {
    return verifyAtHost(state, candidate, verify);
  }
  return Object.freeze({ verifyPending });
}
module.exports = { createPresenceHost };
