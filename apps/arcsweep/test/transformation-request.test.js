import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc } from '../src/feedback-loop.js';
import { assessTransformationResponse, createTransformationRequest } from '../src/transformation-request.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna' };
const baseline = createInitialPremaqc(world.id, { P: .7, C: .62, R: .68, E: .32, M: .7, A: .74, Q: .72 }, '2026-08-12T15:00:00.000Z');

async function request(overrides = {}) {
  return createTransformationRequest({
    world, baselinePremaqc: baseline,
    description: 'Ask the writing chamber to strengthen coherence and resonance.',
    targetAxes: ['C', 'R'], direction: 'increase', minimumDelta: .03,
    intervention: { type: 'soundscape-and-writing', strength: .4 },
    authority: 'Rowan', consent: true, maximumCycles: 3,
    stopConditions: ['Feather', 'Q decline', 'E spike'],
    requestedAt: '2026-08-12T15:01:00.000Z', ...overrides,
  });
}

function response(values, sequence = 2) {
  const packet = createInitialPremaqc(world.id, values, '2026-08-12T15:05:00.000Z');
  return { ...packet, id: `response-${sequence}`, receipt_id: `response-receipt-${sequence}`, sequence };
}

test('an admitted Ask is a bounded control receipt, never an observed success', async () => {
  const receipt = await request();
  assert.equal(receipt.gate.admitted, true);
  assert.equal(receipt.request.status, 'requested-not-observed');
  assert.equal(receipt.authority.request_is_success, false);
  assert.equal(receipt.authority.may_rewrite_premaqc, false);
  assert.equal(receipt.intervention.control_input.C, .4);
  assert.equal(receipt.intervention.control_input.R, .4);
  assert.equal(receipt.intervention.control_input.E, 0);
  assert.ok(receipt.bounds.stop_conditions.includes('Feather'));
});

test('the intervention gate refuses missing consent, authority, bounds, and observability', async () => {
  await assert.rejects(() => request({ consent: false }), /consent/);
  await assert.rejects(() => request({ authority: '' }), /authority/);
  await assert.rejects(() => request({ maximumCycles: 0 }), /boundedness/);
  await assert.rejects(() => request({ targetAxes: [] }), /target axis/);
});

test('response measurement reports susceptibility and resonant target attainment', async () => {
  const receipt = await request();
  const observed = response({ P: .71, C: .67, R: .72, E: .34, M: .7, A: .75, Q: .73 });
  const assessment = await assessTransformationResponse({ request: receipt, responsePremaqc: observed, cycleCount: 1, observedAt: '2026-08-12T15:05:00.000Z' });
  assert.equal(assessment.classification.status, 'target-observed');
  assert.equal(assessment.classification.coupling, 'resonant-coupling');
  assert.equal(assessment.measurement.susceptibility.C, .125);
  assert.equal(assessment.measurement.susceptibility.R, .1);
  assert.equal(assessment.authority.success_declared_by_request, false);
});

test('unbounded collateral movement stops the intervention rather than calling it success', async () => {
  const receipt = await request();
  const observed = response({ P: .3, C: .68, R: .73, E: .6, M: .7, A: .74, Q: .72 });
  const assessment = await assessTransformationResponse({ request: receipt, responsePremaqc: observed, cycleCount: 1 });
  assert.equal(assessment.classification.status, 'stop');
  assert.equal(assessment.classification.coupling, 'runaway-coupling');
  assert.equal(assessment.classification.stop_triggered, true);
  assert.ok(assessment.measurement.collateral_axes.includes('P'));
});

test('a bounded window can complete without manufacturing an outcome', async () => {
  const receipt = await request();
  const observed = response({ P: .7, C: .62, R: .68, E: .31, M: .7, A: .74, Q: .72 }, 4);
  const assessment = await assessTransformationResponse({ request: receipt, responsePremaqc: observed, cycleCount: 3 });
  assert.equal(assessment.classification.status, 'bounded-window-complete');
  assert.equal(assessment.classification.coupling, 'no-observed-response');
});
