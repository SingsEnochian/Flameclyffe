/**
 * standingWaveLens.js
 *
 * Browser standing-wave expression of the Hearthgate Braided Spine.
 *
 * Magic supplies resonance, memory, relation and possibility.
 * Science/Mathematics supplies coupled-oscillator dynamics and phase geometry.
 * Physicality supplies the visible field.
 */

import {
  PREMAQ_WIRE_ORDER,
  PREMAQ_NAMES,
} from '../hearthweave-kernel/braided-spine.js';

const ROOT_HZ = 432;
const AXIS_INTERVALS = Object.freeze({
  P: 0,
  C: 2,
  R: 4,
  E: 5,
  M: 7,
  A: 9,
  Q: 11,
});

const AXIS_TONES = Object.freeze(Object.fromEntries(
  PREMAQ_WIRE_ORDER.map((axis) => [
    axis,
    ROOT_HZ * (2 ** (AXIS_INTERVALS[axis] / 12)),
  ]),
));

const DT = 0.01;
const K_COUPLING = 0.3;
const N_STEPS = 60;
const OMEGA = PREMAQ_WIRE_ORDER.map((axis) => AXIS_TONES[axis] / ROOT_HZ * DT);

function axisValue(deep, axis) {
  const direct = deep?.[axis];
  if (Number.isFinite(direct)) return direct;

  const named = deep?.[PREMAQ_NAMES[axis]?.toLowerCase?.()];
  if (Number.isFinite(named)) return named;

  return 0.5;
}

function encodePremaqToPhases(deep) {
  return PREMAQ_WIRE_ORDER.map((axis) => axisValue(deep, axis) * 2 * Math.PI);
}

function kuramotoStep(theta) {
  const n = theta.length;
  return theta.map((thetaI, i) => {
    let coupling = 0;
    for (let j = 0; j < n; j += 1) coupling += Math.sin(theta[j] - thetaI);
    return thetaI + DT * (OMEGA[i] + K_COUPLING * coupling / n);
  });
}

function orderParameter(theta) {
  let re = 0;
  let im = 0;
  for (const phase of theta) {
    re += Math.cos(phase);
    im += Math.sin(phase);
  }
  re /= theta.length;
  im /= theta.length;
  return Math.sqrt((re * re) + (im * im));
}

function phaseEntropy(theta) {
  const nBins = 8;
  const bins = new Array(nBins).fill(0);
  for (const phase of theta) {
    const norm = (((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    bins[Math.min(Math.floor(norm * nBins), nBins - 1)] += 1;
  }

  const n = theta.length;
  let h = 0;
  for (const count of bins) {
    if (count > 0) {
      const p = count / n;
      h -= p * Math.log(p);
    }
  }
  return h / Math.log(nBins);
}

export function computeWaveFeatures(deep) {
  let theta = encodePremaqToPhases(deep);
  for (let step = 0; step < N_STEPS; step += 1) theta = kuramotoStep(theta);

  const synchronisation = orderParameter(theta);
  const phaseEntropyValue = phaseEntropy(theta);
  const phaseDispersion = 1 - synchronisation;
  const entanglement = axisValue(deep, 'E');
  const memory = axisValue(deep, 'M');
  const agency = axisValue(deep, 'A');
  const qualia = axisValue(deep, 'Q');

  const nodalDensity = clamp(
    0.15
    + phaseDispersion * 0.28
    + phaseEntropyValue * 0.18
    + entanglement * 0.22,
  );

  return {
    schema: 'hearthgate.standing-wave-features/v0.2',
    wave_coherence: synchronisation,
    phase_dispersion: phaseDispersion,
    phase_entropy: phaseEntropyValue,
    nodal_density: nodalDensity,
    presence: axisValue(deep, 'P'),
    coherence: axisValue(deep, 'C'),
    resonance: axisValue(deep, 'R'),
    entanglement,
    memory,
    agency,
    qualia,
    phases: Object.fromEntries(PREMAQ_WIRE_ORDER.map((axis, index) => [axis, theta[index]])),
  };
}

export function buildWaveVars(features) {
  const waveCoherence = clamp(features.wave_coherence ?? 0.5);
  const nodal = clamp(features.nodal_density ?? 0.2);
  const phaseEntropyValue = clamp(features.phase_entropy ?? 0.5);
  const entanglement = clamp(features.entanglement ?? 0.5);
  const memory = clamp(features.memory ?? 0.5);
  const agency = clamp(features.agency ?? 0.5);
  const qualia = clamp(features.qualia ?? 0.5);

  return {
    '--wave-nodal-opacity': (0.1 + waveCoherence * 0.6).toFixed(3),
    '--wave-nodal-scale': (0.6 + nodal * 1.4).toFixed(3),
    '--wave-phase-blur': `${(phaseEntropyValue * 8).toFixed(2)}px`,
    '--wave-resonance-glow': (waveCoherence * 0.9).toFixed(3),
    '--wave-entanglement-thread': entanglement.toFixed(3),
    '--wave-memory-trail': memory.toFixed(3),
    '--wave-agency-vector': agency.toFixed(3),
    '--wave-qualia-bloom': qualia.toFixed(3),
  };
}

export function standingWaveAxisTones() {
  return { ...AXIS_TONES };
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}
