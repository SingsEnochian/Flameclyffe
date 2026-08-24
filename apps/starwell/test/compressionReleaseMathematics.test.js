import test from 'node:test';
import assert from 'node:assert/strict';

import { premaqToTemporalState } from '../src/arcsweep-temporal-quantum/engine.js';
import {
  advanceWorldCompressionRelease,
  compressRelease,
  mapCompressionReleaseFrequencies,
  temporalCompressionDriver,
} from '../src/arcsweep-temporal-quantum/compression-release.js';

const FIXED_TIME = new Date('2026-08-03T18:58:00.000Z');

function clock() {
  return new Date(FIXED_TIME);
}

function idFactory() {
  return 'test-id';
}

function premaqPacket() {
  const state = {};
  const values = { P: 0.72, C: 0.81, R: 0.67, E: 0.31, M: 0.76, A: 0.84 };
  for (const [axis, value] of Object.entries(values)) {
    state[axis] = {
      value,
      derivative: axis === 'P' ? 0.12 : axis === 'R' ? 0.06 : 0.02,
      uncertainty: 0.08,
      confidence: 0.86,
      contributors: [],
    };
  }
  state.Q = {
    value: 1,
    derivative: 0,
    uncertainty: 0,
    confidence: 1,
    contributors: [{ source_id: 'qualia-test', source_kind: 'firsthand-qualia-report' }],
    semantics: 'firsthand-report-presence-bit',
  };
  return {
    schema_version: '2.0.0',
    id: 'premaq-test',
    observed_at: FIXED_TIME.toISOString(),
    registry_version: 'premaq-registry/2.0',
    state,
    qualia: {
      schema: 'premaqc.qualia-report/v1',
      present: true,
      authority: 'firsthand-only',
      inferred: false,
      report_receipt_id: 'qualia-test',
      observed_at: FIXED_TIME.toISOString(),
      report: { text: 'A firsthand test report.' },
    },
    receipt_id: 'premaq-receipt-test',
    sequence: 1,
    prior_state_ref: null,
    model_version: 'test-model/1',
    provenance_refs: ['firsthand-qualia:qualia-test'],
    generated_at: FIXED_TIME.toISOString(),
    degraded: false,
  };
}

function initialState() {
  return premaqToTemporalState(premaqPacket(), { clock, idFactory });
}

function sumProbabilities(state) {
  return Object.values(state.probabilities).reduce((sum, value) => sum + value, 0);
}

test('Qualia travels as context and never enters the temporal probability basis', () => {
  const state = initialState();
  assert.deepEqual(state.basis, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.equal(Object.prototype.hasOwnProperty.call(state.probabilities, 'Q'), false);
  assert.equal(state.qualia.present, true);
  assert.equal(state.interpretation.qualia_dynamic, false);
});

test('compression preserves support and release becomes the next state', () => {
  const prior = initialState();
  const released = compressRelease(prior, {
    focus: 'R',
    compressionStrength: 0.8,
    compressionGain: 1.2,
    releaseFraction: 0.35,
    clock,
    idFactory,
  });

  assert.equal(released.compression_release.source_state_id, prior.state_id);
  assert.equal(released.compression_release.released_state_id, released.state_id);
  assert.equal(released.compression_release.next_operation, 'compression-of-release');
  assert.equal(released.compression_release.qualia_dynamic, false);
  assert.ok(Math.abs(sumProbabilities(released) - 1) < 1e-10);
  assert.ok(released.spiral.radius >= prior.spiral.radius);

  for (const axis of Object.keys(prior.probabilities)) {
    if (prior.probabilities[axis] > 0) {
      assert.ok(released.compression_release.compressed_probabilities[axis] > 0);
    }
  }
});

test('compression refuses Qualia as a dynamical focus', () => {
  assert.throws(() => compressRelease(initialState(), { focus: 'Q', clock, idFactory }), /Unknown compression focus/);
});

test('the next compression consumes the previous release', () => {
  const first = compressRelease(initialState(), {
    compressionStrength: 0.65,
    clock,
    idFactory,
  });
  const second = compressRelease(first, {
    compressionStrength: 0.55,
    clock,
    idFactory,
  });

  const receipt = second.receipts.at(-1);
  assert.equal(receipt.from_state_id, first.state_id);
  assert.equal(receipt.to_state_id, second.state_id);
  assert.equal(second.spiral.cycle, first.spiral.cycle + 1);
  assert.ok(second.spiral.radius >= first.spiral.radius);
});

test('temporal compression driver is zero while the fold latch is inactive', () => {
  const driver = temporalCompressionDriver(initialState(), {
    foldIndex: 0.95,
    foldActive: false,
    enterThreshold: 0.82,
  });
  assert.equal(driver.compression_strength, 0);
  assert.equal(driver.qualia_dynamic, false);
});

test('compression and release tones obey the reciprocal invariant', () => {
  const pair = mapCompressionReleaseFrequencies(220, 0.75, 5);
  assert.ok(Math.abs(pair.reciprocal_product - 220 ** 2) < 1e-7);
  assert.equal(pair.compression_hz > pair.root_hz, true);
  assert.equal(pair.release_hz < pair.root_hz, true);
});

test('world transition combines temporal evolution, dynamic Jacobian fold and tone sequence', () => {
  const nearlySingular = [
    [1, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1e-10, 0],
    [0, 0, 0, 0, 0, 0, 1],
  ];
  const transition = advanceWorldCompressionRelease({
    state: initialState(),
    jacobian: nearlySingular,
    worldProfile: {
      worldId: 'terra-aeterna',
      focusAxis: 'R',
      enterThreshold: 0.82,
      releaseThreshold: 0.68,
      compressionGain: 1,
      releaseFraction: 0.35,
      derivativeRelease: 0.08,
      memoryRelease: 0.04,
      phaseReleaseGain: Math.PI / 4,
      radialGain: 0.5,
      entropyGain: 0.1,
      angularGain: Math.PI / 3,
      temporalWeights: { fold: 0.55, derivative: 0.20, entropy: 0.15, phase: 0.10 },
      tone: {
        worldId: 'terra-aeterna',
        toneLayerId: 'hearthlight-root',
        rootHz: 220,
        excursion: 5,
        approvalState: 'pending',
        approvalReceiptId: null,
      },
    },
    clock,
    idFactory,
  });

  assert.equal(transition.fold.active, true);
  assert.ok(transition.temporal_driver.compression_strength > 0);
  assert.equal(transition.tone_sequence.sequence[1].role, 'compression');
  assert.equal(transition.tone_sequence.sequence[2].role, 'release');
  assert.equal(transition.tone_sequence.sequence[3].role, 'next-compression');
  assert.equal(transition.tone_sequence.render_authority, 'pending-human-calibration');
  assert.equal(transition.authority.qualia_dynamic, false);
});
