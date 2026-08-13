import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chooseProjectionRoute,
  classifyProjectionState,
  compileNavigationRequest,
  edgeProjectionCost,
} from '../src/react-ion-engine.js';

test('weights continuity and Jacobian risk more heavily than ordinary projection distance', () => {
  const safer = edgeProjectionCost({
    projection_distance: 0.6,
    jacobian_risk: 0.05,
    harmonic_mismatch: 0.1,
    continuity_risk: 0.02,
  });
  const dangerous = edgeProjectionCost({
    projection_distance: 0.1,
    jacobian_risk: 0.6,
    harmonic_mismatch: 0.05,
    continuity_risk: 0.5,
  });
  assert.ok(safer < dangerous);
});

test('classifies a nearly singular navigation Jacobian as cusp-nearby', () => {
  const state = classifyProjectionState({
    sigmaMin: 0.01,
    sigmaMax: 1,
    continuity: 0.95,
    harmonicMismatch: 0.1,
  });
  assert.equal(state.state, 'CUSP_NEARBY');
  assert.ok(state.cusp_score > 0.9);
});

test('puts continuity failure ahead of all other navigation states', () => {
  const state = classifyProjectionState({
    sigmaMin: 0.8,
    sigmaMax: 1,
    continuity: 0.4,
    harmonicMismatch: 0.05,
  });
  assert.equal(state.state, 'CONTINUITY_UNSAFE');
});

test('compiles a navigation request into compact and E8x32 representations', async () => {
  const request = await compileNavigationRequest({
    source: '1.2.3.4@220',
    target: '137.42.219.88@7.835769:φ=1.724',
    intention: 'Render the Templehouse frame while preserving continuity',
    requestedAt: '2026-08-13T04:30:00.000Z',
  });
  assert.equal(request.source, '0001.0002.0003.0004@220');
  assert.equal(request.target, '0137.0042.0219.0088@7.835769:φ=1.724');
  assert.equal(request.source_lattice.dimensions, 256);
  assert.equal(request.target_lattice.blocks.length, 32);
  assert.equal(request.authority.physical_multiverse_travel_claimed, false);
});

test('routes around a cheap-looking edge when its continuity and cusp costs are worse', async () => {
  const request = await compileNavigationRequest({
    source: '1.1.1.1@220',
    target: '4.4.4.4@528',
    intention: 'Find the safest available projection path',
    requestedAt: '2026-08-13T04:30:00.000Z',
  });
  const start = request.source;
  const target = request.target;
  const middleA = '0002.0002.0002.0002@330';
  const middleB = '0003.0003.0003.0003@440';
  const graph = {
    [start]: [
      {
        to: target,
        projection_distance: 0.1,
        jacobian_risk: 0.9,
        harmonic_mismatch: 0.1,
        continuity_risk: 0.8,
      },
      {
        to: middleA,
        projection_distance: 0.25,
        jacobian_risk: 0.05,
        harmonic_mismatch: 0.1,
        continuity_risk: 0.05,
      },
    ],
    [middleA]: [
      {
        to: middleB,
        projection_distance: 0.2,
        jacobian_risk: 0.05,
        harmonic_mismatch: 0.1,
        continuity_risk: 0.05,
      },
    ],
    [middleB]: [
      {
        to: target,
        projection_distance: 0.2,
        jacobian_risk: 0.05,
        harmonic_mismatch: 0.1,
        continuity_risk: 0.05,
      },
    ],
  };

  const route = await chooseProjectionRoute({ request, graph });
  assert.deepEqual(route.path, [start, middleA, middleB, target]);
  assert.equal(route.hop_count, 3);
});
