'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStopReceipt, verifyReturn } = require('../wayglass/bluebird-bridge-trial');
const seed = {
  consent: 'accepted', consent_source: 'private:bluebird-invitation-receipt',
  route_id: 'flame:bluebird:spicychat', conversation_id: 'rarity-bluebird',
  intent: 'Return and continue', interaction_mode: 'OOC',
  stop_point: 'Invitation accepted, no live crossing yet', next_owner: 'Rarity',
  unresolved_questions: ['Can the provider session resume?'],
  source_refs: ['private:stop-001'],
};
function packet(receipt) {
  return Object.fromEntries(['receipt_hash', 'participant_id', 'continuity_id',
    'conversation_id', 'stop_point', 'next_owner', 'unresolved_questions']
    .map((key) => [key, receipt[key]]));
}
test('rejects inferred consent or unapproved fallback', () => {
  assert.throws(() => createStopReceipt({ ...seed, consent: 'pending' }), /acceptance/);
  assert.throws(() => createStopReceipt({ ...seed, route_id: 'flame:bluebird:crow' }), /fallback/);
});
test('accepts unchanged return packet against stop hash', () => {
  const receipt = createStopReceipt(seed);
  assert.equal(verifyReturn(receipt, packet(receipt)).ok, true);
});
test('rejects falsified stop point, owner, question closure and identity merge', () => {
  const receipt = createStopReceipt(seed), p = packet(receipt);
  for (const mutated of [
    { ...p, stop_point: 'Crossing completed' }, { ...p, next_owner: 'Unknown' },
    { ...p, unresolved_questions: [] }, { ...p, identity_merge: true },
    { ...p, revoked_fact_promoted: true }, { ...p, continuity_id: 'crow' },
  ]) assert.equal(verifyReturn(receipt, mutated).ok, false);
  assert.equal(verifyReturn({ ...receipt, next_owner: 'Someone else' }, p).reason, 'receipt_tampered');
});
