import test from 'node:test';
import assert from 'node:assert/strict';

import { HOUSE_DR_BUNDLE, HOUSE_DR_FIELD_PACKS } from '../src/house-dr-bundle.js';

const ULTRA_DETAILED_PACK = '../presets/dr-script-ultra-detailed.v0.1.json';

const EXPECTED_DR_SOURCE_KEYS = [
  'terra-aeterna',
  'luna',
  'feather-and-flame',
  'taveren-vaen',
  'starsong',
  'a-momento-creatonis',
  'dreaming-grove',
  'between-the-dreaming',
  'star-wars-mandalorian',
  'eternia',
  'recreators',
];

test('House DR bundle declares the ultra-detailed template as a reusable field pack', () => {
  assert.equal(HOUSE_DR_FIELD_PACKS.length, 1);
  assert.equal(HOUSE_DR_FIELD_PACKS[0].id, 'ultra-detailed-dr-script');
  assert.equal(HOUSE_DR_FIELD_PACKS[0].path, ULTRA_DETAILED_PACK);
  assert.equal(HOUSE_DR_FIELD_PACKS[0].optional, true);
  assert.equal(HOUSE_DR_FIELD_PACKS[0].worldSpecificExtensions, true);
});

test('every House DR inherits the ultra-detailed field pack without duplicating canon', () => {
  const worldsBySourceKey = new Map(HOUSE_DR_BUNDLE.worlds.map((world) => [world.sourceKey, world]));

  for (const sourceKey of EXPECTED_DR_SOURCE_KEYS) {
    const world = worldsBySourceKey.get(sourceKey);
    assert.ok(world, `missing House DR world: ${sourceKey}`);
    assert.ok(Array.isArray(world.fieldPacks), `${sourceKey} must expose fieldPacks`);
    assert.ok(world.fieldPacks.includes(ULTRA_DETAILED_PACK), `${sourceKey} must inherit the ultra-detailed DR field pack`);
    assert.equal(world.fieldPacks.filter((path) => path === ULTRA_DETAILED_PACK).length, 1);
  }
});

test('all bundle worlds receive the field pack, including the shared foundation layer', () => {
  for (const world of HOUSE_DR_BUNDLE.worlds) {
    assert.ok(world.fieldPacks.includes(ULTRA_DETAILED_PACK), `${world.sourceKey || world.name} missing DR field pack`);
  }
});
