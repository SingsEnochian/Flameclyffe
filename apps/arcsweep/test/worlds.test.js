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

test('creates root worlds with explicit lineage and Worldseed inheritance slots', () => {
  const world = createWorld('root-world', '2026-08-18T14:00:00.000Z');
  assert.equal(world.parentWorldId, null);
  assert.equal(world.lineageLabel, 'Root world');
  assert.equal(world.worldseedFingerprint, '');
  assert.deepEqual(world.descendantWorldIds, []);
  assert.deepEqual(world.worldseedInheritance.mustSurvive, []);
  assert.deepEqual(world.worldseedInheritance.transferableSeeds, []);
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

test('normalises lineage without flattening authored ancestry', () => {
  const world = normaliseWorld({
    id: 'child-world',
    name: 'Child World',
    parentWorldId: 'parent-world',
    parentSeedFingerprint: 'ws-abc12345',
    branchPoint: 'Age of Restoration · Year 88',
    lineageLabel: 'Restoration branch',
    worldseedFingerprint: 'ws-def67890',
    descendantWorldIds: ['grandchild-world', '', 42],
    forkReason: 'Explore the path after the gate opens.',
    worldseedInheritance: {
      sourceFingerprint: 'ws-abc12345',
      mustSurvive: ['The hearth remains structural.'],
      mayChange: ['Institutions'],
      mayBeLost: ['Old offices'],
      descendantsInherit: ['The archive covenant'],
      transferableSeeds: ['Braided governance'],
    },
  }, 'fallback');

  assert.equal(world.parentWorldId, 'parent-world');
  assert.equal(world.parentSeedFingerprint, 'ws-abc12345');
  assert.equal(world.branchPoint, 'Age of Restoration · Year 88');
  assert.equal(world.lineageLabel, 'Restoration branch');
  assert.equal(world.worldseedFingerprint, 'ws-def67890');
  assert.deepEqual(world.descendantWorldIds, ['grandchild-world']);
  assert.equal(world.forkReason, 'Explore the path after the gate opens.');
  assert.deepEqual(world.worldseedInheritance.descendantsInherit, ['The archive covenant']);
});

test('labels known world-native surfaces', () => {
  assert.equal(worldSurfaceLabel({ surface: { type: 'mirror' } }), 'Mirror or reflective surface');
});
