import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  GEOLOGICAL_ATLAS,
  HUMAN_HISTORY_LATTICE,
  LUNAR_HISTORY,
  SOLAR_SYSTEM_FAMILY,
  geologicalSpanWidth,
  humanHistoryConcurrency,
} from '../src/deep-history-atlas.js';

test('geological atlas carries eons, supercontinents, extinctions, climate, magnetics and impacts', () => {
  for (const key of ['eons', 'supercontinents', 'massExtinctions', 'climateAndAtmosphere', 'magnetic', 'impacts']) {
    assert.ok(Array.isArray(GEOLOGICAL_ATLAS[key]) && GEOLOGICAL_ATLAS[key].length > 0, `missing geological family ${key}`);
  }
  assert.ok(GEOLOGICAL_ATLAS.supercontinents.some((item) => item.id === 'pangaea'));
  assert.ok(GEOLOGICAL_ATLAS.massExtinctions.some((item) => item.id === 'kpg'));
});

test('geological spans map onto bounded logarithmic geometry', () => {
  const pangaea = GEOLOGICAL_ATLAS.supercontinents.find((item) => item.id === 'pangaea');
  const shape = geologicalSpanWidth(pangaea);
  assert.ok(shape.left >= 0 && shape.left <= 1);
  assert.ok(shape.right >= 0 && shape.right <= 1);
  assert.ok(shape.width > 0 && shape.width <= 1);
});

test('Solar System family preserves origin, star, planets, dwarf planets and reservoirs', () => {
  assert.equal(SOLAR_SYSTEM_FAMILY.root.id, 'protosolar-nebula');
  assert.equal(SOLAR_SYSTEM_FAMILY.star.id, 'sun');
  assert.ok(SOLAR_SYSTEM_FAMILY.terrestrial.some((item) => item.id === 'earth'));
  assert.ok(SOLAR_SYSTEM_FAMILY.terrestrial.some((item) => item.id === 'moon'));
  assert.ok(SOLAR_SYSTEM_FAMILY.giants.some((item) => item.id === 'neptune'));
  assert.ok(SOLAR_SYSTEM_FAMILY.dwarfPlanets.some((item) => item.id === 'pluto'));
  assert.ok(SOLAR_SYSTEM_FAMILY.reservoirs.some((item) => item.id === 'oort-cloud'));
});

test('lunar instrument separates established reconstruction, debated bombardment and open questions', () => {
  assert.ok(LUNAR_HISTORY.phases.some((item) => item.id === 'formation' && item.provenance === 'strong-inference'));
  assert.ok(LUNAR_HISTORY.phases.some((item) => item.id === 'basin-era' && item.provenance === 'debated-reconstruction'));
  assert.ok(LUNAR_HISTORY.openQuestions.length >= 5);
});

test('human history lattice is concurrent and geographically plural', () => {
  const medieval = humanHistoryConcurrency(1200);
  assert.ok(medieval.length > 0);
  const node = medieval[0];
  assert.ok(node.regions.length > 2);
  assert.ok(HUMAN_HISTORY_LATTICE.nodes.some((item) => item.regions.includes('Mesoamerica')));
  assert.ok(HUMAN_HISTORY_LATTICE.nodes.some((item) => item.regions.includes('Africa') || item.regions.includes('West Africa')));
});

test('World truth sidecar mounts the deep-history atlas as a real build dependency', async () => {
  const truth = await readFile(new URL('../src/terra-prime-truth-sidecar.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/deep-history-atlas-sidecar.js', import.meta.url), 'utf8');
  assert.match(truth, /import '\.\/deep-history-atlas-sidecar\.js'/);
  for (const label of ['Geology', 'Solar family', 'Moon', 'Human lattice']) assert.match(sidecar, new RegExp(label));
  assert.match(sidecar, /logarithmic/);
  assert.match(sidecar, /Concurrent history/);
});
