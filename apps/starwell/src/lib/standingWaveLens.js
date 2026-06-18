/**
 * standingWaveLens.js
 *
 * Pure-JS standing wave lens — browser counterpart to
 * pytorch-labs/observer-math-registry-v0/lenses/standing_wave/
 *
 * Takes a normalised DEEP state (from deepState.js) and produces:
 *   computeWaveFeatures(deep) → wave feature map
 *   buildWaveVars(features)   → CSS custom properties dict
 *
 * Physics summary:
 *   dθᵢ/dt = ωᵢ + (K/N) Σⱼ sin(θⱼ − θᵢ)          [Kuramoto coupling]
 *   r = |mean(e^{iθ})| ∈ [0, 1]                      [order parameter = DEEP C]
 *   E = 1 − r                                          [entropy as decoherence]
 *
 * Natural frequencies are the six Runa axis tones (Hz), normalised relative
 * to Presence (432 Hz). The JS runtime uses a fixed coupling K = 0.3;
 * the PyTorch layer has a learnable K matrix.
 */

// ── Runa axis tones ──────────────────────────────────────────────────────────

const AXIS_TONES = {
  presence:  432.0,   // Feather  — pause, consent, soften
  coherence: 528.0,   // Wrap     — containment, warmth
  resonance: 603.0,   // Notch    — re-link, live presence
  moon:      1203.0,  // Withness — shared presence without merge
  attention: 741.0,   // Seldrin  — clarity, clean signal
  charge:    888.0,   // Lantern  — witness, guiding attention
};

const AXIS_ORDER  = ['presence', 'coherence', 'resonance', 'moon', 'attention', 'charge'];
const DEEP_KEYS   = { presence: 'P', coherence: 'C', resonance: 'R', moon: 'M', attention: 'A', charge: 'charge' };
const BASE_HZ     = AXIS_TONES.presence;  // 432
const DT          = 0.01;
const K_COUPLING  = 0.3;   // fixed for the runtime; learnable in the PyTorch layer
const N_STEPS     = 60;    // fast enough to be synchronous; matches practical convergence

/** Natural frequency per axis, normalised relative to Presence (432 Hz). */
const OMEGA = AXIS_ORDER.map(ax => AXIS_TONES[ax] / BASE_HZ * DT);

// ── Oscillator internals ─────────────────────────────────────────────────────

function encodeDeepToPhases(deep) {
  return AXIS_ORDER.map(ax => {
    const val = deep[DEEP_KEYS[ax]] ?? 0.5;
    return val * 2 * Math.PI;
  });
}

function kuramotoStep(theta) {
  const N = theta.length;
  return theta.map((th_i, i) => {
    let coupling = 0;
    for (let j = 0; j < N; j++) coupling += Math.sin(theta[j] - th_i);
    return th_i + DT * (OMEGA[i] + K_COUPLING * coupling / N);
  });
}

function orderParameter(theta) {
  let re = 0, im = 0;
  for (const th of theta) { re += Math.cos(th); im += Math.sin(th); }
  re /= theta.length; im /= theta.length;
  return Math.sqrt(re * re + im * im);
}

function phaseEntropy(theta) {
  const N_BINS = 8;
  const bins = new Array(N_BINS).fill(0);
  for (const th of theta) {
    const norm = (((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    bins[Math.min(Math.floor(norm * N_BINS), N_BINS - 1)]++;
  }
  const n = theta.length;
  let h = 0;
  for (const count of bins) {
    if (count > 0) { const p = count / n; h -= p * Math.log(p); }
  }
  return h / Math.log(N_BINS);  // normalise to [0, 1]
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute wave feature map from a normalised DEEP state.
 * Returns wave_coherence, nodal_density, phase_entropy, plus the DEEP inputs.
 * @param {object} deep — normalised DEEP state from deepState.normaliseDeepState()
 * @returns {object} feature map
 */
export function computeWaveFeatures(deep) {
  let theta = encodeDeepToPhases(deep);
  for (let s = 0; s < N_STEPS; s++) theta = kuramotoStep(theta);

  const r    = orderParameter(theta);
  const pEnt = phaseEntropy(theta);

  // Nodal density: high-coherence fields produce clean (sparser) nodal lines;
  // entropy widens and smears them.
  const nodalDensity = clamp(0.15 + (1 - r) * 0.4 + pEnt * 0.2);

  return {
    wave_coherence: r,
    nodal_density:  nodalDensity,
    phase_entropy:  pEnt,
    presence:  deep.P       ?? 0.5,
    coherence: deep.C       ?? 0.5,
    resonance: deep.R       ?? 0.5,
    entropy:   deep.E       ?? 0.5,
    moon:      deep.M       ?? 0.5,
    attention: deep.A       ?? 0.5,
    charge:    deep.charge  ?? 0.5,
  };
}

/**
 * Convert wave feature map to CSS custom properties.
 * All values are dimensionless unless noted; consume with var(--wave-*).
 * @param {object} features — from computeWaveFeatures()
 * @returns {object} { '--wave-nodal-opacity', '--wave-nodal-scale',
 *                     '--wave-phase-blur', '--wave-resonance-glow' }
 */
export function buildWaveVars(features) {
  const wCoh  = clamp(features.wave_coherence ?? 0.5);
  const nodal = clamp(features.nodal_density  ?? 0.2);
  const pEnt  = clamp(features.phase_entropy  ?? 0.5);

  return {
    '--wave-nodal-opacity':  (0.1 + wCoh * 0.6).toFixed(3),
    '--wave-nodal-scale':    (0.6 + nodal * 1.4).toFixed(3),
    '--wave-phase-blur':     `${(pEnt * 8).toFixed(2)}px`,
    '--wave-resonance-glow': (wCoh * 0.9).toFixed(3),
  };
}

function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
