import assert from 'node:assert/strict';
import test from 'node:test';
import { compileNavigationRequest } from '../src/react-ion-engine.js';
import { inspectProjectionRoutes } from '../src/react-ion-route-inspector.js';
import {
  compileReactionRegistry,
  createDestinationRegistration,
} from '../src/react-ion-registry.js';

const edge = (to) => ({
  to,
  projection_distance: 0.1,
  jacobian_risk: 0.05,
  harmonic_mismatch: 0.05,
  continuity_risk: 0.05,
});

async function destination({ id, name, aliases = [], address, worldId }) {
  return createDestinationRegistration({
    id,
    name,
    aliases,
    kind: 'world',
    worldId,
    worldName: name,
    address,
    rootHz: 220,
    profileVersion: 'hardening-test',
    evidenceClass: 'symbolic',
    sourceRef: 'hardening-test',
    state: 'approved',
    updatedAt: '2026-08-13T05:15:00.000Z',
  });
}

test('alternate-route inspection stops at a hard exploration bound even without completed candidates', async () => {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '9.9.9.9@528',
    intention: 'Do not wander forever',
    requestedAt: '2026-08-13T05:16:00.000Z',
  });
  const a = '0002.0002.0002.0002@220';
  const b = '0003.0003.0003.0003@220';
  const c = '0004.0004.0004.0004@220';
  const d = '0005.0005.0005.0005@220';
  const e = '0006.0006.0006.0006@220';
  const graph = {
    [request.source]: [edge(a), edge(b), edge(c)],
    [a]: [edge(d), edge(e)],
    [b]: [edge(d), edge(e)],
    [c]: [edge(d), edge(e)],
    [d]: [],
    [e]: [],
  };

  const inspection = await inspectProjectionRoutes({
    request,
    graph,
    maximumHops: 6,
    maximumExploredStates: 3,
  });

  assert.equal(inspection.truncated, true);
  assert.equal(inspection.explored_states, 3);
  assert.equal(inspection.exploration_limit, 3);
  assert.equal(inspection.candidates.length, 0);
});

test('one conflicting approved DNS registration is quarantined without erasing healthy destinations', async () => {
  const alpha = await destination({
    id: 'dest-alpha',
    name: 'alpha',
    aliases: ['shared-name'],
    address: '1.1.1.1@220',
    worldId: 'world-alpha',
  });
  const conflict = await destination({
    id: 'dest-conflict',
    name: 'beta',
    aliases: ['shared-name'],
    address: '2.2.2.2@220',
    worldId: 'world-beta',
  });
  const gamma = await destination({
    id: 'dest-gamma',
    name: 'gamma',
    aliases: ['gamma-alt'],
    address: '3.3.3.3@220',
    worldId: 'world-gamma',
  });

  const runtime = compileReactionRegistry({
    destinations: [alpha, conflict, gamma],
    corridors: [],
  });

  assert.equal(runtime.destinations.length, 2);
  assert.equal(runtime.registry.resolve('alpha').endpoint.world.id, 'world-alpha');
  assert.equal(runtime.registry.resolve('shared-name').endpoint.world.id, 'world-alpha');
  assert.equal(runtime.registry.resolve('gamma-alt').endpoint.world.id, 'world-gamma');
  assert.equal(runtime.registry.resolve('beta'), null);
  const diagnostic = runtime.diagnostics.find((item) => item.kind === 'destination-name-conflict');
  assert.equal(diagnostic.registration_id, 'dest-conflict');
  assert.deepEqual(diagnostic.conflicting_names, ['shared-name']);
  assert.deepEqual(diagnostic.conflicts_with, ['dest-alpha']);
});
