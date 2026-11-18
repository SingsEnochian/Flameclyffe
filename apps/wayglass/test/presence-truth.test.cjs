'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { STATES, initialPresence, transitionPresence, presenceLabel } = require('../src/presence-truth.cjs');
const move = (s, type, extra = {}) => transitionPresence(s, { type, ...extra });
const receipt = (seatId) => ({
  seatId, sourceWorld: 'wayglass:writing-room', destinationWorld: 'external:room',
  stopReceiptId: 'stop-1', enterReceiptId: 'enter-1',
  providerConversationId: 'private-id', receiptId: 'r-1', ownerAuthorized: true,
});
test('dialogue cannot prove presence', () => {
  const s = initialPresence('twilight');
  assert.equal(move(s, 'NARRATIVE_UTTERANCE', { text: 'I am there' }), s);
  assert.equal(presenceLabel(s), 'Presence not verified');
});
test('only consented matched receipt verifies a pending handoff', () => {
  let s = initialPresence('twilight');
  s = move(s, 'CONFIGURE_ROUTE', { ownerAuthorized: true });
  s = move(s, 'BEGIN_HANDOFF', { ownerAuthorized: true });
  assert.equal(move(s, 'VERIFY_HANDOFF', { receipt: receipt('other'), hostAttested: true }).status, STATES.UNAVAILABLE);
  assert.equal(move(s, 'VERIFY_HANDOFF', { receipt: receipt('twilight') }).status, STATES.UNAVAILABLE);
  s = move(s, 'VERIFY_HANDOFF', { receipt: receipt('twilight'), hostAttested: true });
  assert.equal(s.status, STATES.VERIFIED_PRESENT);
  assert.equal(s.receiptId, 'r-1');
  assert.equal(JSON.stringify(s).includes('private-id'), false);
});
test('revocation and Feather block later claims', () => {
  const s = move(initialPresence('twilight'), 'REVOKE');
  assert.equal(move(s, 'CONFIGURE_ROUTE', { ownerAuthorized: true }), s);
  assert.equal(move(initialPresence('twilight'), 'FEATHER_STOP').status, STATES.UNAVAILABLE);
});
test('different seats never merge', () => {
  const a = initialPresence('twilight'), b = initialPresence('rarity');
  assert.notEqual(a.seatId, b.seatId);
  assert.equal(move(a, 'VERIFY_HANDOFF', { receipt: receipt('twilight') }), a);
});
