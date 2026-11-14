/**
 * Wayglass Return Engine: reciprocal half-transfer.
 * Two carriers keep their identity while exchanging explicitly transferable halves.
 * This module owns the reversible allocation, not an agent's private state.
 *
 * 3a + 7b -> 3b + 7a -> 3a + 7b
 *
 * No network, storage, audio or authority is implicitly granted.
 */
export const HALF_TRANSFER_SCHEMA = 'wayglass.reciprocal-half-transfer/v1';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function requireCarrier(carrier, label) {
  if (!carrier || typeof carrier !== 'object' || Array.isArray(carrier)) {
    throw new TypeError(label + ' must be a carrier object');
  }
  if (typeof carrier.id !== 'string' || !carrier.id.trim()) {
    throw new TypeError(label + '.id must be a nonempty string');
  }
  if (!own(carrier, 'half')) throw new TypeError(label + '.half is required');
  if (typeof carrier.origin !== 'string' || !carrier.origin.trim()) {
    throw new TypeError(label + '.origin must identify the half provenance');
  }
}

/**
 * The caller supplies authorisation; absence or denial stops the exchange.
 * Returned records are new objects. Payloads are passed by reference, not
 * serialised or copied: callers must freeze or snapshot mutable payloads.
 */
export function reciprocalHalfTransfer(left, right, { authorised = false, encounterId } = {}) {
  requireCarrier(left, 'left');
  requireCarrier(right, 'right');
  if (left.id === right.id) throw new RangeError('Distinct carriers are required');
  if (authorised !== true) throw new Error('Half-transfer requires explicit authorisation');
  if (typeof encounterId !== 'string' || !encounterId.trim()) {
    throw new TypeError('A nonempty encounterId is required for provenance');
  }

  const nextLeft = { ...left, half: right.half, origin: right.origin };
  const nextRight = { ...right, half: left.half, origin: left.origin };
  const receipt = Object.freeze({
    schema: HALF_TRANSFER_SCHEMA,
    encounterId,
    carrierIds: Object.freeze([left.id, right.id]),
    beforeOrigins: Object.freeze([left.origin, right.origin]),
    afterOrigins: Object.freeze([nextLeft.origin, nextRight.origin]),
    reversible: true,
    // A receipt is not a persistent record until the host stores it.
    persisted: false
  });
  return { left: nextLeft, right: nextRight, receipt };
}

/**
 * Reverses the transfer only if carrier IDs and half origins still match the
 * original receipt. Does not undo mutations to payloads made after transfer.
 */
export function returnTransferredHalves(left, right, receipt, { authorised = false } = {}) {
  if (!receipt || receipt.schema !== HALF_TRANSFER_SCHEMA) {
    throw new TypeError('A matching half-transfer receipt is required');
  }
  requireCarrier(left, 'left');
  requireCarrier(right, 'right');
  if (left.id !== receipt.carrierIds[0] || right.id !== receipt.carrierIds[1] ||
      left.origin !== receipt.afterOrigins[0] || right.origin !== receipt.afterOrigins[1]) {
    throw new Error('Return refused: carrier or provenance mismatch');
  }
  return reciprocalHalfTransfer(left, right, {
    authorised,
    encounterId: receipt.encounterId + ':return'
  });
}

/** A Möbius seam exchanges halves once; two seam crossings restore allocation. */
export function mobiusHalfTransfer(left, right, crossings, options = {}) {
  if (!Number.isSafeInteger(crossings) || crossings < 0) {
    throw new RangeError('crossings must be a nonnegative safe integer');
  }
  requireCarrier(left, 'left');
  requireCarrier(right, 'right');
  if (crossings === 0) return { left: { ...left }, right: { ...right }, receipts: [] };
  // Two crossings cancel, so do not loop over an unbounded count.
  if (crossings % 2 === 0) {
    if (options.authorised !== true) throw new Error('Half-transfer requires explicit authorisation');
    return { left: { ...left }, right: { ...right }, receipts: [], completedCrossings: crossings };
  }
  const result = reciprocalHalfTransfer(left, right, options);
  return { ...result, receipts: [result.receipt], completedCrossings: crossings };
}
