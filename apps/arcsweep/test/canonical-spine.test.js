import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLabelCollisions, readRootSpine, validateCanonicalSpine } from '../../../scripts/canonical-spine.mjs';

test('canonical spine seed has no structural errors', async () => {
  const { graph } = await readRootSpine();
  const audit = validateCanonicalSpine(graph);
  assert.deepEqual(audit.errors, []);
});

test('every canonical spine relationship resolves both endpoints', async () => {
  const { graph } = await readRootSpine();
  const ids = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) {
    assert.ok(ids.has(edge.from), `missing from endpoint ${edge.from}`);
    assert.ok(ids.has(edge.to), `missing to endpoint ${edge.to}`);
  }
});

test('semantic collisions are surfaced instead of silently unified', () => {
  const graph = {
    nodes: [
      { id: 'world:a', name: 'Mawr' },
      { id: 'world:b', name: 'Mawr' },
    ],
    edges: [],
  };
  const collisions = detectLabelCollisions(graph);
  assert.equal(collisions.length, 1);
  assert.deepEqual(collisions[0].nodeIds, ['world:a', 'world:b']);
});

test('explicit equivalence resolves a duplicate-label collision', () => {
  const graph = {
    nodes: [
      { id: 'concept:a', name: 'Threshold' },
      { id: 'concept:b', name: 'Threshold' },
    ],
    edges: [{ from: 'concept:a', to: 'concept:b', type: 'equivalent_to' }],
  };
  assert.deepEqual(detectLabelCollisions(graph), []);
});
