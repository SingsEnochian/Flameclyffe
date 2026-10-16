import test from 'node:test';
import assert from 'node:assert/strict';

import {
  operatorDescriptor,
  inspectThoughtVibrationReceipt,
  thoughtVibrationReceiptRef,
  normalizeThoughtVibrationDomainReceipts,
} from '../../../lib/wayglass-thought-vibration.js';
import {
  synthesizeSession,
  validateSession,
  SAMPLE_RATE_HZ,
  RENDERER_ID,
} from '../../../lib/wayglass-thought-vibration-renderer.mjs';
import {
  avoidedCrossing,
  densityFromBloch,
  measureZ,
  evolveBloch,
} from '../../../lib/wayglass-thought-vibration-quantum.mjs';
import { createWayglassDeparture } from '../../../lib/wayglass-stop-receipt.js';
import {
  synthesizeSession as portableSynthesizeSession,
} from '../../../skills/thought-vibration-ai-v2/src/reference-renderer.mjs';
import {
  avoidedCrossing as portableAvoidedCrossing,
} from '../../../skills/thought-vibration-ai-v2/src/quantum-model.mjs';

function stereoSession(overrides = {}) {
  return {
    schema: 'thought-vibration.session/v1',
    session_id: 'tv_test_stereo',
    mode: 'combined-experiment',
    claim_domain: 'OBSERVATION-TRUE',
    source_id: 'wayglass:test',
    render_intent_confirmed: true,
    audio: {
      kind: 'separate-ear-stereo',
      duration_seconds: 0.25,
      sample_rate_hz: 48000,
      gain_linear: 0.05,
      fade_seconds: 0.02,
      left_hz: 432,
      right_hz: 437.5,
      phase_offset_deg: 0,
    },
    output: {
      kind: 'offline-diagnostic-wav',
      playback: false,
    },
    mythic: {
      channel_state: 'open',
      interpretation: 'Authored threshold cue only.',
    },
    stop_point: 'Offline proof rendered.',
    next_owner: 'Wayglass-Mobius-Engineer',
    unresolved_questions: ['How does the real endpoint translate the render?'],
    ...overrides,
  };
}

test('Thought Vibration operator is bounded and non-authoritative', () => {
  const descriptor = operatorDescriptor();
  assert.equal(descriptor.schema, 'wayglass.specialist-operator/thought-vibration-v2');
  assert.equal(descriptor.version, '2.0.0');
  assert.equal(descriptor.governing_math, 'hearthgate.math-spine/v1.8');
  assert.equal(descriptor.authority.canon_commit, false);
  assert.equal(descriptor.authority.identity_commit, false);
  assert.equal(descriptor.authority.device_activation, false);
  assert.ok(descriptor.modes.includes('combined-experiment'));
});

test('offline renderer is deterministic and does not request playback', () => {
  const session = stereoSession();
  validateSession(session);
  const first = synthesizeSession(session);
  const second = synthesizeSession(session);

  assert.ok(first.wav.equals(second.wav));
  assert.deepEqual(first.receipt, second.receipt);
  assert.equal(first.receipt.renderer_id, RENDERER_ID);
  assert.equal(first.receipt.format.sample_rate_hz, SAMPLE_RATE_HZ);
  assert.equal(first.receipt.format.channels, 2);
  assert.equal(first.receipt.measurements.integrated_lufs, null);
  assert.equal(first.receipt.measurements.true_peak_dbtp, null);
  assert.equal(first.receipt.claims.at(-1).domain, 'SYMBOLIC');
});

test('renderer distinguishes stereo difference tones from deliberate mono AM', () => {
  const mono = stereoSession({
    session_id: 'tv_test_mono',
    mode: 'acoustic-engineering',
    audio: {
      kind: 'mono-am',
      duration_seconds: 0.25,
      sample_rate_hz: 48000,
      gain_linear: 0.05,
      fade_seconds: 0.02,
      carrier_hz: 432,
      modulation_hz: 5.5,
      modulation_depth: 1,
    },
    mythic: undefined,
  });
  const rendered = synthesizeSession(mono);
  assert.equal(rendered.receipt.format.channels, 1);
  assert.equal(rendered.receipt.measurements.stereo_correlation, null);

  assert.throws(() => validateSession({
    ...stereoSession(),
    audio: {
      ...stereoSession().audio,
      carrier_hz: 432,
    },
  }), /unsupported audio\.carrier_hz/);
});

test('renderer rejects autoplay, missing explicit intent and fake quantum fields', () => {
  const base = stereoSession();
  assert.throws(() => validateSession({
    ...base,
    render_intent_confirmed: false,
  }), /explicit intent/);
  assert.throws(() => validateSession({
    ...base,
    output: { kind: 'offline-diagnostic-wav', playback: true },
  }), /must not request playback/);
  assert.throws(() => validateSession({
    ...base,
    quantum_state: 'entangled',
  }), /unsupported session\.quantum_state/);
});

