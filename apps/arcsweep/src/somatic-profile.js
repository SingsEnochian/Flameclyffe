export const SOMATIC_PROFILE_SCHEMA = 'arcsweep.somatic-profile/v1';
export const SOMATIC_PROFILE_KEY = 'arcsweep:somatic-profile:v1';

const DEFAULT_PROFILE = Object.freeze({
  schema: SOMATIC_PROFILE_SCHEMA,
  version: 1,
  enabled: true,
  gain_ceiling: 0.025,
  channels: Object.freeze({ audio: true, haptic: true }),
  bindings: Object.freeze({ navigation: false, brush_contact: false, brush_expression: false }),
  cooldown_ms: 450,
  brush: Object.freeze({
    contact_cooldown_ms: 180,
    expression_cooldown_ms: 120,
    velocity_reference_px_s: 900,
    min_pressure: 0.05,
  }),
  quiet_mode: false,
  cue_feedback: Object.freeze({}),
  updated_at: null,
});

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function storageOrNull(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

function bounded(value, low, high, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(low, Math.min(high, number)) : fallback;
}

export function detectSomaticChannels(scope = globalThis) {
  const navigator = scope.navigator || {};
  return Object.freeze({
    schema: 'arcsweep.somatic-channel-status/v1',
    web_audio: typeof (scope.AudioContext || scope.webkitAudioContext) === 'function',
    vibration: typeof navigator.vibrate === 'function',
    pointer_events: typeof scope.PointerEvent === 'function',
    touch: Number(navigator.maxTouchPoints || 0) > 0,
    device_motion: typeof scope.DeviceMotionEvent === 'function',
    device_orientation: typeof scope.DeviceOrientationEvent === 'function',
    microphone_api: Boolean(navigator.mediaDevices?.getUserMedia),
    gamepad_api: typeof navigator.getGamepads === 'function',
    selected_audio_route: 'system-selected-output',
    bone_conduction_compatible: typeof (scope.AudioContext || scope.webkitAudioContext) === 'function',
    note: 'Bone-conduction compatibility means ordinary audio can use a user-selected system audio route; ArcSweep does not control implants or medical devices.',
  });
}

export function createSomaticProfileStore({ storage = null, key = SOMATIC_PROFILE_KEY, now = () => new Date().toISOString() } = {}) {
  const target = storageOrNull(storage);

  function normalise(input = {}) {
    const base = clone(DEFAULT_PROFILE);
    const gain = Number(input.gain_ceiling);
    const cooldown = Number(input.cooldown_ms);
    const brush = input.brush || {};
    return Object.freeze({
      ...base,
      ...clone(input),
      schema: SOMATIC_PROFILE_SCHEMA,
      version: 1,
      enabled: input.enabled !== false,
      gain_ceiling: Number.isFinite(gain) ? Math.max(0.001, Math.min(0.08, gain)) : base.gain_ceiling,
      channels: Object.freeze({
        audio: input.channels?.audio !== false,
        haptic: input.channels?.haptic !== false,
      }),
      bindings: Object.freeze({
        navigation: input.bindings?.navigation === true,
        brush_contact: input.bindings?.brush_contact === true,
        brush_expression: input.bindings?.brush_expression === true,
      }),
      cooldown_ms: Number.isFinite(cooldown) ? Math.max(150, Math.min(5000, Math.round(cooldown))) : base.cooldown_ms,
      brush: Object.freeze({
        contact_cooldown_ms: Math.round(bounded(brush.contact_cooldown_ms, 100, 1500, base.brush.contact_cooldown_ms)),
        expression_cooldown_ms: Math.round(bounded(brush.expression_cooldown_ms, 80, 1000, base.brush.expression_cooldown_ms)),
        velocity_reference_px_s: Math.round(bounded(brush.velocity_reference_px_s, 100, 5000, base.brush.velocity_reference_px_s)),
        min_pressure: bounded(brush.min_pressure, 0.01, 0.95, base.brush.min_pressure),
      }),
      quiet_mode: input.quiet_mode === true,
      cue_feedback: Object.freeze({ ...(input.cue_feedback || {}) }),
      updated_at: input.updated_at || null,
    });
  }

  function load() {
    if (!target) return normalise();
    try {
      const raw = target.getItem(key);
      if (!raw) return normalise();
      return normalise(JSON.parse(raw));
    } catch { return normalise(); }
  }

  function save(patch = {}) {
    const current = load();
    const next = normalise({
      ...current,
      ...clone(patch),
      channels: { ...current.channels, ...(patch.channels || {}) },
      bindings: { ...current.bindings, ...(patch.bindings || {}) },
      brush: { ...current.brush, ...(patch.brush || {}) },
      updated_at: now(),
    });
    try { target?.setItem?.(key, JSON.stringify(next)); } catch {}
    return next;
  }

  function rateCue(cueId, rating, note = '') {
    const allowed = new Set(['clear', 'muddy', 'too-sharp', 'pleasant', 'indistinct']);
    if (!allowed.has(rating)) throw new Error(`Unsupported somatic cue rating: ${rating}`);
    const current = load();
    return save({
      cue_feedback: {
        ...current.cue_feedback,
        [String(cueId)]: { rating, note: String(note || '').slice(0, 240), rated_at: now() },
      },
    });
  }

  function clear() {
    try { target?.removeItem?.(key); } catch {}
    return load();
  }

  return Object.freeze({ key, load, save, rateCue, clear, available: () => Boolean(target) });
}
