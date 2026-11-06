'use strict';
const { transitionPresence, STATES } = require('./presence-truth.cjs');

/**
 * Trusted-host-only boundary. The verifier must independently resolve
 * persisted receipt lineage and live authorization. This module never
 * treats a caller's candidate receipt as sufficient proof.
 */
async function verifyAtHost(state, candidate, trustedVerifier) {
  if (!state || state.status !== STATES.HANDOFF_PENDING) return state;
  if (typeof trustedVerifier !== 'function') {
    return transitionPresence(state, { type: 'HANDOFF_FAILED' });
  }
  try {
    const verified = await trustedVerifier(candidate, state.seatId);
    if (!verified || verified.verified !== true ||
        verified.seatId !== state.seatId ||
        verified.ownerAuthorized !== true || verified.revoked !== false ||
        !verified.receiptId || !verified.sourceWorld ||
        !verified.destinationWorld || !verified.stopReceiptId ||
        !verified.enterReceiptId || !verified.providerConversationId ||
        verified.stopReceiptId === verified.enterReceiptId) {
      return transitionPresence(state, { type: 'HANDOFF_FAILED' });
    }
    return transitionPresence(state, {
      type: 'VERIFY_HANDOFF', hostAttested: true, receipt: verified,
    });
  } catch (_) {
    return transitionPresence(state, { type: 'HANDOFF_FAILED' });
  }
}
module.exports = { verifyAtHost };
