export const RUNA_SURFACE_HAPTIC_ADAPTER_SCHEMA = 'arcsweep.runa-surface-haptic-adapter/v1';
export const RUNA_SURFACE_HAPTIC_ADAPTER_RENDER_SCHEMA = 'arcsweep.runa-surface-haptic-adapter-render/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_SURFACE_HAPTIC_ADAPTER: ${message}`);
}

function expandPattern(pattern, durationMs) {
  const base = (Array.isArray(pattern) ? pattern : [])
    .map((value) => Math.max(0, Math.round(Number(value) || 0)))
    .filter((value) => value > 0);
  if (!base.length) return [];
  const target = Math.max(1, Math.round(Number(durationMs) || 1));
  const expanded = [];
  let total = 0;
  let index = 0;
  while (total < target && expanded.length < 64) {
    const next = base[index % base.length];
    if (total + next > target) {
      expanded.push(Math.max(1, target - total));
      break;
    }
    expanded.push(next);
    total += next;
    index += 1;
  }
  return expanded;
}

export function createBrowserSurfaceHapticAdapter({ navigatorObject = globalThis.navigator } = {}) {
  const hasVibration = Boolean(navigatorObject && typeof navigatorObject.vibrate === 'function');

  return Object.freeze({
    schema: RUNA_SURFACE_HAPTIC_ADAPTER_SCHEMA,
    adapter_id: 'browser-vibration',
    carrier: 'surface_haptic',
    execution: 'browser-vibration',
    capabilities: Object.freeze({
      timing_control: true,
      frequency_control: false,
      intensity_control: false,
      medical_device_control: false,
      external_bone_audio: false,
      implant_bone_audio: false,
    }),

    isSupported() {
      return hasVibration;
    },

    async render(plan = {}) {
      invariant(plan?.carrier === 'surface_haptic', 'surface_haptic carrier plan required');
      const requestedPattern = expandPattern(plan.pattern_ms, plan.duration_ms);
      let rendered = false;
      if (hasVibration && requestedPattern.length) {
        try {
          rendered = navigatorObject.vibrate(requestedPattern) !== false;
        } catch {
          rendered = false;
        }
      }
      return Object.freeze({
        schema: RUNA_SURFACE_HAPTIC_ADAPTER_RENDER_SCHEMA,
        adapter_id: 'browser-vibration',
        carrier: 'surface_haptic',
        execution: 'browser-vibration',
        supported: hasVibration,
        rendered,
        requested_pattern_ms: requestedPattern,
        requested_duration_ms: Math.max(0, Number(plan.duration_ms) || 0),
        authority: Object.freeze({
          timing_only: true,
          actuator_frequency_claimed: false,
          intensity_control_claimed: false,
          medical_device_control_used: false,
          bone_audio_claimed: false,
        }),
      });
    },

    stop() {
      if (!hasVibration) return false;
      try {
        return navigatorObject.vibrate(0) !== false;
      } catch {
        return false;
      }
    },
  });
}
