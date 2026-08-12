import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc } from '../src/feedback-loop.js';
import { runCuspObservedFeedbackCycle } from '../src/cusp-feedback-observer.js';
import {
  ARCSWEEP_CUSP_BENCH_SCHEMA,
  buildCuspObserverBench,
  cuspPotential,
  sampleCuspFoldLocus,
} from '../src/cusp-observer-view.js';

const WORLD = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };

function feedbackInput() {
  return {
    world: WORLD,
    premaqc: createInitialPremaqc(WORLD.id, {}, '2026-08-12T15:10:00.000Z'),
    mode: 'writing',
    work: 'The observer records the control surface without naming an event into existence.',
    response: 'Receipt accepted.',
    voiceIds: ['lioreal'],
    observedAt: '2026-08-12T15:11:00.000Z',
  };
}

test('cusp potential implements the canonical quartic', () => {
  assert.equal(cuspPotential(2, -1, 0.5), 4 - 2 + 1);
  assert.equal(cuspPotential(0, -1, 0.5), 0);
});

test('sampled fold locus satisfies 4a^3 + 27b^2 = 0', () => {
  const locus = sampleCuspFoldLocus({ minimumStructure: -2, maximumStructure: 0, samples: 17 });
  for (const point of [...locus.upper, ...locus.lower]) {
    const residual = 4 * point.structure ** 3 + 27 * point.intention ** 2;
    assert.ok(Math.abs(residual) < 1e-10);
  }
});

test('bench exposes potential landscape, control plane, equilibria, and observational authority', async () => {
  const envelope = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: 0.1, orderParameter: 1 },
  });
  const bench = buildCuspObserverBench(envelope, { potentialSamples: 33, foldSamples: 21 });

  assert.equal(bench.schema, ARCSWEEP_CUSP_BENCH_SCHEMA);
  assert.equal(bench.world.id, WORLD.id);
  assert.equal(bench.potential_landscape.points.length, 33);
  assert.equal(bench.control_plane.fold_locus.upper.length, 21);
  assert.ok(bench.equilibria.length >= 1);
  assert.equal(bench.authority.controls_explicit_not_inferred, true);
  assert.equal(bench.authority.intention_is_premaqc_agency, false);
  assert.equal(bench.authority.candidate_is_asserted_event, false);
});

test('bench surfaces a branch-snap candidate only after the observer packet earns one', async () => {
  const first = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: -0.1, orderParameter: -1 },
  });
  const second = await runCuspObservedFeedbackCycle({
    ...feedbackInput(),
    cusp: { structure: -1, intention: 0.1, orderParameter: 1 },
    cuspHistory: [first.cusp_observation_packet],
  });
  const bench = buildCuspObserverBench(second);

  assert.equal(bench.event_candidate?.candidate_type, 'branch-snap');
  assert.equal(bench.event_candidate?.authority.event_asserted, false);
  assert.equal(bench.history.branch_changed, true);
});
