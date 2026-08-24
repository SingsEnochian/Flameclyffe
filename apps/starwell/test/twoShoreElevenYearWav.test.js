import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CYCLES_PER_SHORE_PER_YEAR,
  ELEVEN_YEAR_WAV_SCHEMA,
  TOTAL_CYCLES_PER_SHORE,
  buildCompleteElevenYearSequence,
  compactElevenYearReceipt,
  renderCompleteElevenYearWav,
} from '../src/two-shore-eleven-year-wav.js';
import {
  BOX_GEOMETRIC_SOURCE,
  REQUIRED_GEOMETRIC_FORMS,
} from '../src/two-shore-geometric-forms.js';

const earthCalibration = Object.freeze({
  schema: 'hearthgate.earth-prime-premaq-calibration/v0.2',
  shore_id: 'earth-prime',
  status: 'LIVE',
  physical_claim: false,
  observed_at: '2026-08-04T05:00:00.000Z',
  values: Object.freeze({
    P: 0.61,
    C: 0.57,
    R: 0.54,
    E: 0.33,
    M: 0.49,
    A: 0.72,
    Q: 0,
  }),
  qualia: Object.freeze({
    schema: 'premaqc.qualia-report/v1',
    present: false,
    authority: 'firsthand-only',
    inferred: false,
    report_receipt_id: null,
    observed_at: null,
    report: null,
    legacy_scalar: 0.41,
  }),
  coverage: 1,
  unknowns: Object.freeze([]),
  browser: Object.freeze({
    family: 'Safari-family',
    platform: 'iPad',
    language: 'en-US',
    timezone: 'America/New_York',
    touch_points: 5,
    screen: '1024x1366@24',
  }),
  groundwire: Object.freeze({
    hardware_status: 'observed',
    network_status: 'observed',
    microphone_status: 'active',
    location_status: 'verified',
    battery_status: 'observed',
  }),
  formula: Object.freeze({}),
  source_boundary: 'Test fixture standing in for browser-provided DEEP and Groundwire receipts; Qualia remains firsthand-only.',
});

function ascii(bytes) {
  return Buffer.from(bytes).toString('utf8');
}

