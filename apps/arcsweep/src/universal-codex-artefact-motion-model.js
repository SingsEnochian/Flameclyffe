export const UNIVERSAL_CODEX_ARTEFACT_MOTION_SCHEMA = 'arcsweep.universal-codex-artefact-motion/v0.1';

export const ARTEFACT_EFFECTS = Object.freeze({
  liquidInk: Object.freeze({ id: 'liquid-ink', durationMs: 1500, family: 'ink' }),
  edgeGlint: Object.freeze({ id: 'edge-glint', durationMs: 1050, family: 'metal' }),
  glyphBloom: Object.freeze({ id: 'glyph-bloom', durationMs: 1800, family: 'glyph' }),
  traceThread: Object.freeze({ id: 'trace-thread', durationMs: 2200, family: 'memory' }),
  pageWake: Object.freeze({ id: 'page-wake', durationMs: 1350, family: 'page' }),
  afterimage: Object.freeze({ id: 'afterimage', durationMs: 1200, family: 'gesture' }),
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function hashArtefactSeed(value = '') {
  const text = String(value || 'codex');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function artefactEffectForReceipt(receipt = {}) {
  const kind = String(receipt.kind || '').toLowerCase();
  const family = String(receipt.family || '').toLowerCase();
  const pageSide = String(receipt.pageSide || receipt.page_side || 'both');
  const strength = clamp01(receipt.strength == null ? 0.68 : receipt.strength);

  if (kind.includes('stroke') || family === 'ink' || kind.includes('glyph')) {
    return Object.freeze({ ...ARTEFACT_EFFECTS.liquidInk, pageSide, strength: Math.max(0.45, strength) });
  }
  if (kind.includes('page') || family === 'page') {
    return Object.freeze({ ...ARTEFACT_EFFECTS.pageWake, pageSide, strength: Math.max(0.5, strength) });
  }
  if (kind.includes('growth') || kind.includes('memory') || kind.includes('continuity')) {
    return Object.freeze({ ...ARTEFACT_EFFECTS.traceThread, pageSide, strength });
  }
  if (kind.includes('revelation') || kind.includes('ancestry') || family === 'projection') {
    return Object.freeze({ ...ARTEFACT_EFFECTS.glyphBloom, pageSide, strength: Math.max(0.58, strength) });
  }
  return Object.freeze({ ...ARTEFACT_EFFECTS.edgeGlint, pageSide, strength });
}

export function liquidInkSample({ x = 0.5, y = 0.5, pressure = 0.3, velocity = 0, seed = '' } = {}) {
  const px = clamp01(x);
  const py = clamp01(y);
  const p = clamp01(pressure);
  const v = Math.max(0, Math.min(5000, Number(velocity) || 0));
  const h = hashArtefactSeed(`${seed}:${Math.round(px * 997)}:${Math.round(py * 991)}`);
  const angle = h * Math.PI * 2;
  const drift = 0.12 + p * 0.34 + Math.min(0.22, v / 9000);
  return Object.freeze({
    x: px,
    y: py,
    pressure: p,
    velocity: v,
    vx: Math.cos(angle) * drift,
    vy: Math.sin(angle) * drift - 0.08,
    radius: 1.6 + p * 5.4,
    lifeMs: 720 + p * 760,
    opacity: 0.18 + p * 0.46,
  });
}

export function sigilSegments(seed = 'codex', count = 7) {
  const safeCount = Math.max(4, Math.min(12, Math.floor(Number(count) || 7)));
  const segments = [];
  let cursor = hashArtefactSeed(seed);
  for (let index = 0; index < safeCount; index += 1) {
    cursor = (cursor * 9301 + 49297) % 233280;
    const a = cursor / 233280;
    cursor = (cursor * 9301 + 49297) % 233280;
    const b = cursor / 233280;
    cursor = (cursor * 9301 + 49297) % 233280;
    const c = cursor / 233280;
    cursor = (cursor * 9301 + 49297) % 233280;
    const d = cursor / 233280;
    segments.push(Object.freeze({ x1: a, y1: b, x2: c, y2: d }));
  }
  return Object.freeze(segments);
}

export function artefactMotionDuration(effect, reducedMotion = false) {
  if (reducedMotion) return 0;
  const value = Number(effect?.durationMs);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(2600, value);
}

export function shouldRunArtefactFrame({ effects = 0, ink = 0, pointerActive = false } = {}) {
  return Number(effects) > 0 || Number(ink) > 0 || pointerActive === true;
}
