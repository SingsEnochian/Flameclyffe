export const DEEP_SENSOR_CHIPS = [
  {
    key: 'tide',
    label: 'Tide',
    note: 'Temporal signature and current symbolic mode.',
    baseSize: 58,
    rotation: 0,
    proxy: (deep) => ({
      ...deep,
      P: (deep.P + deep.R) / 2,
      C: (deep.C + deep.A) / 2,
      E: deep.E * 0.62,
      charge: (deep.charge + deep.A) / 2,
    }),
  },
  {
    key: 'presence',
    label: 'Presence',
    note: 'P and A: node density, attention, and activation.',
    baseSize: 66,
    rotation: 42,
    proxy: (deep) => ({
      ...deep,
      P: deep.P,
      C: deep.A,
      E: deep.E * 0.52,
      charge: deep.A,
    }),
  },
  {
    key: 'clarity',
    label: 'Clarity',
    note: 'C and R: edge sharpness, thread coherence, resonance.',
    baseSize: 58,
    rotation: 94,
    proxy: (deep) => ({
      ...deep,
      P: deep.C,
      C: deep.C,
      E: Math.max(0, deep.E * 0.38),
      charge: deep.R,
    }),
  },
  {
    key: 'entropy',
    label: 'Entropy',
    note: 'E and Bz: disturbance, turbulence, and colour-temperature shift.',
    baseSize: 62,
    rotation: 148,
    proxy: (deep) => ({
      ...deep,
      P: deep.E,
      C: 1 - deep.E * 0.42,
      E: deep.E,
      charge: Math.max(0.24, deep.E),
      kp: Math.max(deep.kp, 4),
    }),
  },
  {
    key: 'moon',
    label: 'Moon',
    note: 'M and moon illumination: cyclic phase and harmonic ring influence.',
    baseSize: 64,
    rotation: 210,
    proxy: (deep) => ({
      ...deep,
      P: deep.M,
      C: (deep.C + deep.M) / 2,
      E: deep.E * 0.42,
      charge: deep.moonIllum / 100,
    }),
  },
  {
    key: 'geomagnetic',
    label: 'Geomagnetic',
    note: 'Kp and charge: storm energy and centre luminosity.',
    baseSize: 68,
    rotation: 282,
    proxy: (deep) => ({
      ...deep,
      P: deep.kp / 9,
      C: deep.C * 0.7,
      E: Math.max(deep.E, deep.kp / 9),
      charge: deep.charge,
      kp: deep.kp,
    }),
  },
];

export function getDeepSensorByIndex(index) {
  return DEEP_SENSOR_CHIPS[index] || DEEP_SENSOR_CHIPS[0];
}
