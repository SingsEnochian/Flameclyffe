import assert from 'node:assert/strict';
import test from 'node:test';

import { computeAqcVector } from '../src/earth-gate-aqc-vector.js';
import { computeBaseline65Aqc } from '../src/earth-gate-aqc-baseline65.js';
import {
  buildRealtimeSensorEvidenceFrame,
  buildRunaPremaqcEvidence,
} from '../src/runa-premaqc-evidence.js';

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

test('realtime sensor evidence accepts normalized P/R candidates but does not auto-normalize raw values', () => {
  const frame = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'presence_grounding',
      source_id: 'sensor-hrv-adapter',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 90,
      unit: 'ms',
      normalized_value: 0.9,
      confidence: 0.8,
    },
    {
      metric: 'resonance_lock',
      source_id: 'runa-lock-controller',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 1,
      unit: 'ratio',
      normalized_value: 1,
      confidence: 0.9,
    },
    {
      metric: 'heart_rate_bpm',
      source_id: 'sensor-heart-rate',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 110,
      unit: 'bpm',
      confidence: 0.9,
    },
  ], { frameId: 'synthetic-001' });

  assert.equal(frame.candidates.P.normalized_value, 0.9);
  assert.equal(frame.candidates.R.normalized_value, 1);
  assert.equal(frame.candidates.E.status, 'unasserted');
  assert.equal(frame.candidates.M.status, 'unasserted');
  assert.equal(frame.candidates.A.status, 'unasserted');
  assert.equal(frame.semantic_guards.raw_sensor_value_auto_normalization_allowed, false);
});

test('Agency requires explicit user-control authority and cannot be inferred from physiology', () => {
  const physiological = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'agency_score',
      source_id: 'sensor-heart-rate',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 0.9,
      normalized_value: 0.9,
      confidence: 0.9,
      authority: 'instrument',
    },
  ]);
  const explicit = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'agency_score',
      source_id: 'user-control-receipt',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 0.9,
      normalized_value: 0.9,
      confidence: 1,
      authority: 'explicit-user-control',
    },
  ]);

  assert.equal(physiological.candidates.A.status, 'unasserted');
  assert.equal(explicit.candidates.A.status, 'proxy-evidence');
  assert.equal(explicit.candidates.A.normalized_value, 0.9);
});

test('Q context requires firsthand authority and never exposes magnitude', () => {
  const instrument = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'qualia_report_present',
      source_id: 'instrument',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: true,
      confidence: 1,
      authority: 'instrument',
    },
  ]);
  const firsthand = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'qualia_report_present',
      source_id: 'firsthand-report',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: true,
      confidence: 1,
      authority: 'firsthand',
    },
  ]);

  assert.equal(instrument.candidates.Q.report_present, false);
  assert.equal(firsthand.candidates.Q.report_present, true);
  assert.equal(firsthand.candidates.Q.inferred, false);
  assert.equal(Object.hasOwn(firsthand.candidates.Q, 'normalized_value'), false);
});

test('realtime sensor evidence can be attached to a Runa PREMAQC evidence receipt without committing canon', () => {
  const runa = computeAqcVector(shared);
  const sensorFrame = buildRealtimeSensorEvidenceFrame([
    {
      metric: 'presence_grounding',
      source_id: 'sensor-hrv-adapter',
      observed_at: '2026-09-20T07:00:00.000Z',
      raw_value: 90,
      normalized_value: 0.9,
      confidence: 0.8,
    },
  ]);
  const evidence = buildRunaPremaqcEvidence(runa, { realtimeSensorEvidence: sensorFrame });

  assert.equal(evidence.realtime_sensor_evidence.schema, 'hearthgate.runa-realtime-sensor-evidence/v1');
  assert.equal(evidence.canonical_commit, false);
  assert.equal(evidence.semantic_guards.realtime_sensor_frame_is_evidence_not_commit, true);
});
