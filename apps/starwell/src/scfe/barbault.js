export const BARBAULT_BODIES = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

export function normalizeLongitude(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Longitude must be a finite number, received ${value}`);
  }

  if (number < 0 || number >= 360) {
    throw new Error(`Longitude must be within 0 <= value < 360 degrees, received ${value}`);
  }

  return number;
}

export function angularDistance(a, b) {
  const first = normalizeLongitude(a);
  const second = normalizeLongitude(b);
  const diff = Math.abs(first - second) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function classifyCompression(index) {
  if (index < 250) return 'extreme_compression';
  if (index < 400) return 'high_compression';
  if (index < 600) return 'moderate_compression';
  if (index < 800) return 'distributed';
  return 'wide_distribution';
}

export function calculateBarbaultIndex(longitudes) {
  const normalized = BARBAULT_BODIES.reduce((next, body) => {
    if (!(body in longitudes)) {
      throw new Error(`Missing Barbault longitude for ${body}`);
    }
    next[body] = Number(normalizeLongitude(longitudes[body]).toFixed(3));
    return next;
  }, {});

  const pairwiseDistances = {};
  let total = 0;

  for (let i = 0; i < BARBAULT_BODIES.length; i += 1) {
    for (let j = i + 1; j < BARBAULT_BODIES.length; j += 1) {
      const a = BARBAULT_BODIES[i];
      const b = BARBAULT_BODIES[j];
      const distance = angularDistance(normalized[a], normalized[b]);
      pairwiseDistances[`${a}_${b}`] = Number(distance.toFixed(3));
      total += distance;
    }
  }

  return {
    source_type: 'manual_longitudes',
    bodies: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
    longitudes: normalized,
    pairwise_distances: pairwiseDistances,
    cyclic_index: Number(total.toFixed(3)),
    compression_level: classifyCompression(total),
    phase_label: classifyCompression(total),
    calibration_note: 'Compression thresholds are provisional until calibrated against historical Cyclic Index curves.',
  };
}
