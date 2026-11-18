'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { reciprocalHalfTransfer, returnReciprocalHalves } = require('../lib/wayglass-kernel.cjs');

test('3a,7b crosses to 3b,7a and returns without losing carrier identity', () => {
  const a = { id: '3', origin: 'a', half: { token: 'a' } };
  const b = { id: '7', origin: 'b', half: { token: 'b' } };
  const crossed = reciprocalHalfTransfer(a, b, { authorised: true, encounterId: 'mobius:1' });
  assert.deepEqual([crossed.left.id, crossed.left.origin, crossed.right.id, crossed.right.origin], ['3', 'b', '7', 'a']);
  const restored = returnReciprocalHalves(crossed.left, crossed.right, crossed.receipt, { authorised: true });
  assert.deepEqual(restored.left, a);
  assert.deepEqual(restored.right, b);
  assert.equal(crossed.receipt.persisted, false);
});

test('no consent, modified payload or forged receipt cannot cross return boundary', () => {
  const a = { id: '3', origin: 'a', half: 'a' };
  const b = { id: '7', origin: 'b', half: 'b' };
  assert.throws(() => reciprocalHalfTransfer(a, b, { encounterId: 'x' }), /authorisation/);
  const crossed = reciprocalHalfTransfer(a, b, { authorised: true, encounterId: 'x' });
  assert.throws(() => returnReciprocalHalves({ ...crossed.left, half: 'tampered' }, crossed.right, crossed.receipt, { authorised: true }), /mismatch/);
  assert.throws(() => returnReciprocalHalves(crossed.left, crossed.right, { ...crossed.receipt, persisted: true }, { authorised: true }), /mismatch/);
});
