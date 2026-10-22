import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateBaseline65Attunement,
  computeBaseline65Aqc,
  processBaseline65Batch,
} from '../src/earth-gate-aqc-baseline65.js';

test('baseline-65 attunement is always bounded inside [0,1]', () => {
  for (const heartRate of [1, 30, 45, 65, 100, 200, 350, 500]) {
    for (const hrv of [0, 5, 20, 50, 85, 100, 250, 1000]) {
      const score = calculateBaseline65Attunement(heartRate, hrv);
      assert.ok(score >= 0 && score <= 1, `HR=${heartRate} HRV=${hrv} produced ${score}`);
    }
  }
});

test('baseline-65 formula exactly reproduces supplied centre case', () => {
  assert.equal(calculateBaseline65Attunement(65, 100), 1);
  assert.equal(calculateBaseline65Attunement(65, 50), 0.5);
});

test('distance from 65 lowers attunement for fixed HRV', () => {
  const centre = calculateBaseline65Attunement(65, 85);
  const near = calculateBaseline65Attunement(85, 85);
  const far = calculateBaseline65Attunement(165, 85);
  assert.ok(centre > near);
  assert.ok(near > far);
});

test('AQC uses supplied 25/45/30 weighting and stays bounded', () => {
  const receipt = computeBaseline65Aqc({
    heart_rate_bpm: 65,
    hrv_rmssd_ms: 85,
    resonance: 2.5,
    emotional_delta: 5,
    modulation_velocity: 0.02,
  }, { observedAt: '2026-09-20T07:30:00.000Z' });

  assert.equal(receipt.canonical_premaqc, false);
  assert.ok(receipt.evaluation.AQC >= 0 && receipt.evaluation.AQC <= 100);
  assert.equal(receipt.vector.E, 5);
  assert.equal(receipt.vector.M, 0.02);
});

test('batch runner isolates bad sessions instead of aborting good ones', () => {
  const batch = processBaseline65Batch([
    {
      id: 'stable',
      metrics: {
        heartRate: 65,
        hrv: 85,
        resonance: 2.5,
        emotionalDelta: 5,
        modulationVelocity: 0.02,
      },
    },
    {
      id: 'invalid',
      metrics: {
        heartRate: 0,
        hrv: 5,
        resonance: 0.1,
        emotionalDelta: 1,
        modulationVelocity: 0.95,
      },
    },
  ]);

  assert.equal(batch.processed, 1);
  assert.equal(batch.blocked, 1);
  assert.equal(batch.receipts[0].id, 'stable');
  assert.equal(batch.blocked_sessions[0].id, 'invalid');
  assert.match(batch.blocked_sessions[0].error.message, /heart_rate_bpm/);
});

test('structural bounds are not labelled as physiological safety claims', () => {
  assert.throws(
    () => computeBaseline65Aqc({
      heartRate: 501,
      hrv: 85,
      resonance: 2.5,
      emotionalDelta: 5,
      modulationVelocity: 0.02,
    }),
    /for this experiment/,
  );
});
