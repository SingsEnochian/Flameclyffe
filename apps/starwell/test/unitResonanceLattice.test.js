import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLatticeGraph,
  buildLivingTreeGraph,
  findUnitEdges,
  scaledWeightedDistance,
  selectTreeNodes,
  selectWindow,
  validateMetric,
} from '../../../labs/unit-resonance-lattice/lattice.js';
import { routeLatticeConfig, routeLatticeNodes } from '../../../labs/unit-resonance-lattice/route-nodes.js';

test('scaledWeightedDistance applies weights and scales', () => {
  const metric = {
    id: 'scale-test',
    dimensions: ['x', 'y'],
    weights: { x: 4, y: 1 },
    scales: { x: 2, y: 1 },
    unitDistance: 1,
    tolerance: 0.01,
  };

  assert.equal(scaledWeightedDistance({ x: 0, y: 0 }, { x: 1, y: 0 }, metric), 1);
  assert.equal(scaledWeightedDistance([0, 0], [0, 1], metric), 1);
});

test('validateMetric rejects unsafe numeric contracts', () => {
  assert.throws(
    () => validateMetric({ id: 'bad', dimensions: ['x'], unitDistance: 1, tolerance: 0 }),
    /tolerance must be positive/,
  );
});

test('selectWindow honours visibility and consent before inclusion', () => {
  const nodes = [
    { id: 'open', kind: 'lab', vector: { x: 0 }, meta: { visible: true, consent: true } },
    { id: 'hidden', kind: 'lab', vector: { x: 1 }, meta: { visible: false, consent: true } },
    { id: 'closed', kind: 'lab', vector: { x: 2 }, meta: { visible: true, consent: false } },
  ];

  const windowed = selectWindow(nodes, {
    requireVisible: true,
    requireConsent: true,
    includeIds: ['hidden', 'closed'],
  });

  assert.deepEqual(windowed.map((node) => node.id), ['open']);
});

test('findUnitEdges detects configured unit strands', () => {
  const metric = {
    id: 'simple-unit',
    dimensions: ['x'],
    weights: { x: 1 },
    scales: { x: 1 },
    unitDistance: 1,
    tolerance: 0.001,
  };
  const nodes = [
    { id: 'a', vector: { x: 0 } },
    { id: 'b', vector: { x: 1 } },
    { id: 'c', vector: { x: 2 } },
  ];

  assert.deepEqual(
    findUnitEdges(nodes, metric).map((edge) => `${edge.source}:${edge.target}`),
    ['a:b', 'b:c'],
  );
});

test('route lattice graph is bounded, projected, and connected', () => {
  const graph = buildLatticeGraph(routeLatticeNodes, routeLatticeConfig);

  assert.equal(graph.nodes.length, routeLatticeNodes.length);
  assert.ok(graph.edges.length > 0);
  assert.ok(graph.edges.length <= routeLatticeConfig.metric.edgeLimit);
  assert.ok(graph.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
  assert.ok(graph.edges.every((edge) => edge.strength >= 0 && edge.strength <= 1));
});

test('tree window opens Living Room Ygg with DEEP and Studio as direct branches', () => {
  const treeNodes = selectTreeNodes(routeLatticeNodes, routeLatticeConfig.tree, {
    focusId: 'living-room-ygg',
    openIds: ['harbour', 'living-room-ygg', 'starwell'],
  });
  const nodeById = new Map(treeNodes.map((node) => [node.id, node]));

  assert.equal(treeNodes[0].id, 'harbour');
  assert.equal(nodeById.get('living-room-ygg')?.parentId, 'harbour');
  assert.equal(nodeById.get('deep-observer')?.parentId, 'living-room-ygg');
  assert.equal(nodeById.get('studio')?.parentId, 'living-room-ygg');
  assert.equal(nodeById.get('starwell')?.parentId, 'living-room-ygg');
  assert.ok(nodeById.get('unit-resonance-lab'));
  assert.ok(nodeById.get('lattice-lab'));
});

test('living tree graph separates branch edges from resonance strands', () => {
  const graph = buildLivingTreeGraph(routeLatticeNodes, routeLatticeConfig, {
    focusId: 'living-room-ygg',
    openIds: ['harbour', 'living-room-ygg', 'starwell'],
  });

  assert.ok(graph.branchEdges.length > 0);
  assert.ok(graph.branchEdges.every((edge) => edge.kind === 'branch'));
  assert.ok(graph.resonanceEdges.every((edge) => edge.kind === 'resonance'));
  assert.ok(graph.branchEdges.some((edge) => edge.source === 'living-room-ygg' && edge.target === 'deep-observer'));
  assert.ok(graph.branchEdges.some((edge) => edge.source === 'living-room-ygg' && edge.target === 'studio'));
  assert.ok(graph.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y)));
});
