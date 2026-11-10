import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveWayglassRoute, publicWayglassRoutes } = require('../../../lib/wayglass-route-registry.cjs');
const { resolveCharacterSeat, publicCharacterSeats } = require('../../starwell-server/wayglass/character-seats.cjs');

test('Amber and Wayglass are separate participants on the local Ollama provider', () => {
  const amber = resolveWayglassRoute('flame:amber:ollama');
  const ship = resolveWayglassRoute('wayglass:ship');
  assert.ok(amber);
  assert.ok(ship);
  assert.equal(amber.provider, 'ollama');
  assert.equal(ship.provider, 'ollama');
  assert.equal(amber.participant_id, 'amber');
  assert.equal(ship.participant_id, 'wayglass');
  assert.notEqual(amber.continuity_id, ship.continuity_id);
  assert.notEqual(amber.route_id, ship.route_id);
  assert.equal(amber.lineage.native_wayglass, false);
  assert.equal(ship.lineage.native_wayglass, false);
});

test('Amber has an explicit local model tag and never silently adopts the ship model', () => {
  const amber = resolveWayglassRoute('flame:amber:ollama');
  const ship = resolveWayglassRoute('wayglass:ship');
  const originalAmber = process.env.WAYGLASS_AMBER_MODEL;
  const originalShip = process.env.WAYGLASS_SHIP_MODEL;
  try {
    delete process.env.WAYGLASS_AMBER_MODEL;
    process.env.WAYGLASS_SHIP_MODEL = 'ship-only:tag';
    assert.equal(amber.configured(), false);
    assert.equal(amber.model(), 'unconfigured');
    assert.equal(ship.model(), 'ship-only:tag');
    process.env.WAYGLASS_AMBER_MODEL = 'orion-26b-a4b:local';
    delete process.env.WAYGLASS_SHIP_MODEL;
    assert.equal(amber.configured(), true);
    assert.equal(amber.model(), 'orion-26b-a4b:local');
    assert.equal(ship.model(), 'orion-26b-a4b:local');
  } finally {
    if (originalAmber === undefined) delete process.env.WAYGLASS_AMBER_MODEL;
    else process.env.WAYGLASS_AMBER_MODEL = originalAmber;
    if (originalShip === undefined) delete process.env.WAYGLASS_SHIP_MODEL;
    else process.env.WAYGLASS_SHIP_MODEL = originalShip;
  }
});

test('public route catalogue distinguishes Amber from Wayglass and reports unconfigured honestly', () => {
  const original = process.env.WAYGLASS_AMBER_MODEL;
  try {
    delete process.env.WAYGLASS_AMBER_MODEL;
    const routes = publicWayglassRoutes();
    const amber = routes.find(route => route.route_id === 'flame:amber:ollama');
    const ship = routes.find(route => route.route_id === 'wayglass:ship');
    assert.equal(amber.configured, false);
    assert.equal(amber.connection_verified, false);
    assert.equal(ship.participant_id, 'wayglass');
    assert.equal(amber.participant_id, 'amber');
  } finally {
    if (original === undefined) delete process.env.WAYGLASS_AMBER_MODEL;
    else process.env.WAYGLASS_AMBER_MODEL = original;
  }
});

test("Amber's own seat never inherits the Wayglass ship or fiction seat", () => {
  const amber = resolveCharacterSeat('amber');
  const wayglass = resolveCharacterSeat('wayglass');
  assert.equal(amber.kind, 'independent-participant');
  assert.equal(wayglass.kind, 'system-voice');
  assert.match(amber.instructions, /not the Wayglass Ship Voice/);
  assert.match(wayglass.instructions, /system voice seat/);
  assert.ok(publicCharacterSeats().some(seat => seat.id === 'amber'));
});
