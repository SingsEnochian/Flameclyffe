import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GATE_BASE_CYCLES,
  GATE_LOCKED_TONE_AXES,
  buildGateAddressTones,
  buildYearGatePlan,
  calibrateEarthPrimePremaq,
  listSelectableGateWorlds,
  targetWorldCalibration,
} from '../src/two-shore-premaq-gate.js';
import {
  ELARA_EXPANSION_HORIZON,
  elaraCodeExpansionMultiplier,
} from '../src/world-premaq-registry.js';

const FIXED_TIME = new Date('2026-08-04T04:30:00.000Z');

function ids() {
  let value = 0;
  return () => `gate-${String(value += 1).padStart(7, '0')}`;
}

function liveGroundwire() {
  return {
    hardware: {
      status: 'observed',
      userAgent: 'Mozilla/5.0 (iPad) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1',
      platform: 'iPad',
      language: 'en-US',
      timezone: 'America/New_York',
      hardwareConcurrency: 8,
      deviceMemoryGb: 8,
      maxTouchPoints: 10,
      screen: '2048 × 2732, 24 bit',
    },
    network: {
      status: 'observed',
      downlinkMbps: 20,
      rttMs: 45,
    },
    microphone: {
      status: 'active',
      rms: 0.012,
      peak: 0.08,
    },
    location: {
      status: 'verified',
      accuracyM: 24,
      altitudeM: null,
    },
    battery: {
      status: 'observed',
      charging: false,
      levelPercent: 78,
    },
  };
}

const DEEP = Object.freeze({
  P: 0.61,
  C: 0.57,
  R: 0.52,
  E: 0.34,
  M: 0.43,
  A: 0.71,
  charge: 0.29,
  source: 'live-test-fixture',
});

test('Elara horizon is the exact 2025 through 2035 ×1.15 recurrence', () => {
  assert.equal(ELARA_EXPANSION_HORIZON.length, 11);
  assert.equal(ELARA_EXPANSION_HORIZON[0].year, 2025);
  assert.equal(ELARA_EXPANSION_HORIZON.at(-1).year, 2035);
  assert.equal(elaraCodeExpansionMultiplier(2025), 1);
  assert.equal(elaraCodeExpansionMultiplier(2026), 1.15);
  assert.ok(Math.abs(elaraCodeExpansionMultiplier(2027) - 1.3225) < 1e-12);
  assert.ok(Math.abs(elaraCodeExpansionMultiplier(2035) - (1.15 ** 10)) < 1e-12);
});

