import assert from 'node:assert/strict';
import test from 'node:test';

import { processEarthGateTelemetry } from '../src/earth-gate-telemetry.js';
import {
  AqcVectorValidationError,
  computeAqcVector,
  projectAqcVectorReceipt,
} from '../src/earth-gate-aqc-vector.js';

const sharedPacket = Object.freeze({
  hrv_rmssd_ms: 62.4,
  hrv_reference_ms: 100,
  ibi_stability: 0.92,
  audio_frequency_hz: 432.1,
  target_audio_frequency_hz: 432,
  haptic_cadence_bpm: 65,
  target_haptic_cadence_bpm: 60,
  previous_haptic_cadence_bpm: 64,
  sample_interval_s: 2,
  heart_rate_bpm: 65,
  attunement_ratio: 1,
  pre_rating: 3,
  post_rating: 5,
  user_rating: 5,
  agency_score: 0.8,
});

test('canonical and alternate lanes can ingest the same telemetry packet', async () => {
  const canonical = await processEarthGateTelemetry('RA-90', sharedPacket, {
    observedAt: '2026-09-20T07:00:00.000Z',
  });
  const alternate = computeAqcVector(sharedPacket, {
    observedAt: '2026-09-20T07:00:00.000Z',
  });

  assert.equal(canonical.schema, 'hearthgate.earth-gate-telemetry/v1');
  assert.equal(alternate.schema, 'hearthgate.earth-gate-aqc-vector/v0.1');
  assert.equal(alternate.canonical_premaqc, false);
  assert.deepEqual(Object.keys(canonical.premaqc_bearing.axes), ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.deepEqual(Object.keys(alternate.vector), ['P', 'R', 'E', 'M', 'A']);
});

test('AQC stays outside the alternate vector', () => {
  const receipt = computeAqcVector(sharedPacket);
  assert.equal(Object.hasOwn(receipt.vector, 'AQC'), false);
  assert.equal(typeof receipt.evaluation.AQC, 'number');
  assert.equal(receipt.evaluation.formula, '100 * mean(P, R, E, 1-M, A)');
});

test('attunement reaches 1 when haptic cadence matches addressed biological cadence', () => {
  const receipt = computeAqcVector(sharedPacket);
  assert.equal(receipt.vector.A, 1);
  assert.equal(receipt.diagnostics.biological_target_cadence_bpm, 65);
});

test('emotional delta is explicitly derived from pre/post firsthand ratings', () => {
  const positive = computeAqcVector({ ...sharedPacket, pre_rating: 1, post_rating: 5 });
  const neutral = computeAqcVector({ ...sharedPacket, pre_rating: 3, post_rating: 3 });
  const negative = computeAqcVector({ ...sharedPacket, pre_rating: 5, post_rating: 1 });
  assert.equal(positive.vector.E, 1);
  assert.equal(neutral.vector.E, 0.5);
  assert.equal(negative.vector.E, 0);
});

test('modulation axis records speed while AQC evaluates its complement', () => {
  const slow = computeAqcVector({ ...sharedPacket, previous_haptic_cadence_bpm: 65 });
  const fast = computeAqcVector({ ...sharedPacket, previous_haptic_cadence_bpm: 47 });
  assert.ok(slow.vector.M < fast.vector.M);
  assert.ok(slow.diagnostics.modulation_quality > fast.diagnostics.modulation_quality);
});

test('schema errors are explicit and typed', () => {
  assert.throws(
    () => computeAqcVector({ heart_rate_bpm: 65 }),
    (error) => error instanceof AqcVectorValidationError
      && error.code === 'EARTH_GATE_AQC_VECTOR_INVALID'
      && error.issues.length > 1,
  );
});

test('alternate projection remains finite and bounded', () => {
  const projected = projectAqcVectorReceipt(computeAqcVector(sharedPacket));
  assert.equal(projected.length, 3);
  assert.ok(projected.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
});
