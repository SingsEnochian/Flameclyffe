export const UNIVERSAL_CODEX_ANIMATION_SCHEMA = 'arcsweep.universal-codex-animation/v0.2';
export const UNIVERSAL_CODEX_ANIMATION_KEY = 'arcsweep.universal-codex-animation.v0.1';

export const DEFAULT_CODEX_ANIMATION_STATE = Object.freeze({
  holograms: true,
  inkAura: true,
  orbit: true,
  scanlines: true,
  intensity: 0.72,
});

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normaliseCodexAnimationState(value = {}) {
  return Object.freeze({
    schema: UNIVERSAL_CODEX_ANIMATION_SCHEMA,
    holograms: value.holograms !== false,
    inkAura: value.inkAura !== false,
    orbit: value.orbit !== false,
    scanlines: value.scanlines !== false,
    intensity: Math.max(0.15, Math.min(1, finite(value.intensity, DEFAULT_CODEX_ANIMATION_STATE.intensity))),
  });
}

export function patchCodexAnimationState(state, patch = {}) {
  return normaliseCodexAnimationState({ ...state, ...patch });
}

export function glyphSampleToInkSpark(sample = {}, viewbox = 1024) {
  const size = Math.max(1, finite(viewbox, 1024));
  const x = Math.max(0, Math.min(size, finite(sample.x, size / 2)));
  const y = Math.max(0, Math.min(size, finite(sample.y, size / 2)));
  const pressure = Math.max(0, Math.min(1, finite(sample.pressure, 0.5)));
  const velocity = Math.max(0, Math.min(5000, finite(sample.velocity_px_s, 0)));
  return Object.freeze({
    x: ((x / size) - 0.5) * 4.35,
    y: (0.5 - (y / size)) * 4.35,
    z: 0.42 + pressure * 0.32,
    pressure,
    velocity,
    energy: Math.max(0.15, Math.min(1, pressure * 0.72 + velocity / 9000 + 0.2)),
    phase: String(sample.phase || 'move'),
  });
}

export function receiptToCodexPulse(receipt = {}) {
  const kind = String(receipt.kind || 'unknown');
  const pageId = String(receipt.page_id || receipt.pageId || 'binding');
  const family = kind.includes('stroke') ? 'ink'
    : kind.includes('page') ? 'page'
      : kind.includes('room') ? 'threshold'
        : kind.includes('brush') ? 'control'
          : 'binding';
  return Object.freeze({
    family,
    kind,
    pageId,
    strength: family === 'ink' ? 1 : family === 'page' ? 0.88 : 0.68,
  });
}

export function ancestryEventToCodexPulse(event = {}) {
  const schema = String(event.schema || '');
  if (schema === 'arcsweep.ancestry-plan-event/v0.1') {
    return Object.freeze({
      family: 'projection',
      kind: 'ancestry-plan',
      pageId: String(event.plan_id || 'ancestry-plan'),
      strength: 0.94,
    });
  }
  if (schema === 'arcsweep.ancestry-read-event/v0.1') {
    return Object.freeze({
      family: 'ancestry',
      kind: 'ancestry-read',
      pageId: String(event.ref || 'ancestry'),
      strength: 0.74,
    });
  }
  return Object.freeze({
    family: 'ancestry',
    kind: 'ancestry',
    pageId: 'ancestry',
    strength: 0.58,
  });
}
