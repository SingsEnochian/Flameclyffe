import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import { analyseClosedProjectionLoop, replayProjectionRoute } from '../src/react-ion-replay.js';

const edge = (to, distance = 0.1) => ({
  to,
  projection_distance: distance,
  jacobian_risk: 0.05,
  harmonic_mismatch: 0.05,
  continuity_risk: 0.05,
});

async function makeRoute(source, target, middle, requestedAt) {
  const request = await compileNavigationRequest({ source, target, intention: 'Replay me', requestedAt });
  const graph = middle ? {
    [request.source]: [edge(middle)],
    [middle]: [edge(request.target)],
  } : {
    [request.source]: [edge(request.target)],
  };
  const route = await chooseProjectionRoute({ request, graph });
  return { request, route, graph };
}

test('deterministically replays the same route when the graph and weights have not changed', async () => {
  const { request, route, graph } = await makeRoute(
    '1.1.1.1@220',
    '3.3.3.3@440',
    '0002.0002.0002.0002@330',
    '2026-08-13T05:00:00.000Z',
  );
  const replay = await replayProjectionRoute({
    request,
    route,
    graph,
    replayedAt: '2026-08-13T05:01:00.000Z',
  });
  assert.equal(replay.matched, true);
  assert.deepEqual(replay.checks, { path: true, cost: true, fingerprint: true });
});

test('reports replay drift when the graph now prefers a different path', async () => {
  const { request, route } = await makeRoute(
    '1.1.1.1@220',
    '4.4.4.4@528',
    '0002.0002.0002.0002@330',
    '2026-08-13T05:02:00.000Z',
  );
  const changedGraph = {
    [request.source]: [edge(request.target, 0.01)],
  };
  const replay = await replayProjectionRoute({
    request,
    route,
    graph: changedGraph,
    replayedAt: '2026-08-13T05:03:00.000Z',
  });
  assert.equal(replay.matched, false);
  assert.equal(replay.checks.path, false);
});

test('records return-with-difference as model holonomy on a closed route chain', async () => {
  const outward = await makeRoute(
    '1.1.1.1@220',
    '2.2.2.2@330',
    null,
    '2026-08-13T05:04:00.000Z',
  );
  const home = await makeRoute(
    '2.2.2.2@330',
    '1.1.1.1@220',
    null,
    '2026-08-13T05:05:00.000Z',
  );
  const receipt = await analyseClosedProjectionLoop({
    routes: [outward.route, home.route],
    orientationBefore: [1, 0, 0],
    orientationAfter: [0, 1, 0],
    observedAt: '2026-08-13T05:06:00.000Z',
  });
  assert.equal(receipt.closed, true);
  assert.equal(receipt.start, receipt.end);
  assert.equal(receipt.holonomy_detected, true);
  assert.ok(receipt.orientation.delta_norm > 1);
  assert.equal(receipt.authority.physical_spacetime_holonomy_claimed, false);
});
