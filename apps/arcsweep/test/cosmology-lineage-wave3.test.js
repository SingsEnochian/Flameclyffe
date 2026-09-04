import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  COSMOLOGY_INHERITANCE_MODES,
  MULTIVERSE_MODEL_GALLERY,
  TEMPORAL_UNCERTAINTIES,
  buildAllDivergenceRecords,
  buildWorldLineageGraph,
  inferCosmologyInheritance,
  temporalRange,
  worldDivergenceRecord,
} from '../src/world-cosmology-lineage.js';

test('cosmology inheritance exposes shared, branch, derived, independent and unknown modes', () => {
  assert.deepEqual(COSMOLOGY_INHERITANCE_MODES.map((item) => item.id), ['shared-terra-prime', 'branch', 'derived', 'independent', 'unknown']);
  assert.equal(inferCosmologyInheritance({ id: 'terra-prime', wakingWorld: { schema: 'x' } }).mode, 'shared-terra-prime');
  assert.equal(inferCosmologyInheritance({ id: 'child', parentWorldId: 'terra-prime', branchPoint: 'moon differs' }).mode, 'branch');
});

test('multiverse gallery keeps empirical status explicit and project topology separate', () => {
  for (const id of ['inflationary', 'everett', 'string-landscape', 'brane', 'cyclic', 'mathematical', 'hearthweave']) {
    assert.ok(MULTIVERSE_MODEL_GALLERY.some((item) => item.id === id));
  }
  const project = MULTIVERSE_MODEL_GALLERY.find((item) => item.id === 'hearthweave');
  assert.equal(project.status, 'project-canon-boundary');
  assert.match(project.empiricalStatus, /authored|project/i);
});

test('temporal uncertainty retains ranges rather than fake precision', () => {
  assert.ok(TEMPORAL_UNCERTAINTIES.length >= 6);
  const moon = TEMPORAL_UNCERTAINTIES.find((item) => item.id === 'moon-formation');
  const range = temporalRange(moon);
  assert.ok(range.minimum < range.maximum);
  const universe = temporalRange(TEMPORAL_UNCERTAINTIES.find((item) => item.id === 'universe-age'));
  assert.ok(universe.minimum < universe.centre && universe.maximum > universe.centre);
});

test('world lineage graph preserves parent edges and dangling ancestry', () => {
  const graph = buildWorldLineageGraph([
    { id: 'terra-prime', name: 'Terra Prime', wakingWorld: { schema: 'x' } },
    { id: 'luna', name: 'Luna', parentWorldId: 'terra-prime', branchPoint: 'lunar law' },
    { id: 'orphan', name: 'Orphan', parentWorldId: 'missing' },
  ]);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, 2);
  assert.equal(graph.edges.find((edge) => edge.to === 'luna').dangling, false);
  assert.equal(graph.edges.find((edge) => edge.to === 'orphan').dangling, true);
});

test('divergence records differences without mutating parent or child', () => {
  const parent = { id: 'p', name: 'Parent', kind: 'Root', history: 'A', rules: 'R', time: { wakingMinutes: 60, worldMinutes: 60 } };
  const child = { id: 'c', name: 'Child', parentWorldId: 'p', kind: 'Branch', history: 'B', rules: 'R', time: { wakingMinutes: 60, worldMinutes: 120 } };
  const before = JSON.stringify({ parent, child });
  const record = worldDivergenceRecord(parent, child, '2026-09-04T00:00:00Z');
  assert.ok(record.differenceCount >= 3);
  assert.ok(record.differences.some((item) => item.path === 'history'));
  assert.equal(JSON.stringify({ parent, child }), before);
  assert.equal(buildAllDivergenceRecords([parent, child]).length, 1);
});

test('cosmology lineage inspector is a real deep-history dependency', async () => {
  const deep = await readFile(new URL('../src/deep-history-atlas-sidecar.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/cosmology-lineage-sidecar.js', import.meta.url), 'utf8');
  assert.match(deep, /import '\.\/cosmology-lineage-sidecar\.js'/);
  for (const label of ['World lineage', 'Divergence', 'Uncertainty', 'Multiverse models']) assert.match(sidecar, new RegExp(label));
  assert.match(sidecar, /difference without overwrite/);
});
