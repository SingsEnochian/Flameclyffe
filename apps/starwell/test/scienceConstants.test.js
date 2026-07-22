import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCIENCE_CONSTANTS,
  derivedScienceConstants,
  frequencyFromWavelengthHz,
  photonEnergyJ,
  planckScaleSummary,
  thermalEnergyJ,
  wavelengthFromFrequencyM,
} from '../src/lib/scienceConstants.js';

test('SI defining constants remain exact and pinned', () => {
  assert.equal(SCIENCE_CONSTANTS.h.value, 6.62607015e-34);
  assert.equal(SCIENCE_CONSTANTS.c.value, 299792458);
  assert.equal(SCIENCE_CONSTANTS.kB.value, 1.380649e-23);
  assert.equal(SCIENCE_CONSTANTS.h.exact, true);
  assert.equal(SCIENCE_CONSTANTS.c.exact, true);
  assert.equal(SCIENCE_CONSTANTS.kB.exact, true);
  assert.equal(SCIENCE_CONSTANTS.G.exact, false);
});

test('frequency, wavelength, photon energy, and thermal energy conversions are reciprocal and finite', () => {
  const frequency = 20.1e6;
  const wavelength = wavelengthFromFrequencyM(frequency);
  assert.ok(Math.abs(frequencyFromWavelengthHz(wavelength) - frequency) / frequency < 1e-12);
  assert.equal(photonEnergyJ(frequency), SCIENCE_CONSTANTS.h.value * frequency);
  assert.equal(thermalEnergyJ(300), SCIENCE_CONSTANTS.kB.value * 300);
});

test('derived Planck quantities use standard positive formulas', () => {
  assert.ok(derivedScienceConstants.hbar > 0);
  assert.ok(derivedScienceConstants.planckLength > 0);
  assert.ok(derivedScienceConstants.planckTime > 0);
  assert.ok(derivedScienceConstants.planckMass > 0);
  assert.ok(derivedScienceConstants.planckTemperature > 0);

  const summary = planckScaleSummary();
  assert.match(summary.planckLengthM, /^1\.6162/);
  assert.match(summary.planckTimeS, /^5\.3912/);
  assert.match(summary.planckMassKg, /^2\.1764/);
  assert.match(summary.planckTemperatureK, /^1\.4167/);
});

test('conversion helpers reject invalid physical inputs', () => {
  assert.throws(() => wavelengthFromFrequencyM(0), /positive finite number/);
  assert.throws(() => frequencyFromWavelengthHz(-1), /positive finite number/);
  assert.throws(() => photonEnergyJ(-1), /non-negative finite number/);
  assert.throws(() => thermalEnergyJ(-1), /non-negative finite number/);
});
