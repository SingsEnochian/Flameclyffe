import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMISSIBILITY_RESIDUAL_SCHEMA } from '../src/admissibility-residual.js';
import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { createTransformationRequest } from '../src/transformation-request.js';
import {
  REQUESTED_TRANSFORMATION_CIRCUIT_SCHEMA,
  runRequestedTransformationCircuit,
} from '../src/requested-transformation-circuit.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };
const baseline = createInitialPremaqc(world.id, { P: .7, C: .62, R: .68, E: .32, M: .7, A: .74, Q: .72 }, '2026-08-12T15:00:00.000Z');

async function request(direction = 'increase') {
  return createTransformationRequest({
    world, baselinePremaqc: baseline,
    description: 'Ask the chamber to strengthen coherence and resonance.',
    targetAxes: ['C', 'R'], direction, minimumDelta: .01,
    intervention: { type: 'writing', strength: .4 },
    authority: 'Rowan', consent: true, maximumCycles: 3,
    stopConditions: ['Feather'], requestedAt: '2026-08-12T15:01:00.000Z',
  });
}

async function feedback() {
  return runFeedbackCycle({
    world, premaqc: baseline, mode: 'writing',
    work: 'The chamber receives the bounded Ask and the branch answers in its own time.',
    response: 'Lioreal witnesses a change without declaring its cause.',
    voiceIds: ['lioreal'], observedAt: '2026-08-12T15:05:00.000Z',
  });
}

function deepTimeRecord(id, lambda, values, quality = .9) {
  const state = Object.fromEntries(['P', 'C', 'R', 'E', 'M', 'A', 'Q'].map((axis) => [axis, { value: values[axis] }]));
  return {
    dataset_kind: 'deep_time',
    world_id: world.id,
    sequence_id: `arcsweep:${world.id}:accepted-feedback`,
    lambda,
    id,
    record_fingerprint: id.padEnd(64, '0').slice(0, 64),
    premaqc: { state },
    quality: { data_quality: quality },
  };
}

test('Ask control is twined to cusp observation, later PREMAQC response, and a separate admissibility residual', async () => {
  const ask = await request();
  const cycle = await feedback();
  const receipt = await runRequestedTransformationCircuit({
    request: ask, feedbackCycle: cycle, structure: -1, orderParameter: .2,
  });

  assert.equal(receipt.schema, REQUESTED_TRANSFORMATION_CIRCUIT_SCHEMA);
  assert.equal(receipt.control.cusp_intention_b, .4);
  assert.equal(receipt.cusp.observation_packet.input.intention, .4);
  assert.equal(receipt.cusp.observation_packet.input.structure, -1);
  assert.equal(receipt.measured_response.response.receipt_id, cycle.premaqc_after.receipt_id);
  assert.equal(receipt.admissibility_residual.schema, ADMISSIBILITY_RESIDUAL_SCHEMA);
  assert.equal(receipt.admissibility_residual.mode, 'transformation-response');
  assert.equal(receipt.admissibility_residual.source.response_id, receipt.measured_response.response_id);
  assert.equal(receipt.admissibility_residual.authority.zero_residual_is_fulfilment, false);
  assert.equal(receipt.authority.admissibility_projection_is_observed_transformation, false);
  assert.equal(receipt.authority.admissibility_within_corridor_is_fulfilment, false);
  assert.equal(receipt.authority.ask_is_control_not_observation, true);
  assert.equal(receipt.authority.success_declared_by_request, false);
  assert.equal(receipt.authority.intention_is_premaqc_agency, false);
});

test('decrease Ask carries negative cusp intention without rewriting Agency', async () => {
  const ask = await request('decrease');
  const cycle = await feedback();
  const receipt = await runRequestedTransformationCircuit({ request: ask, feedbackCycle: cycle, structure: -1, orderParameter: -.2 });
  assert.equal(receipt.control.cusp_intention_b, -.4);
  assert.equal(receipt.cusp.observation_packet.input.intention, -.4);
  assert.equal(receipt.feedback.response_premaqc_receipt_id, cycle.premaqc_after.receipt_id);
});

test('accepted DEEPTime trajectory becomes Ash before provisional cusp history', async () => {
  const ask = await request();
  const cycle = await feedback();
  const deepTimeRecords = [
    deepTimeRecord('deep-time-1', 1, { P: .70, C: .62, R: .68, E: .32, M: .70, A: .74, Q: .72 }),
    deepTimeRecord('deep-time-2', 2, { P: .72, C: .67, R: .74, E: .30, M: .73, A: .75, Q: .76 }),
    deepTimeRecord('deep-time-3', 3, { P: .74, C: .70, R: .77, E: .28, M: .76, A: .77, Q: .79 }),
  ];
  const receipt = await runRequestedTransformationCircuit({
    request: ask,
    feedbackCycle: cycle,
    structure: -1,
    orderParameter: .2,
    deepTimeRecords,
    cuspHistory: [],
  });
  assert.equal(receipt.bai.ash_source, 'accepted-deep-time');
  assert.deepEqual(receipt.bai.ash_source_receipt_ids, ['deep-time-2', 'deep-time-3']);
  assert.equal(receipt.bai.state.ash.receipt_count, 2);
  assert.ok(receipt.bai.state.ash.magnitude > 0);
  assert.equal(receipt.authority.accepted_deep_time_preferred_for_ash, true);
});

test('the circuit refuses cross-world and unreceipted substitutes', async () => {
  const ask = await request();
  const cycle = await feedback();
  await assert.rejects(() => runRequestedTransformationCircuit({
    request: ask, feedbackCycle: { ...cycle, world: { id: 'luna', name: 'Luna' } }, structure: -1, orderParameter: 0,
  }), /share a world/);
  await assert.rejects(() => runRequestedTransformationCircuit({
    request: ask, feedbackCycle: { schema: 'not-a-cycle' }, structure: -1, orderParameter: 0,
  }), /receipted feedback cycle/);
});
