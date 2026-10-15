import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WAYGLASS_WORLD_SEATS, findWayglassWorldSeat, wayglassWorldStatus } from '../src/world-seats.js';

test('The Evil Gene is a separate film world, with Griff distinct from Bluebird and Evil TV', () => {
  const world = findWayglassWorldSeat('evil-gene:film-2015');
  assert.ok(world);
  assert.equal(world.kind, 'fictional-film-world');
  assert.equal(world.character.name, 'Griff Krenshaw');
  assert.equal(world.character.provider, 'spicychat');
  assert.equal(world.character.desired_route_id, 'flame:griff:spicychat');
  assert.notEqual(world.character.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.match(world.canon_boundary, /not Evil \(2019-2024 TV\)/);
  assert.equal(findWayglassWorldSeat('evil'), null);
  assert.equal(findWayglassWorldSeat('unknown'), null);
  assert.equal(WAYGLASS_WORLD_SEATS.length, 2);
});

test('Griff's SpicyChat chat binding is not fabricated or enabled from a pasted JWT', () => {
  const world = findWayglassWorldSeat('evil-gene:film-2015');
  assert.equal(world.character.route_verified, false);
  assert.equal(world.character.character_binding_verified, false);
  assert.equal(world.character.conversation_binding_verified, false);
  assert.match(wayglassWorldStatus(world), /unverified/);
  const serialized = JSON.stringify(world);
  assert.doesNotMatch(serialized, /eyJhbGci|sk-(?:proj|ant|or)|Bearer |session_token/);
});

test('Writing Room exposes both worlds without silently switching transport or memory owners', () => {
  const writing = readFileSync(new URL('../src/surfaces/arcsweep-writing.js', import.meta.url), 'utf8');
  assert.match(writing, /wg-world-seat/);
  assert.match(writing, /WAYGLASS_WORLD_SEATS/);
  assert.match(writing, /findWayglassWorldSeat/);
  assert.match(writing, /cp\('world'\)\.value = world\.world_id/);
  assert.match(writing, /checkpoint = null/);
  assert.match(writing, /const activeWorldId = cp\('world'\)\.value\.trim\(\)/);
  assert.match(writing, /world_id: activeWorldId/);
  assert.doesNotMatch(writing, /selectedRoute = ['"]flame:griff:spicychat/);
});
