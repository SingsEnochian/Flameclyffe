import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createLocalReceipt, verifyLocalReceipt, replayLocalReceipts } from '../src/wayglass-local-event-ledger.js';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const lookup = id => id === 'constellation:rarity' ? publicKey : null;
const make = (kind, sequence, previous_id, payload) =>
  createLocalReceipt({ author_ref: 'constellation:rarity', kind, sequence, previous_id, payload }, privateKey);
test('signed local receipt verifies against existing identity key binding', () => {
  const e = make('work.recorded', 0, null, { change: 'test' });
  assert.equal(verifyLocalReceipt(e, lookup), true);
  assert.equal(verifyLocalReceipt(e, () => null), false);
  assert.equal(verifyLocalReceipt({ ...e, payload: { change: 'forged' } }, lookup), false);
});
test('departure, unresolved wonder and authorised return replay deterministically', () => {
  const a = make('wonder.opened', 0, null, { question_id: 'what-next' });
  const b = make('departure.recorded', 1, a.id, { stop_point: 'atelier:step-3', next_owner: 'constellation:rarity' });
  const c = make('return.accepted', 2, b.id, { stop_point: 'atelier:step-3', next_owner: 'constellation:rarity' });
  const first = replayLocalReceipts([a,b,c], lookup);
  const again = replayLocalReceipts([a,b,c], lookup);
  assert.deepEqual(first, again);
  assert.deepEqual(first.unresolved_wonder, ['what-next']);
  assert.equal(first.stop_point, null);
});
test('reject corrupted identity binding and mismatched stop-point', () => {
  const a = make('departure.recorded', 0, null, { stop_point: 'A', next_owner: 'constellation:rarity' });
  const badReturn = make('return.accepted', 1, a.id, { stop_point: 'B', next_owner: 'constellation:rarity' });
  assert.throws(() => replayLocalReceipts([a,badReturn], lookup), /inconsistent return/);
  assert.throws(() => replayLocalReceipts([a], () => null), /signature/);
});
test('reject duplicate, reordered or tampered chain events', () => {
  const a = make('work.recorded', 0, null, {});
  assert.throws(() => replayLocalReceipts([a,a], lookup));
  const b = make('work.recorded', 1, a.id, {});
  assert.throws(() => replayLocalReceipts([b,a], lookup));
  assert.throws(() => replayLocalReceipts([a,{ ...b, previous_id: null }], lookup));
});
