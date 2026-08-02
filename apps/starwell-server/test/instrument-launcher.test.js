'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { validateMathPayload } = require('../electron/bifrost-launcher');

const observedAt = '2026-08-02T19:20:00.000Z';

function packet(mode = 'OBSERVED') {
  const premaq = { P: 0.89, C: 0.92, R: 0.88, E: 0.34, M: 0.76, A: 0.85, Q: 0.84 };
  const axes = Object.fromEntries(Object.entries(premaq).map(([axis, value]) => [axis, {
    value,
    provenance: {
      mode,
      source_id: 'observer:test',
      observed_at: observedAt,
      confidence: 1,
      receipt_id: `receipt-${axis}`,
    },
  }]));
  return {
    state: {
      schema: 'hearthgate.instrument-math-state/v1',
      basis_id: 'imath-test-basis',
      house_id: 'terra-aeterna',
      phase: 'gather',
      premaq,
      observation: { axes },
    },
    profile: {
      schema: 'hearthgate.instrument-profile/v1',
      provenance: {
        mode: 'CALIBRATED',
        source_id: 'rowan:hearthweave-runa-calibration',
        observed_at: observedAt,
        confidence: 1,
      },
      tones: {
        key_measured_hz: 144,
        key_felt_hz: 147.69,
        word_measured_hz: 222,
        word_felt_hz: 225.69,
        bind_hz: 333,
        punctuation_hz: 369,
      },
    },
  };
}

test('accepts a sourced observed packet for the strict PyTorch door', () => {
  const value = packet('OBSERVED');
  const safe = validateMathPayload(value);
  assert.deepEqual(safe, value);
  assert.notEqual(safe, value);
});

test('accepts explicit calibration while preserving its epistemic mode', () => {
  const safe = validateMathPayload(packet('CALIBRATED'));
  assert.equal(safe.state.observation.axes.P.provenance.mode, 'CALIBRATED');
});

test('rejects synthetic scaffolding before it reaches Python or PyTorch', () => {
  assert.throws(
    () => validateMathPayload(packet('SYNTHETIC')),
    /HEARTHGATE_LIVE_OBSERVATION_REQUIRED:P/,
  );
});

test('rejects an axis without provenance', () => {
  const value = packet();
  delete value.state.observation.axes.R.provenance.source_id;
  assert.throws(
    () => validateMathPayload(value),
    /HEARTHGATE_SOURCED_PREMAQ_AXIS_REQUIRED:R/,
  );
});

test('rejects out-of-range PREMAQ before writing a session packet', () => {
  const value = packet();
  value.state.premaq.E = 1.4;
  assert.throws(
    () => validateMathPayload(value),
    /HEARTHGATE_SOURCED_PREMAQ_AXIS_REQUIRED:E/,
  );
});
