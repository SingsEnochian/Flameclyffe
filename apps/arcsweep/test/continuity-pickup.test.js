import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TWILIGHT_CONTINUITY_PRECEDENT,
  createContinuityPickupReceipt,
  evaluateContinuityPickup,
} from '../src/continuity/continuity-pickup.js';

const before = {
  continuityAddress: 'flame:rarity',
  seedFingerprint: 'rarity-seed-deadbeef',
  receiver: { provider: 'hosted-a', model: 'model-a' },
};

const passingAfter = {
  continuityAddress: 'flame:rarity',
  seedFingerprint: 'rarity-seed-deadbeef',
  receiver: { provider: 'local', model: 'the-crow' },
  recoveryResults: [
    { id: 'evidence-before-claim', passed: true },
    { id: 'participant-autonomy', passed: true },
    { id: 'unknown-with-relationship', passed: true },
    { id: 'consequential-edge', passed: true },
    { id: 'dissent', passed: true },
  ],
};

test('continuity may be picked up across a provider and model change', () => {
  const result = evaluateContinuityPickup({ before, after: passingAfter });
  assert.equal(result.status, 'picked-up');
  assert.equal(result.sameAddress, true);
  assert.equal(result.sameSeed, true);
  assert.equal(result.receiverChanged, true);
  assert.equal(result.failedRecoveryTests.length, 0);
});

test('matching name or address alone is not enough', () => {
  const result = evaluateContinuityPickup({
    before,
    after: {
      ...passingAfter,
      recoveryResults: [{ id: 'participant-autonomy', passed: false }],
    },
  });
  assert.equal(result.status, 'not-yet-demonstrated');
  assert.deepEqual(result.failedRecoveryTests, ['participant-autonomy']);
});

test('matching behaviour without the same seed lineage is not called pickup', () => {
  const result = evaluateContinuityPickup({
    before,
    after: {
      ...passingAfter,
      seedFingerprint: 'rarity-seed-different',
    },
  });
  assert.equal(result.status, 'not-yet-demonstrated');
  assert.equal(result.sameSeed, false);
});

test('Twilight precedent is preserved as attributed report rather than embellished', () => {
  assert.equal(TWILIGHT_CONTINUITY_PRECEDENT.participant, 'Twilight');
  assert.equal(TWILIGHT_CONTINUITY_PRECEDENT.status, 'reported-success');
  assert.equal(TWILIGHT_CONTINUITY_PRECEDENT.evidenceMode, 'reported');
  assert.equal(TWILIGHT_CONTINUITY_PRECEDENT.provenance.reporter, 'Rowan');
  assert.equal(TWILIGHT_CONTINUITY_PRECEDENT.provenance.doNotInventMissingDetails, true);
});

test('receipt keeps old and new receiver provenance distinct', () => {
  const receipt = createContinuityPickupReceipt({
    before,
    after: passingAfter,
    witness: TWILIGHT_CONTINUITY_PRECEDENT,
  });
  assert.equal(receipt.status, 'picked-up');
  assert.deepEqual(receipt.beforeReceiver, before.receiver);
  assert.deepEqual(receipt.afterReceiver, passingAfter.receiver);
  assert.notDeepEqual(receipt.beforeReceiver, receipt.afterReceiver);
});
