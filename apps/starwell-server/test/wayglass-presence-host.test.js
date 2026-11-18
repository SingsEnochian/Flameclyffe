'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPresenceHost } = require('../wayglass/presence-host.js');
const { initialPresence, transitionPresence, STATES } = require('../../wayglass/src/presence-truth.cjs');
const stop = { receiptId: 'stop:1', seatId: 'rarity', worldId: 'writing-room' };
const enter = {
  receiptId: 'enter:1', stopReceiptId: 'stop:1', seatId: 'rarity',
  sourceWorld: 'writing-room', destinationWorld: 'provider:room',
  providerConversationId: 'private', status: 'entered',
};
function pending() {
  let s = initialPresence('rarity');
  s = transitionPresence(s, { type: 'CONFIGURE_ROUTE', ownerAuthorized: true });
  return transitionPresence(s, { type: 'BEGIN_HANDOFF', ownerAuthorized: true });
}
function host({ stopRecord = stop, enterRecord = enter, permission = { allowed: true, revoked: false } } = {}) {
  return createPresenceHost({
    readStop: async (id) => id === 'stop:1' ? stopRecord : null,
    readEnter: async (id) => id === 'enter:1' ? enterRecord : null,
    authorize: async () => permission,
  });
}
const candidate = { stopReceiptId: 'stop:1', enterReceiptId: 'enter:1' };
test('host joins matching persisted records', async () => {
  const s = await host().verifyPending(pending(), candidate);
  assert.equal(s.status, STATES.VERIFIED_PRESENT);
  assert.equal(JSON.stringify(s).includes('private'), false);
});
test('host rejects revoked permission', async () => {
  const s = await host({ permission: { allowed: true, revoked: true } }).verifyPending(pending(), candidate);
  assert.equal(s.status, STATES.UNAVAILABLE);
});
test('host rejects forged entry lineage', async () => {
  const s = await host({ enterRecord: { ...enter, stopReceiptId: 'other' } }).verifyPending(pending(), candidate);
  assert.equal(s.status, STATES.UNAVAILABLE);
});
test('host rejects missing records', async () => {
  const s = await host({ stopRecord: null }).verifyPending(pending(), candidate);
  assert.equal(s.status, STATES.UNAVAILABLE);
});
