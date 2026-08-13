import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import {
  createProjectionGraphSnapshot,
  projectionGraphFromSnapshot,
} from '../src/react-ion-graph-snapshot.js';
import { replayProjectionRoute } from '../src/react-ion-replay.js';

const edge = (to, distance) => ({
  to,
  projection_distance: distance,
  jacobian_risk: 0.05,
  harmonic_mismatch: 0.05,
  continuity_risk: 0.05,
  diagnostics: { source: 'snapshot-test' },
});

test('graph snapshot fingerprint is deterministic across node insertion order', async () => {
  const graphA = {
    b: [edge('c', 0.2)],
    a: [edge('b', 0.1)],
  };
  const graphB = {
    a: [edge('b', 0.1)],
    b: [edge('c', 0.2)],
  };
  const options = { createdAt: '2026-08-13T05:50:00.000Z', source: 'test' };
  const left = await createProjectionGraphSnapshot({ graph: graphA, ...options });
  const right = await createProjectionGraphSnapshot({ graph: graphB, ...options });
  assert.equal(left.fingerprint, right.fingerprint);
  assert.equal(left.node_count, 2);
  assert.equal(left.edge_count, 2);
});

test('captured graph can reproduce an original route after the live graph has changed', async () => {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '3.3.3.3@440',
    intention: 'Capture this route environment',
    requestedAt: '2026-08-13T05:51:00.000Z',
  });
  const middle = '0002.0002.0002.0002@330';
  const originalGraph = {
    [request.source]: [edge(middle, 0.1)],
    [middle]: [edge(request.target, 0.1)],
  };
  const route = await chooseProjectionRoute({ request, graph: originalGraph });
  const snapshot = await createProjectionGraphSnapshot({
    graph: originalGraph,
    createdAt: '2026-08-13T05:51:01.000Z',
  });

  const liveGraph = { [request.source]: [edge(request.target, 0.01)] };
  const currentReplay = await replayProjectionRoute({
    request,
    route,
    graph: liveGraph,
    replayedAt: '2026-08-13T05:51:02.000Z',
  });
  const historicalReplay = await replayProjectionRoute({
    request,
    route,
    graph: projectionGraphFromSnapshot(snapshot),
    replayedAt: '2026-08-13T05:51:03.000Z',
  });

  assert.equal(currentReplay.matched, false);
  assert.equal(historicalReplay.matched, true);
  assert.equal(snapshot.authority.snapshot_scope, 'projection-routing-graph');
});
