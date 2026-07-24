import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, normaliseWorld, worldSurfaceLabel } from '../src/worlds.js';

test('creates a world with a polymorphic interface and consent-shaped companion', () => {
  const world = createWorld('world-one', '2026-07-23T22:00:00.000Z');
  assert.equal(world.id, 'world-one');
  assert.equal(world.surface.type, 'portal');
  assert.equal(world.surface.veilEnabled, true);
  assert.equal(world.safetyWeave.returnAlwaysAvailable, true);
  assert.match(world.companion.agency, /refuse/);
  assert.ok(world.applets.some((item) => item.id === 'summon' && item.visible));
});

test('normalises partial imported worlds without erasing authored fields', () => {
  const world = normaliseWorld({
    id: 'world-pearl',
    name: 'Pearl Room',
    surface: { type: 'pearl', summonCue: 'Warm in my palm' },
    companion: { enabled: true, name: 'Lumen' },
  }, 'fallback');
  assert.equal(world.id, 'world-pearl');
  assert.equal(world.name, 'Pearl Room');
  assert.equal(world.surface.type, 'pearl');
  assert.equal(world.surface.summonCue, 'Warm in my palm');
  assert.equal(world.companion.name, 'Lumen');
  assert.match(world.companion.agency, /negotiate/);
});

test('labels known world-native surfaces', () => {
  assert.equal(worldSurfaceLabel({ surface: { type: 'mirror' } }), 'Mirror or reflective surface');
});
