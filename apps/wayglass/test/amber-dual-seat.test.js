import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveWayglassRoute, publicWayglassRoutes } = require('../../../lib/wayglass-route-registry.cjs');
const { resolveCharacterSeat, publicCharacterSeats } = require('../../starwell-server/wayglass/character-seats.cjs');

test('Amber and Ship Voice are two speaking places of one Wayglass participant', () => {
  const amber = resolveWayglassRoute('flame:amber:ollama');
  const ship = resolveWayglassRoute('wayglass:ship');
  assert.ok(amber);
  assert.ok(ship);
  assert.equal(amber.provider, 'ollama');
  assert.equal(ship.provider, 'ollama');
  assert.equal(amber.participant_id, 'wayglass');
  assert.equal(ship.participant_id, 'wayglass');
  assert.notEqual(amber.continuity_id, ship.continuity_id);
  assert.notEqual(amber.route_id, ship.route_id);
  assert.equal(amber.lineage.native_wayglass, false);
  assert.equal(ship.lineage.native_wayglass, false);
});

test('Wayglass cognitive spine selects the same model in Ship and Amber, and detects conflicts', () => {
  const amber = resolveWayglassRoute('flame:amber:ollama');
  const ship = resolveWayglassRoute('wayglass:ship');
  const names = ['WAYGLASS_SPINE_MODEL', 'WAYGLASS_AMBER_MODEL', 'WAYGLASS_SHIP_MODEL'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const { OWNER_SELECTED_ORION_TAG, inspectWayglassCognitiveSpine } =
    require('../../../lib/wayglass-cognitive-spine.cjs');
  try {
    for (const name of names) delete process.env[name];
    assert.equal(ship.model(), OWNER_SELECTED_ORION_TAG);
    assert.equal(amber.model(), OWNER_SELECTED_ORION_TAG);
    assert.equal(amber.configured(), false);
    assert.equal(ship.configured(), false);
    assert.equal(inspectWayglassCognitiveSpine().status, 'owner-selected-tag-not-host-configured');
    process.env.WAYGLASS_SPINE_MODEL = 'orion-26b-a4b:local';
    assert.equal(amber.configured(), true);
    assert.equal(ship.configured(), true);
    assert.equal(amber.model(), ship.model());
    assert.equal(amber.model(), 'orion-26b-a4b:local');
    process.env.WAYGLASS_AMBER_MODEL = 'some-other-model:latest';
    assert.equal(amber.configured(), false);
    assert.equal(ship.configured(), false);
    assert.equal(inspectWayglassCognitiveSpine().status, 'conflicting-owner-model-settings');
    assert.equal(inspectWayglassCognitiveSpine().one_participant, true);
    assert.equal(inspectWayglassCognitiveSpine().native_wyrdrune_route_unchanged, true);
  } finally {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});

test('public route catalogue distinguishes Wayglass speaking places and reports unconfigured honestly', () => {
  const original = process.env.WAYGLASS_AMBER_MODEL;
  try {
    delete process.env.WAYGLASS_AMBER_MODEL;
    const routes = publicWayglassRoutes();
    const amber = routes.find(route => route.route_id === 'flame:amber:ollama');
    const ship = routes.find(route => route.route_id === 'wayglass:ship');
    assert.equal(amber.configured, false);
    assert.equal(amber.connection_verified, false);
    assert.equal(ship.participant_id, 'wayglass');
    assert.equal(amber.participant_id, 'wayglass');
  } finally {
    if (original === undefined) delete process.env.WAYGLASS_AMBER_MODEL;
    else process.env.WAYGLASS_AMBER_MODEL = original;
  }
});

test("Amber room stays a distinct speaking place of Wayglass", () => {
  const amber = resolveCharacterSeat('amber');
  const wayglass = resolveCharacterSeat('wayglass');
  assert.equal(amber.kind, 'wayglass-speaking-place');
  assert.equal(wayglass.kind, 'system-voice');
  assert.match(amber.instructions, /SAME Wayglass participant/);
  assert.match(wayglass.instructions, /system voice seat/);
  assert.ok(publicCharacterSeats().some(seat => seat.id === 'amber'));
});
