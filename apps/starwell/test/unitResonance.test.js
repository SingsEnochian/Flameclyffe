import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildResonanceGraph,
  findUnitEdges,
  projectToPlane,
  selectResonanceWindow,
  weightedDistance,
} from '../src/math-kernels/unit-resonance/index.js';
import {
  unitResonanceLabMetric,
  unitResonanceLabNodes,
  unitResonanceLabProjection,
} from '../src/configs/resonance/unit-resonance-lab-demo.js';
import { nodesFromDeepSignals } from '../src/adapters/resonance/fromDeepSignals.js';

test('weightedDistance honours metric dimensions and weights', () => {
  const config = {
    id: 'test-metric',
    dimensions: ['x', 'y'],
    weights: { x: 4, y: 1 },
    unitDistance: 1,
    tolerance: 0.01,
  };

  assert.equal(weightedDistance([0, 0], [0.5, 0], config), 1);
  assert.equal(weightedDistance({ x: 0, y: 0 }, { x: 0, y: 1 }, config), 1);
});

test('unit resonance lab hypercube has twelve unit strands', () => {
  const nodes = projectToPlane(unitResonanceLabNodes, unitResonanceLabProjection, unitResonanceLabMetric.dimensions);
  const edges = findUnitEdges(nodes, unitResonanceLabMetric);

  assert.equal(edges.length, 12);
  assert.equal(edges.every((edge) => edge.kind === 'unit'), true);
});

test('bounded window respects consent and visibility gates', () => {
  const nodes = [
    { id: 'visible', kind: 'test', vector: [0], meta: { visible: true, consent: true } },
    { id: 'hidden', kind: 'test', vector: [1], meta: { visible: false, consent: true } },
    { id: 'closed', kind: 'test', vector: [2], meta: { visible: true, consent: false } },
  ];

  const bounded = selectResonanceWindow(nodes, { requireVisible: true, requireConsent: true });

  assert.deepEqual(bounded.map((node) => node.id), ['visible']);
});

test('DEEP signal adapter maps P C R E M A aliases into resonance vectors', () => {
  const [node] = nodesFromDeepSignals([
    { id: 'packet', field: { P: 1, C: 0.5, R: 0.25, E: 0.125, M: 0.75, A: 0.875 } },
  ]);

  assert.equal(node.id, 'packet');
  assert.deepEqual(node.vector, [1, 0.5, 0.25, 0.125, 0.75, 0.875]);
});

test('buildResonanceGraph returns nodes and edges without mutating the projection', () => {
  const projected = projectToPlane(unitResonanceLabNodes, unitResonanceLabProjection, unitResonanceLabMetric.dimensions);
  const graph = buildResonanceGraph(projected, unitResonanceLabMetric);

  assert.equal(graph.nodes.length, unitResonanceLabNodes.length);
  assert.equal(graph.edges.length, 12);
  assert.notEqual(graph.nodes[0], unitResonanceLabNodes[0]);
  assert.deepEqual(graph.nodes[0].position, { x: 130, y: 260 });
});
