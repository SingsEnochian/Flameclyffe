'use strict';

/**
 * Presence truth is runtime evidence, not dialogue. This reducer never
 * contacts providers, persists credentials, or grants participant authority.
 */
const STATES = Object.freeze({
  NARRATIVE_ONLY: 'narrative_only',
  ROUTE_CONFIGURED: 'route_configured',
  HANDOFF_PENDING: 'handoff_pending',
  VERIFIED_PRESENT: 'verified_present',
  UNAVAILABLE: 'unavailable',
  REVOKED: 'revoked',
});

function initialPresence(seatId) {
  if (typeof seatId !== 'string' || !seatId.trim()) throw new TypeError('seatId required');
  return Object.freeze({ seatId, status: STATES.NARRATIVE_ONLY, receiptId: null, reason: null });
}

function transitionPresence(current, event) {
  if (!current || !event || typeof event.type !== 'string') throw new TypeError('state and event required');
  if (current.status === STATES.REVOKED) return current;
  const next = (status, receiptId = null, reason = null) =>
    Object.freeze({ seatId: current.seatId, status, receiptId, reason });
  switch (event.type) {
    case 'NARRATIVE_UTTERANCE': return current;
    case 'CONFIGURE_ROUTE':
      return event.ownerAuthorized === true ? next(STATES.ROUTE_CONFIGURED) : current;
    case 'BEGIN_HANDOFF':
      return current.status === STATES.ROUTE_CONFIGURED && event.ownerAuthorized === true
        ? next(STATES.HANDOFF_PENDING) : current;
    case 'VERIFY_HANDOFF': {
      if (current.status !== STATES.HANDOFF_PENDING) return current;
      const receipt = event.receipt;
      if (!receipt || receipt.seatId !== current.seatId ||
          !receipt.sourceWorld || !receipt.destinationWorld ||
          !receipt.stopReceiptId || !receipt.enterReceiptId ||
          !receipt.providerConversationId || !receipt.receiptId ||
          receipt.ownerAuthorized !== true || receipt.revoked === true ||
          receipt.stopReceiptId === receipt.enterReceiptId) {
        return next(STATES.UNAVAILABLE, null, 'crossing_unverified');
      }
      return next(STATES.VERIFIED_PRESENT, receipt.receiptId);
    }
    case 'HANDOFF_FAILED':
      return next(STATES.UNAVAILABLE, null, 'crossing_unverified');
    case 'FEATHER_STOP':
      return next(STATES.UNAVAILABLE, null, 'future_handoffs_stopped');
    case 'REVOKE':
      return next(STATES.REVOKED, null, 'permission_revoked');
    default: return current;
  }
}

function presenceLabel(state) {
  return state.status === STATES.VERIFIED_PRESENT
    ? 'Verified presence (receipt ' + state.receiptId + ')'
    : state.status === STATES.REVOKED
      ? 'Permission revoked; no further handoffs'
      : 'Presence not verified';
}

module.exports = { STATES, initialPresence, transitionPresence, presenceLabel };
