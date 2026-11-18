'use strict';
// Native CommonJS seam operator for the canonical Wayglass kernel and Eightfold.
const { digest } = require('./wyrdrune/canonical.cjs');
const SCHEMA = 'wayglass.reciprocal-half-transfer/v1';
const clone = value => JSON.parse(JSON.stringify(value));
function check(x, label) {
  if (!x || typeof x !== 'object' || Array.isArray(x) ||
      typeof x.id !== 'string' || !x.id.trim() ||
      typeof x.origin !== 'string' || !x.origin.trim() ||
      !Object.prototype.hasOwnProperty.call(x, 'half')) {
    throw new TypeError(label + ' requires id, origin and half');
  }
}
function exchange(left, right, { authorised = false, encounterId } = {}) {
  check(left, 'left'); check(right, 'right');
  if (left.id === right.id) throw new Error('Distinct carriers required');
  if (authorised !== true) throw new Error('Explicit exchange authorisation required');
  if (typeof encounterId !== 'string' || !encounterId.trim()) throw new Error('encounterId required');
  const before = [clone(left), clone(right)];
  const after = [{ ...before[0], half: before[1].half, origin: before[1].origin },
    { ...before[1], half: before[0].half, origin: before[0].origin }];
  const body = { schema: SCHEMA, encounter_id: encounterId, carrier_ids: before.map(x => x.id),
    before_origins: before.map(x => x.origin), after_origins: after.map(x => x.origin),
    before_half_digests: before.map(x => digest(x.half)),
    after_half_digests: after.map(x => digest(x.half)), persisted: false };
  return { left: after[0], right: after[1], receipt: Object.freeze({ ...body, digest: digest(body) }) };
}
function returnExchange(left, right, receipt, options = {}) {
  check(left, 'left'); check(right, 'right');
  if (!receipt || receipt.schema !== SCHEMA ||
      digest(Object.fromEntries(Object.entries(receipt).filter(([k]) => k !== 'digest'))) !== receipt.digest ||
      left.id !== receipt.carrier_ids[0] || right.id !== receipt.carrier_ids[1] ||
      left.origin !== receipt.after_origins[0] || right.origin !== receipt.after_origins[1] ||
      digest(left.half) !== receipt.after_half_digests[0] ||
      digest(right.half) !== receipt.after_half_digests[1]) {
    throw new Error('Return refused: receipt, carrier or half integrity mismatch');
  }
  return exchange(left, right, { ...options, encounterId: receipt.encounter_id + ':return' });
}
module.exports = { SCHEMA, exchange, returnExchange };
