import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalJson,
  processEarthGateTelemetry,
  projectEarthGateReceipt,
  sha256Hex,
} from '../src/earth-gate-telemetry.js';

test('RA-90 remains bounded across synthetic HRV stress range', async () => {
  for (const hrv of [0, 5, 20, 40, 62.4, 80, 120, 180, 250]) {
    const receipt = await processEarthGateTelemetry('RA-90', {
      hrv_rmssd_ms: hrv,
      hrv_reference_ms: 100,
      audio_frequency_hz: 432,
      target_audio_frequency_hz: 432,
      haptic_cadence_bpm: 60,
      target_haptic_cadence_bpm: 60,
      user_rating: 5,
    }, { observedAt: '2026-09-20T06:30:00.000Z' });

    for (const key of ['presence_grounding', 'audio_lock', 'haptic_lock', 'resonance_lock', 'coherence_index', 'adaptive_quality']) {
      assert.equal(Number.isFinite(receipt.metrics[key]), true, `${key} must be finite for HRV ${hrv}`);
      assert.ok(receipt.metrics[key] >= 0 && receipt.metrics[key] <= 1, `${key} must stay inside [0,1]`);
    }
  }
});

test('RA-90 rewards actual frequency/cadence lock instead of raw frequency magnitude', async () => {
  const aligned = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 62.4,
    audio_frequency_hz: 432,
    target_audio_frequency_hz: 432,
    haptic_cadence_bpm: 60,
    target_haptic_cadence_bpm: 60,
  });
  const far = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 62.4,
    audio_frequency_hz: 864,
    target_audio_frequency_hz: 432,
    haptic_cadence_bpm: 120,
    target_haptic_cadence_bpm: 60,
  });

  assert.ok(aligned.metrics.resonance_lock > far.metrics.resonance_lock);
  assert.ok(aligned.metrics.coherence_index > far.metrics.coherence_index);
});

test('operational adaptive quality does not become a fake PREMAQC AQC axis', async () => {
  const receipt = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 50,
    audio_frequency_hz: 432,
    haptic_cadence_bpm: 60,
    user_rating: 4,
  });

  assert.equal(typeof receipt.metrics.adaptive_quality, 'number');
  assert.deepEqual(Object.keys(receipt.premaqc_bearing.axes), ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.equal('AQC' in receipt.premaqc_bearing.axes, false);
});

test('PREMAQC semantics remain canonical and unsupported axes stay unasserted', async () => {
  const receipt = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 50,
    audio_frequency_hz: 432,
    haptic_cadence_bpm: 60,
    user_rating: 5,
  });

  assert.equal(receipt.premaqc_bearing.axes.E.status, 'unasserted');
  assert.equal(receipt.premaqc_bearing.axes.M.status, 'unasserted');
  assert.equal(receipt.premaqc_bearing.axes.A.status, 'unasserted');
  assert.equal(receipt.premaqc_bearing.axes.Q.status, 'context-only');
  assert.equal(receipt.premaqc_bearing.axes.Q.value, 0);
  assert.equal(receipt.premaqc_bearing.axes.Q.inferred, false);
});

test('Q becomes present only from explicit firsthand-report presence', async () => {
  const receipt = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 50,
    audio_frequency_hz: 432,
    haptic_cadence_bpm: 60,
    user_rating: 5,
    qualia_report_present: true,
  });
  assert.equal(receipt.premaqc_bearing.axes.Q.value, 1);
  assert.equal(receipt.premaqc_bearing.axes.Q.inferred, false);
});

test('Temporal Anchoring Rod produces stable SHA-256 checkpoint receipts', async () => {
  const payload = {
    world_id: 'EARTH_GATE_01',
    session_id: 'RUNA_SESSION_ACTIVE',
    frame_index: 2048,
    observed_at: '2026-09-20T06:30:00.000Z',
    state_ref: 'state:alpha',
  };
  const one = await processEarthGateTelemetry('Temporal Anchoring Rod', payload);
  const two = await processEarthGateTelemetry('Temporal Anchoring Rod', payload);

  assert.equal(one.metrics.digest_algorithm, 'SHA-256');
  assert.equal(one.metrics.checkpoint_digest.length, 64);
  assert.equal(one.metrics.checkpoint_digest, two.metrics.checkpoint_digest);
  assert.equal(one.metrics.reconstruction_fidelity, null);
  assert.equal(one.metrics.replay_verification, 'not-yet-replayed');
});

test('canonical JSON and SHA-256 are ordering-stable', async () => {
  const a = { z: 3, a: { y: 2, x: 1 } };
  const b = { a: { x: 1, y: 2 }, z: 3 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(await sha256Hex(a), await sha256Hex(b));
});

test('Chrono-Spatial Matrix Grid preserves the two prototype thresholds', async () => {
  const excellent = await processEarthGateTelemetry('Chrono-Spatial Matrix Grid', { observed_drift: 0.0049, frame_index: 1 });
  const degraded = await processEarthGateTelemetry('Chrono-Spatial Matrix Grid', { observed_drift: 0.005, frame_index: 2 });
  const topology = await processEarthGateTelemetry('Chrono-Spatial Matrix Grid', { observed_drift: 0.01, frame_index: 3 });

  assert.equal(excellent.metrics.continuity_band, 'EXCELLENT');
  assert.equal(excellent.metrics.topology_changes_detected, false);
  assert.equal(degraded.metrics.continuity_band, 'DEGRADED');
  assert.equal(degraded.metrics.topology_changes_detected, false);
  assert.equal(topology.metrics.continuity_band, 'TOPOLOGY_CHANGE');
  assert.equal(topology.metrics.topology_changes_detected, true);
});

test('receipts project to bounded/traceable Hearthgate matrix coordinates', async () => {
  const ra = await processEarthGateTelemetry('RA-90', {
    hrv_rmssd_ms: 62.4,
    audio_frequency_hz: 432.1,
    target_audio_frequency_hz: 432,
    haptic_cadence_bpm: 65,
    target_haptic_cadence_bpm: 60,
    user_rating: 5,
  });
  const projected = projectEarthGateReceipt(ra);
  assert.equal(projected.length, 3);
  assert.ok(projected.every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
});