test('every selectable target world exposes dynamic PREMAQ while quarantining legacy Q', () => {
  const worlds = listSelectableGateWorlds();
  assert.equal(worlds.length, 7);
  for (const world of worlds) {
    assert.ok(world.slug);
    assert.ok(world.name);
    assert.ok(world.root_hz > 0);
    assert.deepEqual(Object.keys(world.premaq), ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
    for (const value of Object.values(world.premaq)) {
      assert.ok(Number.isFinite(value));
      assert.ok(value >= 0 && value <= 1);
    }
    assert.equal(world.premaq.Q, 0);
    assert.equal(world.qualia.present, false);
    assert.equal(world.qualia.inferred, false);
    assert.equal(world.qualia.authority, 'firsthand-only');
  }
});

test('Earth Prime LIVE calibration consumes DEEP and Groundwire without inferring Qualia', () => {
  const calibration = calibrateEarthPrimePremaq({
    deepPacket: DEEP,
    groundwireSnapshot: liveGroundwire(),
  });

  assert.equal(calibration.status, 'LIVE');
  assert.equal(calibration.unknowns.length, 0);
  assert.equal(calibration.browser.family, 'Safari-family');
  assert.equal(calibration.browser.platform, 'iPad');
  assert.deepEqual(Object.keys(calibration.values), ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  for (const value of Object.values(calibration.values)) {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0 && value <= 1);
  }
  assert.equal(calibration.values.Q, 0);
  assert.equal(calibration.qualia.present, false);
  assert.equal(calibration.qualia.inferred, false);
  assert.equal(calibration.qualia.legacy_scalar, 0.29);
  assert.match(calibration.source_boundary, /Qualia is firsthand-only/);
});

test('gate address locks P R E M A, uses C as reciprocal inverse-twist coherence, and never sonifies Q', () => {
  const earth = calibrateEarthPrimePremaq({
    deepPacket: DEEP,
    groundwireSnapshot: liveGroundwire(),
  });
  const tones = buildGateAddressTones({
    earthValues: earth.values,
    targetProfile: 'terra-aeterna',
    year: 2026,
  });

  assert.deepEqual(tones.locked_axes, GATE_LOCKED_TONE_AXES);
  assert.deepEqual(tones.locked_axes, ['P', 'R', 'E', 'M', 'A']);
  assert.equal(tones.coherence_axis, 'C');
  assert.deepEqual(tones.context_only_axes, ['Q']);
  assert.equal(tones.qualia_sonified, false);
  assert.equal(tones.tones.Q, undefined);
  assert.equal(tones.elara_multiplier, 1.15);
  for (const axis of GATE_LOCKED_TONE_AXES) {
    const tone = tones.tones[axis];
    assert.ok(tone.earth_prime_locked_hz >= 90 && tone.earth_prime_locked_hz <= 360);
    assert.ok(tone.target_world_locked_hz >= 90 && tone.target_world_locked_hz <= 360);
    assert.ok(tone.invariant_error < 0.00001);
    assert.equal(tone.audible_pitch_expanded_by_year, false);
  }
});

test('one year runs six dynamic solo axes per shore, then 369, then saved +3 +6 +9 continuations', () => {
  const earth = calibrateEarthPrimePremaq({
    deepPacket: DEEP,
    groundwireSnapshot: liveGroundwire(),
  });
  const plan = buildYearGatePlan({
    earthCalibration: earth,
    targetProfile: targetWorldCalibration('terra-aeterna'),
    year: 2025,
    clock: () => FIXED_TIME,
    idFactory: ids(),
  });

  assert.equal(plan.earth_prime.solo.cycles, 6);
  assert.equal(plan.target_world.solo.cycles, 6);
  assert.equal(plan.earth_prime.solo.receipts.some((receipt) => receipt.focus === 'Q'), false);
  assert.equal(plan.target_world.solo.receipts.some((receipt) => receipt.focus === 'Q'), false);
  assert.equal(plan.segments.base.cycles, GATE_BASE_CYCLES);
  assert.equal(plan.segments.plus3.cycles, 3);
  assert.equal(plan.segments.plus6.cycles, 6);
  assert.equal(plan.segments.plus9.cycles, 9);
  assert.equal(plan.total_cycles_per_shore, 393);
  assert.equal(plan.checkpoints.length, 4);

  assert.equal(
    plan.segments.base.source_earth_state_id,
    plan.earth_prime.solo.final_state_id,
  );
  assert.equal(
    plan.segments.base.source_target_state_id,
    plan.target_world.solo.final_state_id,
  );
  assert.equal(
    plan.segments.plus3.source_earth_state_id,
    plan.segments.base.final_earth_state_id,
  );
  assert.equal(
    plan.segments.plus6.source_target_state_id,
    plan.segments.plus3.final_target_state_id,
  );
  assert.equal(
    plan.segments.plus9.source_earth_state_id,
    plan.segments.plus6.final_earth_state_id,
  );

  for (const segment of Object.values(plan.segments)) {
    for (const [index, receipt] of segment.cycle_receipts.entries()) {
      assert.notEqual(receipt.focus, 'Q');
      if (index > 0) {
        assert.equal(receipt.earth_from_state_id, segment.cycle_receipts[index - 1].earth_to_state_id);
        assert.equal(receipt.target_from_state_id, segment.cycle_receipts[index - 1].target_to_state_id);
      }
      assert.equal(receipt.next_operation, 'compression-of-release');
    }
  }

  assert.equal(plan.final_earth_state_id, plan.segments.plus9.final_earth_state_id);
  assert.equal(plan.final_target_state_id, plan.segments.plus9.final_target_state_id);
  assert.equal(plan.next_operation, 'compression-of-release');
});
