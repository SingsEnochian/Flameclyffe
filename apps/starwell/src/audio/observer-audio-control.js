// Hearthside audio control vector from New Mathematics Section 15
// Maps accepted PREMAQ state → bounded control parameters

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// Exponential interpolation (frequency domain)
const X = (a, b, t) => a * Math.pow(b / a, clamp(t));

// Linear interpolation
const L = (a, b, t) => a + (b - a) * clamp(t);

export function computeObserverAudioControl(premaqState, derivativeEnergy = 0) {
  const P = premaqState?.P?.value ?? 0.5;
  const C = premaqState?.C?.value ?? 0.5;
  const R = premaqState?.R?.value ?? 0.5;
  const E = premaqState?.E?.value ?? 0.5;
  const M = premaqState?.M?.value ?? 0.5;
  const A = premaqState?.A?.value ?? 0.5;
  const Q = premaqState?.Q?.value ?? 0.5;
  const D = derivativeEnergy;

  const u_mean = ['P','C','R','E','M','A','Q'].reduce(
    (acc, k) => acc + (premaqState?.[k]?.uncertainty ?? 0.3),
    0,
  ) / 7;
  const c_mean = ['P','C','R','E','M','A','Q'].reduce(
    (acc, k) => acc + (premaqState?.[k]?.confidence ?? 0.7),
    0,
  ) / 7;

  const f_carrier = X(90, 444, 0.45 * P + 0.35 * C + 0.20 * Q);
  const f_beat    = L(1.5, 12, 0.55 * R + 0.25 * M + 0.20 * D);
  const f_pulse   = L(0.1, 8, 0.60 * M + 0.40 * Math.abs(M - 0.5) * 2);
  const f_filter  = X(400, 6000, 0.65 * A + 0.35 * C);
  const W_stereo  = clamp(0.15 + 0.70 * R - 0.35 * u_mean);
  const g_return  = clamp(0.01 + 0.08 * E * c_mean, 0, 0.09);
  const g_master  = L(0.03, 0.16, clamp(0.45 * P + 0.35 * Q + 0.20 * c_mean));
  const f_L = f_carrier - f_beat / 2;
  const f_R = f_carrier + f_beat / 2;
  const I_return = E > 0.5 ? 1 : 0;

  return {
    schema: 'hearthgate.observer-audio-control/v0.1',
    register: 'projected',
    f_carrier: Math.round(f_carrier * 100) / 100,
    f_beat: Math.round(f_beat * 1000) / 1000,
    f_pulse: Math.round(f_pulse * 1000) / 1000,
    f_filter: Math.round(f_filter * 10) / 10,
    W_stereo: Math.round(W_stereo * 1000) / 1000,
    g_return: Math.round(g_return * 10000) / 10000,
    g_master: Math.round(g_master * 10000) / 10000,
    f_L: Math.round(f_L * 100) / 100,
    f_R: Math.round(f_R * 100) / 100,
    I_return,
    source: { P, C, R, E, M, A, Q, D, u_mean, c_mean },
  };
}

export function computeDerivativeEnergy(currentPremaq, previousPremaq) {
  if (!previousPremaq) return 0;
  const axes = ['P','C','R','E','M','A','Q'];
  let sumSq = 0;
  for (const k of axes) {
    const cur = currentPremaq?.[k]?.value ?? 0.5;
    const prev = previousPremaq?.[k]?.value ?? 0.5;
    const d = cur - prev;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / 7);
}
