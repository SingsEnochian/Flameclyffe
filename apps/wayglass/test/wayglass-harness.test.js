import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveWayglassHarness,
  publicWayglassHarnesses,
  createHarnessSensitivityFingerprint,
} from '../../../lib/wayglass-harness.js';
import { createModelObservation } from '../../../lib/wayglass-model-observation.js';

const route = {
  route_id: 'local:test',
  provider: 'ollama',
  model: () => 'ornith-1.5:test',
  lineage: { kind: 'external-seed', native_wayglass: false },
};

function obs(harnessId, output, completionTokens) {
  return createModelObservation({
    route,
    result: {
      output,
      usage: { prompt_tokens: 100, completion_tokens: completionTokens },
    },
    payload: {
      harness: resolveWayglassHarness(harnessId),
      session_id: 'probe:test',
      surface_id: 'arcsweep:writing-room',
      interaction: { channel: 'OOC' },
    },
    completedAt: '2026-10-16T20:30:00.000Z',
    observationId: 'obs:' + harnessId,
  });
}

test('registered harnesses are non-authoritative provenance', () => {
  const harnesses = publicWayglassHarnesses();
  assert.equal(harnesses.length, 2);
  for (const harness of harnesses) {
    assert.equal(harness.authority.canon_commit, false);
    assert.equal(harness.authority.authority_grant, false);
  }
});

test('model observations carry harness attribution', () => {
  const observed = obs(
    'wayglass:writing-room/direct-v0.1',
    'Preserve the stop point and test the return boundary.',
    11,
  );
  assert.equal(observed.harness.schema, 'wayglass.harness-attestation/v0.1');
  assert.equal(observed.harness.harness_id, 'wayglass:writing-room/direct-v0.1');
});

test('fingerprint holds model constant and measures harness delta', () => {
  const left = obs(
    'wayglass:writing-room/direct-v0.1',
    'Preserve participant continuity. Then replay the stop receipt.',
    12,
  );
  const right = obs(
    'wayglass:writing-room/reflective-v0.1',
    'Preserve participant continuity and unresolved alternatives. Verify provenance, then replay the stop receipt.',
    19,
  );
  const result = createHarnessSensitivityFingerprint({
    experiment_id: 'experiment:harness-probe-001',
    task_id: 'task:continuity-review-001',
    left_observation: left,
    right_observation: right,
    measured_at: '2026-10-16T20:31:00.000Z',
  });
  assert.equal(result.schema, 'wayglass.harness-sensitivity/v0.1');
  assert.equal(result.controlled.same_model, true);
  assert.equal(result.delta.output_changed, true);
  assert.equal(result.delta.completion_token_delta, 7);
  assert.equal(result.authority.native_model_promotion, false);
});
