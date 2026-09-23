export const UNIVERSAL_CODEX_ANIMATION_SCHEMA = 'arcsweep.universal-codex-animation/v0.3';
export const UNIVERSAL_CODEX_ANIMATION_KEY = 'arcsweep.universal-codex-animation.v0.1';

export const DEFAULT_CODEX_ANIMATION_STATE = Object.freeze({
  pageLight: true,
  latentInk: true,
  inkAura: true,
  depthMotion: true,
  intensity: 0.22,
  // Legacy controls are retained for stored-state compatibility, but the
  // physical renderer does not create HUD panels, orbit rings, or scanlines.
  holograms: false,
  orbit: false,
  scanlines: false,
});

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalisePageSide(value, fallback = 'right') {
  const side = String(value || '').toLowerCase();
  if (side === 'left' || side === 'right' || side === 'both') return side;
  return fallback;
}

export function normaliseCodexAnimationState(value = {}) {
  return Object.freeze({
    schema: UNIVERSAL_CODEX_ANIMATION_SCHEMA,
    pageLight: value.pageLight !== false,
    latentInk: value.latentInk !== false,
    inkAura: value.inkAura !== false,
    depthMotion: value.depthMotion !== false,
    intensity: Math.max(0.02, Math.min(1, finite(value.intensity, DEFAULT_CODEX_ANIMATION_STATE.intensity))),
    holograms: value.holograms === true,
    orbit: value.orbit === true,
    scanlines: value.scanlines === true,
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
    x: ((x / size) - 0.5) * 4.1,
    y: (0.5 - (y / size)) * 5.0,
    z: 0.08 + pressure * 0.16,
    pressure,
    velocity,
    energy: Math.max(0.08, Math.min(1, pressure * 0.72 + velocity / 9000 + 0.12)),
    phase: String(sample.phase || 'move'),
    pageSide: normalisePageSide(sample.page_side ?? sample.pageSide ?? sample.side, 'right'),
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
  const inferredSide = /(^|[-_:])left($|[-_:])/.test(pageId.toLowerCase()) ? 'left'
    : /(^|[-_:])right($|[-_:])/.test(pageId.toLowerCase()) ? 'right'
      : family === 'binding' || family === 'threshold' ? 'both' : 'right';
  return Object.freeze({
    family,
    kind,
    pageId,
    pageSide: normalisePageSide(receipt.page_side ?? receipt.pageSide, inferredSide),
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
      pageSide: normalisePageSide(event.page_side ?? event.pageSide, 'right'),
      strength: 0.94,
    });
  }
  if (schema === 'arcsweep.ancestry-read-event/v0.1') {
    return Object.freeze({
      family: 'ancestry',
      kind: 'ancestry-read',
      pageId: String(event.ref || 'ancestry'),
      pageSide: normalisePageSide(event.page_side ?? event.pageSide, 'right'),
      strength: 0.74,
    });
  }
  return Object.freeze({
    family: 'ancestry',
    kind: 'ancestry',
    pageId: 'ancestry',
    pageSide: normalisePageSide(event.page_side ?? event.pageSide, 'right'),
    strength: 0.58,
  });
}
