import test from 'node:test';
import assert from 'node:assert/strict';

import { createTransformationRequest, assessTransformationResponse } from '../src/transformation-request.js';
import {
  ADMISSIBILITY_RESIDUAL_SCHEMA,
  createProjectionAdmissibilityResidual,
  createTransformationAdmissibilityResidual,
} from '../src/admissibility-residual.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
const world = { id: 'terra-aeterna', name: 'Terra Aeterna' };

function packet(id, sequence, values, observedAt) {
  return {
    id,
    receipt_id: `${id}-receipt`,
    sequence,
    observed_at: observedAt,
    state: Object.fromEntries(AXES.map((axis) => [axis, { value: values[axis] }])),
  };
}

const baselineValues = { P: .7, C: .6, R: .65, E: .3, M: .7, A: .75, Q: .72 };
const baseline = packet('premaqc-baseline', 10, baselineValues, '2026-08-20T03:40:00.000Z');

async function request() {
  return createTransformationRequest({
    world,
    baselinePremaqc: baseline,
    description: 'Increase coherence and resonance without collateral movement.',
    targetAxes: ['C', 'R'],
    direction: 'increase',
    minimumDelta: .03,
    intervention: { type: 'writing', strength: .4 },
    authority: 'Rowan',
    consent: true,
    maximumCycles: 3,
    requestedAt: '2026-08-20T03:41:00.000Z',
  });
}

test('target-aligned observed response sits inside request corridor without declaring fulfilment', async () => {
  const ask = await request();
  const responsePacket = packet('premaqc-response', 11, {
    ...baselineValues,
    C: .64,
    R: .69,
  }, '2026-08-20T03:42:00.000Z');
  const response = await assessTransformationResponse({ request: ask, responsePremaqc: responsePacket, observedAt: responsePacket.observed_at });
  const residual = await createTransformationAdmissibilityResidual({
    request: ask,
    response,
    generatedAt: '2026-08-20T03:43:00.000Z',
  });

  assert.equal(residual.schema, ADMISSIBILITY_RESIDUAL_SCHEMA);
  assert.equal(residual.mode, 'transformation-response');
  assert.equal(residual.classification, 'WITHIN_REQUEST_CORRIDOR');
  assert.equal(residual.residual.target_deficit_norm, 0);
  assert.equal(residual.residual.normal_residual_norm, 0);
  assert.equal(residual.residual.total_residual_norm, 0);
  assert.equal(residual.authority.zero_residual_is_fulfilment, false);
  assert.equal(residual.authority.within_request_corridor_is_fulfilment, false);
  assert.equal(residual.authority.observed_response_preserved_separately, true);
});

test('unrequested movement remains a collateral residual distinct from the measured response', async () => {
  const ask = await request();
  const responsePacket = packet('premaqc-collateral', 12, {
    ...baselineValues,
    C: .65,
    R: .70,
    P: .92,
  }, '2026-08-20T03:44:00.000Z');
  const response = await assessTransformationResponse({ request: ask, responsePremaqc: responsePacket, observedAt: responsePacket.observed_at });
  const residual = await createTransformationAdmissibilityResidual({ request: ask, response, normalTolerance: .18 });

  assert.equal(residual.classification, 'COLLATERAL_RESIDUAL');
  assert.ok(residual.residual.normal_residual_norm > 0);
  assert.equal(residual.projection.normal_residual.P, .22);
  assert.equal(response.measurement.deltas.P, .22);
  assert.equal(residual.authority.request_is_cause_proof, false);
});

test('safe React-ion projection state yields zero route-envelope residual but not fulfilment', async () => {
  const residual = await createProjectionAdmissibilityResidual({
    projectionState: {
      schema: 'reaction.projection-state/v1',
      state: 'CONTINUITY_SAFE',
      cusp_score: .2,
      continuity: .95,
      harmonic_mismatch: .1,
      thresholds: { cusp: .85, continuity: .8, harmonic: .35 },
    },
    generatedAt: '2026-08-20T03:45:00.000Z',
  });

  assert.equal(residual.classification, 'WITHIN_ROUTE_ENVELOPE');
  assert.equal(residual.residual.residual_norm, 0);
  assert.equal(residual.authority.route_admissibility_is_fulfilment, false);
  assert.equal(residual.authority.within_route_envelope_is_fulfilment, false);
  assert.equal(residual.authority.transport_ack_is_fulfilment, false);
});

test('unsafe React-ion projection reports cusp, continuity, and harmonic envelope deficits independently', async () => {
  const residual = await createProjectionAdmissibilityResidual({
    projectionState: {
      schema: 'reaction.projection-state/v1',
      state: 'CONTINUITY_UNSAFE',
      cusp_score: .95,
      continuity: .6,
      harmonic_mismatch: .5,
      thresholds: { cusp: .85, continuity: .8, harmonic: .35 },
    },
    generatedAt: '2026-08-20T03:46:00.000Z',
  });

  assert.equal(residual.classification, 'ROUTE_ENVELOPE_RESIDUAL');
  assert.equal(residual.residual.vector.cusp_excess, .1);
  assert.equal(residual.residual.vector.continuity_deficit, .2);
  assert.equal(residual.residual.vector.harmonic_excess, .15);
  assert.ok(residual.residual.residual_norm > 0);
  assert.equal(residual.authority.route_envelope_admission_is_observed_transformation, false);
});
