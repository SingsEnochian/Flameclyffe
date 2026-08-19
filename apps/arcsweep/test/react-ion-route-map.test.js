import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileReactionRegistry,
  createCorridorRegistration,
  createDestinationRegistration,
} from '../src/react-ion-registry.js';
import { buildReactionRouteMap } from '../src/react-ion-route-map.js';
import { chooseProjectionRoute, compileNavigationRequest } from '../src/react-ion-engine.js';
import { inspectProjectionRoutes } from '../src/react-ion-route-inspector.js';

async function destination(id, name, address, worldId, rootHz) {
  return createDestinationRegistration({
    id, name, kind: 'world', worldId, worldName: name, address, rootHz,
    profileVersion: 'test', evidenceClass: 'symbolic', sourceRef: 'route-map-test', state: 'approved',
    updatedAt: '2026-08-13T05:10:00.000Z',
  });
}

test('builds deterministic route-map nodes and marks selected and blocked topology', async () => {
  const a = await destination('a', 'alpha', '1.1.1.1@220', 'world-a', 220);
  const b = await destination('b', 'beta', '2.2.2.2@330', 'world-b', 330);
  const c = await destination('c', 'gamma', '3.3.3.3@440', 'world-c', 440);
  const ab = await createCorridorRegistration({
    id: 'ab', from: 'alpha', to: 'beta', jacobian: '1,0;0,1', state: 'approved', bidirectional: true,
    updatedAt: '2026-08-13T05:10:00.000Z',
  });
  const bc = await createCorridorRegistration({
    id: 'bc', from: 'beta', to: 'gamma', jacobian: '1,0;0,1', identity: 0.2, state: 'approved',
    updatedAt: '2026-08-13T05:10:00.000Z',
  });
  const runtime = compileReactionRegistry({ destinations: [a, b, c], corridors: [ab, bc] });
  const source = runtime.registry.resolve('alpha').endpoint.address_text;
  const target = runtime.registry.resolve('beta').endpoint.address_text;
  const request = await compileNavigationRequest({
    source, target, intention: 'Map the selected route', requestedAt: '2026-08-13T05:11:00.000Z',
  });
  const route = await chooseProjectionRoute({ request, graph: runtime.graph });
  const inspection = await inspectProjectionRoutes({ request, graph: runtime.graph });
  const map = buildReactionRouteMap({ runtime, route, inspection });

  assert.equal(map.nodes.length, 3);
  assert.equal(map.nodes.find((node) => node.address === source).source, true);
  assert.equal(map.nodes.find((node) => node.address === target).target, true);
  assert.equal(map.edges.some((edge) => edge.active), true);
  assert.equal(map.edges.some((edge) => edge.blocked), true);
  assert.equal(map.authority.map_is_not_physical_spacetime_cartography, true);
});

test('keeps manual route-only addresses visible even when DNS is empty', async () => {
  const runtime = compileReactionRegistry({ destinations: [], corridors: [] });
  const request = await compileNavigationRequest({
    source: '7.7.7.7@220', target: '8.8.8.8@330', intention: 'Manual route map',
    requestedAt: '2026-08-13T05:12:00.000Z',
  });
  const direct = {
    from: request.source,
    to: request.target,
    projection_distance: 0.1,
    jacobian_risk: 0.1,
    harmonic_mismatch: 0.1,
    continuity_risk: 0.1,
  };
  const route = await chooseProjectionRoute({ request, graph: { [request.source]: [direct] } });
  const map = buildReactionRouteMap({ runtime, route, directEdge: direct });
  assert.equal(map.nodes.length, 2);
  assert.equal(map.nodes.every((node) => node.kind === 'route-only'), true);
  assert.equal(map.edges.length, 1);
});
