import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileReactionRegistry,
  createCorridorRegistration,
  createDestinationRegistration,
  createEmptyReactionRegistryStore,
  findApprovedWorldDestination,
} from '../src/react-ion-registry.js';
import { compileNavigationRequest, chooseProjectionRoute } from '../src/react-ion-engine.js';
import { inspectProjectionRoutes } from '../src/react-ion-route-inspector.js';

async function destination(id, name, address, worldId, rootHz, state = 'approved') {
  return createDestinationRegistration({
    id,
    name,
    aliases: [`${name}.alias`],
    kind: 'world',
    worldId,
    worldName: name,
    address,
    rootHz,
    profileVersion: 'test-v1',
    evidenceClass: 'symbolic',
    sourceRef: 'test-profile',
    state,
    updatedAt: '2026-08-13T04:50:00.000Z',
  });
}

test('compiles only approved destinations into the dimensional naming runtime', async () => {
  const terra = await destination('dest-terra', 'terra', '1.1.1.1@220', 'world-terra', 220);
  const draft = await destination('dest-draft', 'draftworld', '2.2.2.2@330', 'world-draft', 330, 'draft');
  const runtime = compileReactionRegistry({
    ...createEmptyReactionRegistryStore(),
    destinations: [terra, draft],
  });

  assert.equal(runtime.destinations.length, 1);
  assert.equal(runtime.registry.resolve('terra').endpoint.world.id, 'world-terra');
  assert.equal(runtime.registry.resolve('terra.alias').endpoint.address_text, '0001.0001.0001.0001@220');
  assert.equal(runtime.registry.resolve('draftworld'), null);
  assert.equal(findApprovedWorldDestination(runtime, 'world-terra').name, 'terra');
});

test('builds approved bidirectional corridors and preserves continuity vetoes as blocked edges', async () => {
  const a = await destination('dest-a', 'a', '1.1.1.1@220', 'world-a', 220);
  const b = await destination('dest-b', 'b', '2.2.2.2@330', 'world-b', 330);
  const c = await destination('dest-c', 'c', '3.3.3.3@440', 'world-c', 440);
  const ab = await createCorridorRegistration({
    id: 'corridor-ab', from: 'a', to: 'b', jacobian: '1,0;0,1',
    identity: 0.96, continuity: 0.96, agency: 0.96, bidirectional: true, state: 'approved',
    updatedAt: '2026-08-13T04:50:00.000Z',
  });
  const bc = await createCorridorRegistration({
    id: 'corridor-bc', from: 'b', to: 'c', jacobian: '1,0;0,1',
    identity: 0.4, continuity: 0.95, agency: 0.95, state: 'approved',
    updatedAt: '2026-08-13T04:50:00.000Z',
  });

  const runtime = compileReactionRegistry({ destinations: [a, b, c], corridors: [ab, bc] });
  const aAddress = runtime.registry.resolve('a').endpoint.address_text;
  const bAddress = runtime.registry.resolve('b').endpoint.address_text;
  const cAddress = runtime.registry.resolve('c').endpoint.address_text;

  assert.equal(runtime.graph[aAddress].length, 1);
  assert.equal(runtime.graph[bAddress].some((edge) => edge.to === aAddress), true);
  assert.equal(runtime.graph[bAddress].find((edge) => edge.to === cAddress).blocked, true);

  const request = await compileNavigationRequest({
    source: aAddress,
    target: cAddress,
    intention: 'Try the approved corridor graph',
    requestedAt: '2026-08-13T04:51:00.000Z',
  });
  await assert.rejects(() => chooseProjectionRoute({ request, graph: runtime.graph }), /unreachable/);
});

test('inspects and ranks multiple simple routes while skipping blocked corridors', async () => {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '4.4.4.4@528',
    intention: 'Compare alternate corridors',
    requestedAt: '2026-08-13T04:52:00.000Z',
  });
  const start = request.source;
  const target = request.target;
  const a = '0002.0002.0002.0002@330';
  const b = '0003.0003.0003.0003@440';
  const graph = {
    [start]: [
      { to: target, projection_distance: 0.3, jacobian_risk: 0.1, harmonic_mismatch: 0.1, continuity_risk: 0.1 },
      { to: a, projection_distance: 0.1, jacobian_risk: 0.05, harmonic_mismatch: 0.05, continuity_risk: 0.05 },
      { to: b, projection_distance: 0.01, jacobian_risk: 0.01, harmonic_mismatch: 0.01, continuity_risk: 0.01, blocked: true },
    ],
    [a]: [
      { to: target, projection_distance: 0.1, jacobian_risk: 0.05, harmonic_mismatch: 0.05, continuity_risk: 0.05 },
    ],
    [b]: [
      { to: target, projection_distance: 0.01, jacobian_risk: 0.01, harmonic_mismatch: 0.01, continuity_risk: 0.01 },
    ],
  };

  const inspection = await inspectProjectionRoutes({ request, graph, limit: 4 });
  assert.equal(inspection.candidates.length, 2);
  assert.deepEqual(inspection.best.path, [start, a, target]);
  assert.deepEqual(inspection.alternatives[0].path, [start, target]);
  assert.equal(inspection.candidates.some((candidate) => candidate.path.includes(b)), false);
});
