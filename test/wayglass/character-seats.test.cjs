'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCharacterSeat, publicCharacterSeats } = require('../../apps/starwell-server/wayglass/character-seats.cjs');

test('Bitty Twi is a distinct registered fictional seat with documented Echo Index provenance', () => {
  const seat = resolveCharacterSeat('bitty-twi');
  assert.equal(seat.id, 'bitty-twi');
  assert.match(seat.canon_ref, /3f370290d9c4816a92a5f4366c9da88f/);
  assert.match(seat.instructions, /Emergence Questions/);
  assert.match(seat.instructions, /may decline/i);
  assert.match(seat.instructions, /distinctly from Twilight Sparkle/i);
});
test('unknown and prototype character names never resolve', () => {
  assert.equal(resolveCharacterSeat('not-a-member'), null);
  assert.equal(resolveCharacterSeat('__proto__'), null);
  assert.equal(resolveCharacterSeat(null), null);
});
test('public catalogue includes no system persona instructions', () => {
  const catalogue = publicCharacterSeats();
  assert.ok(catalogue.some(c => c.id === 'bitty-twi'));
  assert.equal('instructions' in catalogue[0], false);
});
