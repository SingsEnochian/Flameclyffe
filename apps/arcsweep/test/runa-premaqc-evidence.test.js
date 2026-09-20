import assert from 'node:assert/strict';
import test from 'node:test';

import { computeAqcVector } from '../src/earth-gate-aqc-vector.js';
import { computeBaseline65Aqc } from '../src/earth-gate-aqc-baseline65.js';
import { buildRunaPremaqcEvidence } from '../src/runa-premaqc-evidence.js';

const shared = Object.freeze({
  hrv_rmssd_ms: 90,
  hrv_reference_ms: 100,
  audio_frequency_hz: 432,
  target_audio_frequency_hz: 432,
  haptic_cadence_bpm: 60,
  target_haptic_cadence_bpm: 60,
  previous_haptic_cadence_bpm: 60,
  sample_interval_s: 2,
  heart_rate_bpm: 110,
  pre_rating: 3,
  post_rating: 5,
});

test('Runa vector becomes evidence, not a same-letter PREMAQC translation', () => {
  const runa = computeAqcVector(shared, { observedAt: '2026-09-20T07:00:00.000Z' });
  const evidence = buildRunaPremaqcEvidence(runa);

  assert.equal(evidence.target_vocabulary, 'PREMAQC');
  assert.equal(evidence.adapter_mode, 'evidence-only');
  assert.equal(evidence.evidence.P.status, 'proxy-evidence');
  assert.equal(evidence.evidence.R.status, 'proxy-evidence');
  assert.equal(evidence.evidence.C.status, 'derived-proxy-evidence');
  assert.equal(evidence.evidence.E.status, 'unasserted');
  assert.equal(evidence.evidence.M.status, 'unasserted');
  assert.equal(evidence.evidence.A.status, 'unasserted');
  assert.equal(evidence.semantic_guards.same_letter_translation_for_E_M_A, false);
});

test('canonical candidate values are stable for the divergence test vector', () => {
  const runa = computeAqcVector(shared);
  const evidence = buildRunaPremaqcEvidence(runa);

  assert.equal(evidence.evidence.P.normalized_value, 0.9);
  assert.equal(evidence.evidence.R.normalized_value, 1);
  assert.equal(evidence.evidence.C.normalized_value, 0.95);
  assert.equal(evidence.upstream_operational_evidence.emotional_delta, 0.75);
  assert.equal(evidence.upstream_operational_evidence.modulation, 0);
  assert.equal(evidence.upstream_operational_evidence.attunement, 0.545455);
  assert.equal(evidence.upstream_operational_evidence.AQC, 83.9091);
});

test('baseline-65 raw resonance is normalized before becoming R evidence', () => {
  const baseline = computeBaseline65Aqc({
    heart_rate_bpm: 110,
    hrv_rmssd_ms: 90,
    resonance: 4,
    emotional_delta: 5,
    modulation_velocity: 0,
  });
  const evidence = buildRunaPremaqcEvidence(baseline);

  assert.equal(baseline.vector.R, 4);
  assert.equal(evidence.evidence.R.normalized_value, 1);
  assert.equal(evidence.evidence.C.normalized_value, 0.875);
  assert.equal(evidence.upstream_operational_evidence.AQC, 75.75);
});

test('Q records report presence but never infers magnitude', () => {
  const runa = computeAqcVector(shared);
  const absent = buildRunaPremaqcEvidence(runa);
  const present = buildRunaPremaqcEvidence(runa, { qualiaReportPresent: true });

  assert.equal(absent.evidence.Q.report_present, false);
  assert.equal(present.evidence.Q.report_present, true);
  assert.equal(present.evidence.Q.inferred, false);
  assert.equal(present.evidence.Q.authority, 'firsthand-only');
});
