import test from 'node:test';
import assert from 'node:assert/strict';

import {
  modelAuditionAvailability,
  modelAuditionRunPlan,
} from '../../starwell/bifrost/model-audition-state.js';

test('candidate-only mode remains runnable when local Qwythos is offline', () => {
  const availability = modelAuditionAvailability({
    baseline: { configured: false, missing: ['HEARTHGATE_GATEWAY_REACHABLE'] },
    candidate: { configured: true, audition_route: true, execution_path: 'web-direct', missing: [] },
  });
  assert.equal(availability.baseline_ready, false);
  assert.equal(availability.candidate_ready, true);
  assert.equal(availability.run_enabled, true);
  assert.equal(availability.mode, 'candidate-only');
  assert.deepEqual(modelAuditionRunPlan(availability), {
    run_baseline: false,
    run_candidate: true,
    mode: 'candidate-only',
  });
});

test('dual-route mode runs both models when both shores are ready', () => {
  const availability = modelAuditionAvailability({
    baseline: { configured: true },
    candidate: { configured: true, audition_route: true },
  });
  assert.equal(availability.mode, 'dual-route');
  assert.equal(availability.run_enabled, true);
  assert.deepEqual(modelAuditionRunPlan(availability), {
    run_baseline: true,
    run_candidate: true,
    mode: 'dual-route',
  });
});

test('candidate configuration remains the minimum runnable requirement', () => {
  const availability = modelAuditionAvailability({
    baseline: { configured: true },
    candidate: { configured: false, audition_route: true, missing: ['HF_TOKEN'] },
  });
  assert.equal(availability.mode, 'blocked');
  assert.equal(availability.run_enabled, false);
  assert.deepEqual(availability.candidate_missing, ['HF_TOKEN']);
  assert.deepEqual(modelAuditionRunPlan(availability), {
    run_baseline: false,
    run_candidate: false,
    mode: 'blocked',
  });
});
