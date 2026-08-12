export const FIELD_AXES = Object.freeze([
  ['P', 'Presence'], ['C', 'Coherence'], ['R', 'Resonance'], ['E', 'Entanglement'],
  ['M', 'Memory'], ['A', 'Agency'], ['Q', 'Qualia'],
]);

export function isHostedBrowser(location = globalThis.location) {
  if (!location || !['http:', 'https:'].includes(location.protocol)) return false;
  return !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyFieldInstrument({ acceptedPremaqc = null, ambient = null, now = Date.now() } = {}) {
  const generatedAt = ambient?.generated_at || null;
  const generatedMs = generatedAt ? Date.parse(generatedAt) : NaN;
  const ageMs = Number.isFinite(generatedMs) ? Math.max(0, Number(now) - generatedMs) : null;
  const stale = ageMs === null || ageMs > 6 * 60 * 60 * 1000;
  const source = acceptedPremaqc ? 'accepted-feedback' : ambient?.field ? 'ambient-projection' : 'unavailable';
  const axes = Object.fromEntries(FIELD_AXES.map(([axis]) => {
    const accepted = finite(acceptedPremaqc?.state?.[axis]?.value);
    const projected = finite(ambient?.field?.[axis]);
    const value = source === 'accepted-feedback' ? accepted : source === 'ambient-projection' ? projected : null;
    return [axis, {
      value,
      status: source === 'accepted-feedback' && value !== null ? 'accepted'
        : source === 'ambient-projection' && value !== null ? 'source-projected'
          : 'unavailable',
      provenance: source === 'accepted-feedback'
        ? acceptedPremaqc.receipt_id || acceptedPremaqc.id || null
        : source === 'ambient-projection' && value !== null ? generatedAt : null,
      provenanceType: source === 'accepted-feedback' && value !== null ? 'receipt'
        : source === 'ambient-projection' && value !== null ? 'source observation'
          : null,
    }];
  }));
  return Object.freeze({ source, axes, generatedAt, ageMs, stale, acceptedPremaqc });
}

export function formatFieldAge(ageMs) {
  if (ageMs === null || ageMs === undefined) return 'age unknown';
  const hours = ageMs / 3600000;
  if (hours < 1) return `${Math.max(0, Math.round(hours * 60))} minutes old`;
  if (hours < 48) return `${Math.round(hours)} hours old`;
  return `${Math.round(hours / 24)} days old`;
}
