export const ASI_SIGNAL_SCHEMA = 'arcsweep.asi-signal/v0.1';

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

export function createSignal({
  amplitude = 0,
  persistence = 0,
  coherence = 0.5,
  uncertainty = 0.5,
} = {}) {
  return Object.freeze({
    schema: ASI_SIGNAL_SCHEMA,
    amplitude: clamp01(amplitude),
    persistence: clamp01(persistence),
    coherence: clamp01(coherence),
    uncertainty: clamp01(uncertainty),
  });
}

export function exciteSignal(signal, amount) {
  const current = createSignal(signal);
  return createSignal({
    ...current,
    amplitude: current.amplitude + clamp01(amount) * (1 - current.amplitude),
    persistence: current.persistence + clamp01(amount) * 0.25 * (1 - current.persistence),
  });
}

export function dampSignal(signal, factor = 0.9) {
  const current = createSignal(signal);
  const damping = clamp01(factor);
  return createSignal({
    ...current,
    amplitude: current.amplitude * damping,
    persistence: current.persistence * Math.max(0.5, damping),
  });
}

export function integrateEvidenceSignal(signal, { coherence, uncertainty, relevance = 0 } = {}) {
  const current = exciteSignal(signal, relevance);
  return createSignal({
    ...current,
    coherence: coherence == null ? current.coherence : coherence,
    uncertainty: uncertainty == null ? current.uncertainty : uncertainty,
  });
}

export function signalActivationScore(signal) {
  const current = createSignal(signal);
  const support = 0.55 * current.amplitude + 0.2 * current.persistence + 0.25 * current.coherence;
  const penalty = 0.35 * current.uncertainty;
  return clamp01(support - penalty);
}
