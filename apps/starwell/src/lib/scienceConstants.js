// Flameclyffe / STARWELL science constants
// Baseline: SI defining constants and CODATA-style Planck unit formulas.
// Use established constants for instrumentation; label speculative mappings elsewhere.

export const SCIENCE_CONSTANTS = Object.freeze({
  h: {
    slug: 'planck_constant_h',
    name: 'Planck constant',
    symbol: 'h',
    value: 6.62607015e-34,
    unit: 'J s',
    exact: true,
    formula: 'E = h * frequencyHz',
    status: 'established_science',
    use: 'Photon energy, frequency-to-energy conversion, quantum action baseline.'
  },
  c: {
    slug: 'speed_of_light_c',
    name: 'Speed of light in vacuum',
    symbol: 'c',
    value: 299792458,
    unit: 'm s^-1',
    exact: true,
    formula: 'wavelengthM * frequencyHz = c',
    status: 'established_science',
    use: 'Wavelength-frequency conversion, relativity scaling, causal horizon visualisations.'
  },
  kB: {
    slug: 'boltzmann_constant_kb',
    name: 'Boltzmann constant',
    symbol: 'k_B',
    value: 1.380649e-23,
    unit: 'J K^-1',
    exact: true,
    formula: 'thermalEnergyJ = k_B * temperatureK',
    status: 'established_science',
    use: 'Temperature-energy conversion, thermal noise, entropy mapping.'
  },
  G: {
    slug: 'newtonian_gravitational_constant_G',
    name: 'Newtonian gravitational constant',
    symbol: 'G',
    value: 6.67430e-11,
    unit: 'm^3 kg^-1 s^-2',
    exact: false,
    formula: 'F = G * m1 * m2 / r^2',
    status: 'established_science',
    use: 'Gravity scaling, Planck units, cosmological toy models.'
  }
});

export const derivedScienceConstants = Object.freeze({
  hbar: SCIENCE_CONSTANTS.h.value / (2 * Math.PI),
  planckLength: Math.sqrt((SCIENCE_CONSTANTS.h.value / (2 * Math.PI)) * SCIENCE_CONSTANTS.G.value / SCIENCE_CONSTANTS.c.value ** 3),
  planckTime: Math.sqrt((SCIENCE_CONSTANTS.h.value / (2 * Math.PI)) * SCIENCE_CONSTANTS.G.value / SCIENCE_CONSTANTS.c.value ** 5),
  planckMass: Math.sqrt((SCIENCE_CONSTANTS.h.value / (2 * Math.PI)) * SCIENCE_CONSTANTS.c.value / SCIENCE_CONSTANTS.G.value),
  planckTemperature: Math.sqrt((SCIENCE_CONSTANTS.h.value / (2 * Math.PI)) * SCIENCE_CONSTANTS.c.value ** 5 / SCIENCE_CONSTANTS.G.value) / SCIENCE_CONSTANTS.kB.value
});

export function photonEnergyJ(frequencyHz) {
  if (!Number.isFinite(frequencyHz) || frequencyHz < 0) {
    throw new TypeError('frequencyHz must be a non-negative finite number');
  }
  return SCIENCE_CONSTANTS.h.value * frequencyHz;
}

export function wavelengthFromFrequencyM(frequencyHz) {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    throw new TypeError('frequencyHz must be a positive finite number');
  }
  return SCIENCE_CONSTANTS.c.value / frequencyHz;
}

export function frequencyFromWavelengthHz(wavelengthM) {
  if (!Number.isFinite(wavelengthM) || wavelengthM <= 0) {
    throw new TypeError('wavelengthM must be a positive finite number');
  }
  return SCIENCE_CONSTANTS.c.value / wavelengthM;
}

export function thermalEnergyJ(temperatureK) {
  if (!Number.isFinite(temperatureK) || temperatureK < 0) {
    throw new TypeError('temperatureK must be a non-negative finite number');
  }
  return SCIENCE_CONSTANTS.kB.value * temperatureK;
}

export function formatScientific(value, digits = 6) {
  if (!Number.isFinite(value)) return String(value);
  return value.toExponential(digits);
}

export function planckScaleSummary() {
  return {
    hbar: formatScientific(derivedScienceConstants.hbar, 9),
    planckLengthM: formatScientific(derivedScienceConstants.planckLength, 9),
    planckTimeS: formatScientific(derivedScienceConstants.planckTime, 9),
    planckMassKg: formatScientific(derivedScienceConstants.planckMass, 9),
    planckTemperatureK: formatScientific(derivedScienceConstants.planckTemperature, 9),
    caution: 'Planck units are natural-unit scale markers for instrumentation and thought experiments, not proof that spacetime is literally pixelated.'
  };
}
