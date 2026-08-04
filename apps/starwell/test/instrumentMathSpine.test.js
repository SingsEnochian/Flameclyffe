import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EPISTEMIC_MODES,
  applyTension,
  compress,
  createInstrumentState,
  release,
  standingWavePlan,
  supplantWithObservation,
} from '../src/instrument-hall/math-spine.js';

const observedAt = '2026-08-02T18:42:00.000Z';

function source(mode, sourceId) {
  return {
    mode,
    source_id: sourceId,
    observed_at: observedAt,
    confidence: 0.92,
    receipt_id: `${sourceId}-receipt`,
  };
}

function premaq() {
  return {
    P: 0.82,
    C: 0.88,
    R: 0.79,
    E: 0.22,
    M: 0.76,
    A: 0.84,
    Q: 0.81,
  };
}

function calibration(mode = EPISTEMIC_MODES.CALIBRATED) {
  return {
    provenance: source(mode, 'instrument-calibration'),
    tension_limit: { value: 0.74 },
  };
}

function activeState() {
  return createInstrumentState({
    premaq: premaq(),
    observation: source(EPISTEMIC_MODES.OBSERVED, 'deep-live'),
    calibration: calibration(),
    houseId: 'terra-aeterna',
  });
}

function datum(value, label, mode = EPISTEMIC_MODES.OBSERVED) {
  return {
    value,
    provenance: source(mode, label),
  };
}

test('unsourced values cannot become an Instrument Hall state', () => {
  assert.throws(
    () => createInstrumentState({ premaq: premaq(), calibration: calibration() }),
    /HEARTHGATE_EPISTEMIC_MODE_REQUIRED/,
  );
});

test('synthetic scaffolding remains visibly inactive', () => {
  const state = createInstrumentState({
    premaq: premaq(),
    observation: source(EPISTEMIC_MODES.SYNTHETIC, 'fixture'),
    calibration: calibration(EPISTEMIC_MODES.SYNTHETIC),
  });

  assert.equal(state.active, false);
  assert.equal(state.phase, 'scaffold');
  assert.throws(
    () => applyTension(state, datum(0.1, 'keypress')),
    /HEARTHGATE_LIVE_OBSERVATION_REQUIRED/,
  );
});

test('compress is maximum poised tension without loss of either shore', () => {
  const state = activeState();
  const poised = compress(state);

  assert.equal(poised.phase, 'compress');
  assert.equal(poised.poised, true);
  assert.equal(poised.tension, poised.tension_limit);
  assert.deepEqual(poised.shores, { measured: true, felt: true });
  assert.equal(poised.history.at(-1).destructive, false);
  assert.equal(poised.history.at(-1).information_loss, false);
});

test('only sourced active data may apply tension and drive release', () => {
  const gathered = applyTension(activeState(), datum(0.2, 'typing-tone-keypress'));
  assert.equal(gathered.tension, 0.2);

  assert.throws(
    () => applyTension(gathered, datum(0.1, 'synthetic-keypress', EPISTEMIC_MODES.SYNTHETIC)),
    /HEARTHGATE_SYNTHETIC_CANNOT_DRIVE_ACTIVE_STATE/,
  );

  const poised = compress(gathered);
  const released = release(poised, {
    shape: 'sentence-cadence',
    delta_radius: datum(0.31, 'observed-release-radius'),
    residual_tension: datum(0.04, 'observed-release-residual'),
  });

  assert.equal(released.phase, 'release');
  assert.equal(released.radius, 0.31);
  assert.equal(released.tension, 0.04);
  assert.equal(released.cycle, 1);
});

test('standing-wave plans contain sourced frequencies rather than invented defaults', () => {
  const state = activeState();
  const plan = standingWavePlan(state, {
    provenance: source(EPISTEMIC_MODES.CALIBRATED, 'runa-house-calibration'),
    anchor_hz: { value: 144 },
    living_hz: { value: 216 },
    bind_hz: { value: 176.364 },
    pulse_hz: { value: 5.5 },
    gain_ceiling: { value: 0.08 },
  });

  assert.deepEqual(plan.frequencies_hz, {
    anchor: 144,
    living: 216,
    bind: 176.364,
  });
  assert.equal(plan.provenance.frequencies.anchor.provenance.source_id, 'runa-house-calibration');
});

test('real observation explicitly supplants synthetic scaffolding', () => {
  const scaffold = createInstrumentState({
    premaq: premaq(),
    observation: source(EPISTEMIC_MODES.SYNTHETIC, 'fixture'),
    calibration: calibration(EPISTEMIC_MODES.SYNTHETIC),
  });
  const observed = supplantWithObservation(scaffold, {
    premaq: premaq(),
    observation: source(EPISTEMIC_MODES.OBSERVED, 'deep-live'),
    calibration: calibration(),
  });

  assert.equal(observed.active, true);
  assert.equal(observed.phase, 'gather');
  assert.equal(observed.history.at(-1).kind, 'scaffolding-supplanted');
  assert.equal(observed.history.at(-1).prior_basis_id, scaffold.basis_id);
});
