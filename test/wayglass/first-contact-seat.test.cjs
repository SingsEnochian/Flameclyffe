'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCharacterSeat, publicCharacterSeats } = require('../../apps/starwell-server/wayglass/character-seats.cjs');

test('First Contact exposes a separate Wayglass ship voice seat', () => {
  const seat = resolveCharacterSeat('wayglass');
  assert.equal(seat?.id, 'wayglass');
  assert.equal(seat?.kind, 'system-voice');
  assert.match(seat.instructions, /underlying provider model/);
  assert.match(seat.instructions, /Do not claim to be a native trained Wayglass model/);
  assert.ok(publicCharacterSeats().some(x => x.id === 'wayglass'));
});

test('existing Bitty Twi character seat is preserved', () => {
  assert.equal(resolveCharacterSeat('bitty-twi')?.id, 'bitty-twi');
  assert.equal(resolveCharacterSeat('unknown'), null);
});