test('every year from 2025 through 2035 completes both PREMAQ shores and all geometric forms', () => {
  let id = 0;
  const sequence = buildCompleteElevenYearSequence({
    earthCalibration,
    targetProfile: 'terra-aeterna',
    clock: () => new Date('2026-08-04T05:00:00.000Z'),
    idFactory: () => String(++id).padStart(8, '0'),
    timing: {
      soloSeconds: 0.005,
      baseCycleSeconds: 0.001,
      extensionCycleSeconds: 0.0015,
      yearGapSeconds: 0.002,
    },
  });

  assert.equal(sequence.schema, ELEVEN_YEAR_WAV_SCHEMA);
  assert.equal(sequence.complete, true);
  assert.equal(sequence.years.length, 11);
  assert.deepEqual(sequence.years.map((year) => year.year), [
    2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035,
  ]);
  assert.equal(CYCLES_PER_SHORE_PER_YEAR, 393);
  assert.equal(TOTAL_CYCLES_PER_SHORE, 4323);
  assert.equal(sequence.total_cycles_per_shore, 4323);
  assert.equal(sequence.audio_plan.cycles_per_shore, 4323);
  assert.equal(sequence.audio_plan.event_count, 4389);
  assert.equal(sequence.audio_plan.cues.length, 11);
  assert.deepEqual(sequence.audio_plan.dynamic_axes, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.deepEqual(sequence.audio_plan.context_only_axes, ['Q']);
  assert.equal(sequence.audio_plan.qualia_sonified, false);
  assert.equal(sequence.audio_plan.events.some((event) => event.axis === 'Q'), false);
  assert.equal(sequence.audio_plan.audible_elara_code_layer, true);
  assert.equal(sequence.audio_plan.locked_carrier_preserved, true);
  assert.equal(sequence.geometric_source.commit, BOX_GEOMETRIC_SOURCE.commit);

  sequence.years.forEach((year, index) => {
    assert.equal(year.complete, true);
    assert.equal(year.premaq_generation.earth_prime.generated_for_year, year.year);
    assert.equal(year.premaq_generation.target_world.generated_for_year, year.year);
    assert.equal(year.premaq_generation.earth_prime.values.Q, 0);
    assert.equal(year.premaq_generation.earth_prime.qualia.inferred, false);
    assert.equal(year.cycle_contract.solo_cycles_per_shore, 6);
    assert.deepEqual(year.cycle_contract.solo_axes, ['P', 'C', 'R', 'E', 'M', 'A']);
    assert.deepEqual(year.cycle_contract.context_only_axes, ['Q']);
    assert.equal(year.cycle_contract.total_cycles_per_shore, 393);
    assert.equal(year.compression_release_spine.qualia_dynamic, false);
    assert.equal(year.compression_release_spine.lineage_verified, true);
    assert.equal(year.geometric_state.earth_prime.status, 'VERIFIED');
    assert.equal(year.geometric_state.target_world.status, 'VERIFIED');
    assert.deepEqual(year.geometric_state.earth_prime.required_forms, REQUIRED_GEOMETRIC_FORMS);
    assert.deepEqual(year.geometric_state.target_world.required_forms, REQUIRED_GEOMETRIC_FORMS);

    for (const shore of ['earth_prime', 'target_world']) {
      const geometry = year.geometric_state[shore];
      assert.equal(geometry.forms.dodecahedron.vertex_count, 20);
      assert.equal(geometry.forms.dodecahedron.edge_count, 30);
      assert.equal(geometry.forms.tesseract.vertex_count, 16);
      assert.equal(geometry.forms.tesseract.edge_count, 32);
      assert.equal(geometry.forms.penteract.vertex_count, 32);
      assert.equal(geometry.forms.penteract.edge_count, 80);
      assert.equal(geometry.forms.poincare_ball.inside_unit_ball, true);
      assert.equal(geometry.forms.projective_quintic.finite, true);
    }

    assert.ok(Math.abs(year.elara_multiplier - (1.15 ** index)) < 1e-12);
    if (index > 0) {
      const previous = sequence.years[index - 1];
      assert.equal(
        year.mathematical_state.earth_prime.start_state_id,
        previous.final_earth_state_id,
      );
      assert.equal(
        year.mathematical_state.target_world.start_state_id,
        previous.final_target_state_id,
      );
    }
  });
});

test('all eleven completed years render to a stereo WAV with eleven labeled cue points and no Qualia tone', () => {
  let id = 100000;
  const sequence = buildCompleteElevenYearSequence({
    earthCalibration,
    targetProfile: 'terra-aeterna',
    clock: () => new Date('2026-08-04T05:00:00.000Z'),
    idFactory: () => String(++id),
    timing: {
      soloSeconds: 0.004,
      baseCycleSeconds: 0.0008,
      extensionCycleSeconds: 0.001,
      yearGapSeconds: 0.001,
    },
  });
  const wav = renderCompleteElevenYearWav(sequence, { sampleRate: 8000 });
  const text = ascii(wav.bytes);

  assert.equal(ascii(wav.bytes.slice(0, 4)), 'RIFF');
  assert.equal(ascii(wav.bytes.slice(8, 12)), 'WAVE');
  assert.match(text, /cue /);
  assert.match(text, /2025/);
  assert.match(text, /2035/);
  assert.match(text, /Earth Prime/);
  assert.match(text, /Qualia remains firsthand context and is not sonified/);
  assert.equal(wav.complete, true);
  assert.equal(wav.channels, 2);
  assert.equal(wav.bits_per_sample, 16);
  assert.equal(wav.sample_rate, 8000);
  assert.equal(wav.cue_count, 11);
  assert.equal(wav.qualia_sonified, false);
  assert.ok(wav.byte_length > 44);
  assert.ok(wav.sample_count > 0);

  const receipt = compactElevenYearReceipt(sequence, wav);
  assert.equal(receipt.complete, true);
  assert.equal(receipt.years.length, 11);
  assert.equal(receipt.cycles_per_shore, 4323);
  assert.deepEqual(receipt.context_only_axes, ['Q']);
  assert.equal(receipt.qualia_sonified, false);
  assert.equal(receipt.wav.cue_count, 11);
  assert.ok(receipt.years.every((year) => year.earth_geometry_fingerprint.length === 8));
  assert.ok(receipt.years.every((year) => year.target_geometry_fingerprint.length === 8));
});
