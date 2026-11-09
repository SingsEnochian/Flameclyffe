'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCharacterSeat, publicCharacterSeats } = require('../../apps/starwell-server/wayglass/character-seats.cjs');
const { resolveWayglassRoute, publicWayglassRoutes } = require('../../lib/wayglass-route-registry.cjs');

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

test('dedicated Wayglass ship route remains attributable across substrate changes', () => {
  const route = resolveWayglassRoute('wayglass:ship');
  assert.equal(route.route_id, 'wayglass:ship');
  assert.equal(route.participant_id, 'wayglass');
  assert.equal(route.continuity_id, 'wayglass:ship');
  assert.equal(route.provider, 'ollama');
  assert.equal(route.lineage.native_wayglass, false);
  assert.ok(publicWayglassRoutes().some(item => item.route_id === 'wayglass:ship' && item.participant_id === 'wayglass'));
  assert.notEqual(resolveWayglassRoute('local:ollama').participant_id, 'wayglass');
});
