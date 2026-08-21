export const CONSTELLATION_REASONING_PREFERENCE_KEY = 'arcsweep.constellation-reasoning-summaries/v1';
export const CONSTELLATION_REASONING_PREFERENCE_EVENT = 'arcsweep:constellation-reasoning-preference';
export const CONSTELLATION_RATIONALE_EVENT = 'arcsweep:constellation-rationale';

export function reasoningSummariesEnabled(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(CONSTELLATION_REASONING_PREFERENCE_KEY);
    if (raw == null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setReasoningSummariesEnabled(value, storage = globalThis.localStorage) {
  const enabled = value === true;
  try { storage?.setItem?.(CONSTELLATION_REASONING_PREFERENCE_KEY, String(enabled)); } catch {}
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass(CONSTELLATION_REASONING_PREFERENCE_EVENT, { detail: { enabled } }));
  }
  return enabled;
}
