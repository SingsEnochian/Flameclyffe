import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWorldLineageGraph, lineagePath, WORLD_LINEAGE_GRAPH_SCHEMA } from '../src/world-lineage.js';

test('builds roots, children, and ancestry paths from world lineage metadata', () => {
  const worlds = [
    { id: 'earth', name: 'Earth', parentWorldId: null, descendantWorldIds: ['moon'] },
    { id: 'moon', name: 'Moon', parentWorldId: 'earth', descendantWorldIds: ['mars'] },
    { id: 'mars', name: 'Mars', parentWorldId: 'moon', descendantWorldIds: [] },
  ];
  const graph = buildWorldLineageGraph(worlds);
  assert.equal(graph.schema, WORLD_LINEAGE_GRAPH_SCHEMA);
  assert.deepEqual(graph.roots, ['earth']);
  assert.equal(graph.healthy, true);
  assert.deepEqual(graph.nodes.find((node) => node.id === 'earth').childWorldIds, ['moon']);
  assert.deepEqual(lineagePath(worlds, 'mars'), ['earth', 'moon', 'mars']);
});

test('surfaces dangling parents and stale declared child references', () => {
  const graph = buildWorldLineageGraph([
    { id: 'root', descendantWorldIds: ['ghost'] },
    { id: 'orphan', parentWorldId: 'missing-parent', descendantWorldIds: [] },
  ]);
  assert.equal(graph.healthy, false);
  assert.deepEqual(graph.danglingParents, [{ worldId: 'orphan', parentWorldId: 'missing-parent' }]);
  assert.deepEqual(graph.nodes.find((node) => node.id === 'root').staleDeclaredChildWorldIds, ['ghost']);
});

test('detects ancestry cycles instead of silently presenting them as lineage', () => {
  const graph = buildWorldLineageGraph([
    { id: 'a', parentWorldId: 'b' },
    { id: 'b', parentWorldId: 'a' },
  ]);
  assert.equal(graph.healthy, false);
  assert.deepEqual(new Set(graph.cycleWorldIds), new Set(['a', 'b']));
  assert.throws(() => lineagePath([
    { id: 'a', parentWorldId: 'b' },
    { id: 'b', parentWorldId: 'a' },
  ], 'a'), /cycle/i);
});
