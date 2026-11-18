'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { initialPresence, transitionPresence, STATES } = require('../src/presence-truth.cjs');
const { verifyAtHost } = require('../src/presence-host-gate.cjs');
function pending() {
  let s = initialPresence('rarity');
  s = transitionPresence(s, { type: 'CONFIGURE_ROUTE', ownerAuthorized: true });
  return transitionPresence(s, { type: 'BEGIN_HANDOFF', ownerAuthorized: true });
}
const trusted = {
  verified: true, seatId: 'rarity', revoked: false, ownerAuthorized: true,
  sourceWorld: 'wayglass:writing-room', destinationWorld: 'external:room',
  stopReceiptId: 'stop-1', enterReceiptId: 'enter-1',
  providerConversationId: 'private-conversation', receiptId: 'receipt-1',
};
test('fails closed when no trusted verifier is available', async () => {
  assert.equal((await verifyAtHost(pending(), trusted)).status, STATES.UNAVAILABLE);
});
test('rejects an unverified or revoked result', async () => {
  assert.equal((await verifyAtHost(pending(), {}, async () => ({ ...trusted, verified: false }))).status, STATES.UNAVAILABLE);
  assert.equal((await verifyAtHost(pending(), {}, async () => ({ ...trusted, revoked: true }))).status, STATES.UNAVAILABLE);
});
test('rejects seat mismatch and verifier exceptions', async () => {
  assert.equal((await verifyAtHost(pending(), {}, async () => ({ ...trusted, seatId: 'bluebird' }))).status, STATES.UNAVAILABLE);
  assert.equal((await verifyAtHost(pending(), {}, async () => { throw Error('offline'); })).status, STATES.UNAVAILABLE);
});
test('accepts host-confirmed receipt without exposing provider ID in state', async () => {
  const s = await verifyAtHost(pending(), {}, async () => trusted);
  assert.equal(s.status, STATES.VERIFIED_PRESENT);
  assert.equal(s.receiptId, 'receipt-1');
  assert.equal(JSON.stringify(s).includes('private-conversation'), false);
});