test('Thought Vibration receipt is inspectable and hashes to a stable provenance ref', () => {
  const { receipt } = synthesizeSession(stereoSession());
  const inspection = inspectThoughtVibrationReceipt(receipt);
  assert.equal(inspection.status, 'accepted-for-provenance');
  assert.equal(inspection.receipt_valid, true);
  assert.equal(inspection.grants_authority, false);

  const left = thoughtVibrationReceiptRef(receipt);
  const right = thoughtVibrationReceiptRef(receipt);
  assert.equal(left, right);
  assert.match(left, /^thought-vibration\.receipt\/v1:sha256:[a-f0-9]{64}$/);
});

test('specialist receipt survives Wayglass stop and continuation without gaining authority', () => {
  const { receipt } = synthesizeSession(stereoSession());
  const domainReceipts = normalizeThoughtVibrationDomainReceipts([receipt]);

  const departure = createWayglassDeparture({
    receipt_id: 'stop:tv-test',
    packet_id: 'packet:tv-test',
    world_id: 'wayglass:thought-vibration-test',
    participant_id: 'rowan:tv-test',
    stopped_at: '2026-10-16T21:00:00.000Z',
    identity_declarations: [
      { entity_id: 'rowan:tv-test', declaration: 'self-declared participant' },
    ],
    provenance_refs: [
      'receipt:tv-test-session',
      domainReceipts[0].receipt_ref,
    ],
    stop_point: 'Thought Vibration proof complete.',
    next_owner: 'rarity:tv-test',
    domain_receipts: domainReceipts,
  });

  assert.equal(departure.integrity.integrity_verified, true);
  assert.equal(departure.continuation_packet.domain_receipts.length, 1);
  assert.equal(departure.continuation_packet.domain_receipts[0].operator_id, 'thought-vibration-ai');
  assert.equal(departure.continuation_packet.domain_receipts[0].authority.canon_commit, false);
  assert.equal(departure.continuation_packet.authority.canon_commit, false);
});

test('quantum reference is real math but remains SYMBOLIC model output', () => {
  const crossing = avoidedCrossing(0, 2);
  assert.equal(crossing.domain, 'SYMBOLIC');
  assert.equal(crossing.gap, 4);

  const rho = densityFromBloch({ x: 0.3, y: 0.4, z: 0.5 });
  assert.equal(rho.trace, 1);
  assert.ok(rho.purity >= 0.5 && rho.purity <= 1);

  const measurement = measureZ({ x: 1, y: 0, z: 0 });
  assert.equal(measurement.outcomes[0].probability, 0.5);
  assert.equal(measurement.outcomes[1].probability, 0.5);

  const evolved = evolveBloch({ x: 0, y: 0, z: 1 }, {
    lambda: 0,
    g: 1,
    time: Math.PI / 4,
  });
  assert.ok(Math.abs(evolved.y + 1) < 1e-10);
  assert.ok(Math.abs(evolved.z) < 1e-10);
});

test('quantum reference rejects mythic labels as physical state', () => {
  assert.throws(() => measureZ({ channel_state: 'collapsed' }), /Bloch vector/);
  assert.throws(() => evolveBloch({ x: 0, y: 0, z: 2 }, {
    lambda: 1,
    g: 1,
    time: 1,
  }), /outside unit ball/);
});


test('Wayglass renderer stays byte-for-byte compatible with the preserved v2 source fixture', () => {
  const session = stereoSession();
  const integrated = synthesizeSession(session);
  const portable = portableSynthesizeSession(session);

  assert.ok(integrated.wav.equals(portable.wav));
  assert.deepEqual(integrated.receipt, portable.receipt);
});

test('Wayglass quantum reference stays compatible with the preserved v2 source fixture', () => {
  assert.deepEqual(
    avoidedCrossing(1.25, 0.75),
    portableAvoidedCrossing(1.25, 0.75),
  );
});


test('receipt inspection rejects unsupported production meter claims and invalid measurements', () => {
  const { receipt } = synthesizeSession(stereoSession());

  const fakeMeter = {
    ...receipt,
    measurements: {
      ...receipt.measurements,
      integrated_lufs: -14,
    },
  };
  const meterInspection = inspectThoughtVibrationReceipt(fakeMeter);
  assert.equal(meterInspection.receipt_valid, false);
  assert.ok(meterInspection.blocking.includes('unsupported-integrated-lufs'));

  const badPeak = {
    ...receipt,
    measurements: {
      ...receipt.measurements,
      sample_peak: [1.5, 0.02],
    },
  };
  const peakInspection = inspectThoughtVibrationReceipt(badPeak);
  assert.equal(peakInspection.receipt_valid, false);
  assert.ok(peakInspection.blocking.includes('invalid-measurement-sample_peak'));
});
