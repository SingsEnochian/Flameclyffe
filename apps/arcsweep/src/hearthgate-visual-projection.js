import { numericCoordinates } from './vala-stream-adapter.js';

export const HEARTHGATE_VISUAL_PROJECTION_SCHEMA = 'hearthgate.visual-projection/v1';
export const DEFAULT_RADIUS_LIMIT = 2.6;
export const DEFAULT_LERP_ALPHA = 0.12;
export const DEFAULT_BAR_COUNT = 16;
export const DEFAULT_BAR_FLOOR_PERCENT = 4;

const round6 = (value) => Number(Number(value).toFixed(6));
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export function projectSceneTarget(projected, { radiusLimit = DEFAULT_RADIUS_LIMIT } = {}) {
  const values = numericCoordinates(projected);
  const raw = [Number(values[0] || 0), Number(values[1] || 0), Number(values[2] || 0)];
  const magnitude = Math.hypot(...raw);
  const safeLimit = Math.max(0, Number(radiusLimit) || DEFAULT_RADIUS_LIMIT);
  const scale = magnitude > safeLimit && magnitude > 0 ? safeLimit / magnitude : 1;
  const target = raw.map((value) => round6(value * scale));

  return Object.freeze({
    schema: HEARTHGATE_VISUAL_PROJECTION_SCHEMA,
    raw_coordinates: Object.freeze(raw.map(round6)),
    raw_magnitude: round6(magnitude),
    radius_limit: round6(safeLimit),
    radial_scale: round6(scale),
    target_coordinates: Object.freeze(target),
    capped: scale < 1,
  });
}

export function lerpScenePosition(current, target, alpha = DEFAULT_LERP_ALPHA) {
  if (!Array.isArray(current) || !Array.isArray(target) || current.length < 3 || target.length < 3) {
    throw new TypeError('current and target must be coordinate arrays with at least three values.');
  }
  const blend = clamp01(alpha);
  return Object.freeze([0, 1, 2].map((index) => round6(
    Number(current[index] || 0) + ((Number(target[index] || 0) - Number(current[index] || 0)) * blend),
  )));
}

export function spectrometerLevels(projected, {
  count = DEFAULT_BAR_COUNT,
  floorPercent = DEFAULT_BAR_FLOOR_PERCENT,
} = {}) {
  const safeCount = Math.max(1, Math.trunc(Number(count) || DEFAULT_BAR_COUNT));
  const safeFloor = Math.min(100, Math.max(0, Number(floorPercent) || 0));
  const values = numericCoordinates(projected).slice(0, safeCount);
  const ceiling = Math.max(1e-9, ...values.map((value) => Math.abs(Number(value) || 0)));

  return Object.freeze(Array.from({ length: safeCount }, (_, index) => {
    const raw = Number(values[index] || 0);
    const normalized = Math.abs(raw) / ceiling;
    return Object.freeze({
      index,
      raw: round6(raw),
      normalized: round6(normalized),
      height_percent: Math.max(safeFloor, Math.round(normalized * 100)),
    });
  }));
}

export function buildVisualProjectionReceipt(projected) {
  const scene = projectSceneTarget(projected);
  return Object.freeze({
    schema: HEARTHGATE_VISUAL_PROJECTION_SCHEMA,
    scene,
    spectrometer: spectrometerLevels(projected),
    animation: Object.freeze({
      lerp_alpha_per_frame: DEFAULT_LERP_ALPHA,
      recurrence: 'p[n+1] = p[n] + alpha * (target - p[n])',
    }),
    semantics: Object.freeze({
      x: 'projected coordinate 0',
      y: 'projected coordinate 1',
      z: 'projected coordinate 2',
      adaptive_quality_directly_controls_position: false,
    }),
  });
}
