const CHANNELS = new Set(['IC', 'OOC']);
const CANON_STATES = new Set(['candidate', 'unresolved', 'verified', 'conflicted']);

function clamp(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}

export function normaliseMaterialSignal(detail = {}) {
  return Object.freeze({
    strength: clamp(detail.strength, 0.72),
    intent: clamp(detail.intent, 0),
    channel: CHANNELS.has(detail.channel) ? detail.channel : 'IC',
    ownership: clamp(detail.ownership, 0),
    handoff_progress: clamp(detail.handoff_progress, 0),
    canon_state: CANON_STATES.has(detail.canon_state) ? detail.canon_state : 'candidate',
    mode: String(detail.mode || 'wake').trim().slice(0, 48) || 'wake',
  });
}

export function emitMaterialSignal(detail = {}) {
  const signal = normaliseMaterialSignal(detail);
  if (typeof globalThis.CustomEvent === 'function') {
    globalThis.dispatchEvent?.(new CustomEvent('wayglass:material-wake', { detail: signal }));
  }
  return signal;
}
