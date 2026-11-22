export const RUNA_MANIFESTATION_SCHEMA = 'arcsweep.runa-manifestation/v1';
export const RUNA_MANIFESTATION_RECEIPT_SCHEMA = 'arcsweep.runa-manifestation-receipt/v1';

const SAFE_GATEWAY_MODES = new Set(['gateway-offset', 'full-twist']);
const GLYPH_INTERVALS = Object.freeze([-12, -7, -5, 0, 2, 5, 7, 12]);

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function nowIso(now) {
  return now().toISOString();
}

function hashString(value = '') {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function worldInput(input = {}) {
  const worldId = String(input.world_id || input.worldId || '').trim();
  const worldName = String(input.world_name || input.worldName || '').trim();
  const rootHz = Number(input.root_hz ?? input.rootHz);
  const waveform = String(input.waveform || '').trim();
  const overtones = Number(input.overtones);
  const world = {};
  if (worldId) world.id = worldId;
  if (worldName) world.name = worldName;
  if (Number.isFinite(rootHz) && rootHz > 0) world.root_hz = rootHz;
  if (waveform) world.soundscape = { ...(world.soundscape || {}), waveform };
  if (Number.isFinite(overtones) && overtones > 0) world.soundscape = { ...(world.soundscape || {}), overtones };
  return world;
}

function storySnapshot(story) {
  if (!story) return null;
  let snapshot = null;
  try { snapshot = story.snapshot?.() || null; } catch {}
  const world = snapshot?.world || story.world || {};
  return {
    armed: Boolean(story.armed ?? story.context),
    world_id: world.worldId || world.id || null,
    world_name: world.worldName || world.name || null,
    root_hz: Number(world.rootHz ?? world.root_hz) || null,
    waveform: world.waveform || null,
    hum_active: Boolean(snapshot?.humActive ?? story.humActive),
    legacy_heartfield_active: Boolean(snapshot?.heartfield?.active ?? story.heartfieldActive),
  };
}

function glyphFrequency(stroke = {}, rootHz = 220) {
  const identity = stroke.stroke_id || stroke.id || stroke.glyph_id || stroke.brush_id || 'glyph-stroke';
  const interval = GLYPH_INTERVALS[hashString(identity) % GLYPH_INTERVALS.length];
  return Number(Math.max(40, Math.min(4000, rootHz * (2 ** (interval / 12)))).toFixed(3));
}

function glyphDuration(stroke = {}) {
  const points = Number(stroke.point_count ?? stroke.points?.length ?? 0);
  return Number(Math.max(0.12, Math.min(0.72, 0.16 + (points * 0.003))).toFixed(3));
}

function sanitizeHapticPattern(pattern) {
  const values = Array.isArray(pattern) ? pattern : [pattern];
  return values
    .slice(0, 12)
    .map((value) => Math.round(clamp(value, 0, 1200)))
    .filter((value) => value > 0);
}

export function createRunaManifestationAdapter({
  storyProvider = () => globalThis.__arcsweepStorySoundscape || null,
  navigatorProvider = () => globalThis.navigator || null,
  mobiusProvider = null,
  loadMobius = async () => import('../../../../assets/mobius-audio-bus.js'),
  onReceipt = null,
  now = () => new Date(),
} = {}) {
  let gatewayBus = null;
  let gatewayActive = false;
  let glyphSonification = false;
  let glyphHaptics = false;
  const recent = [];
  const seenStrokeIds = new Set();
  const seenStrokeOrder = [];

  function receipt(kind, detail = {}) {
    const record = Object.freeze({
      schema: RUNA_MANIFESTATION_RECEIPT_SCHEMA,
      receipt_id: `runa-manifest:${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      kind,
      ...clone(detail),
      created_at: nowIso(now),
    });
    recent.unshift(record);
    recent.splice(24);
    try { onReceipt?.(record); } catch {}
    try {
      globalThis.dispatchEvent?.(new CustomEvent('arcsweep:runa-manifestation', { detail: record }));
    } catch {}
    return record;
  }

  function story() {
    return storyProvider?.() || null;
  }

  async function requireStory(input = {}) {
    const soundscape = story();
    if (!soundscape) throw new Error('ArcSweep StorySoundscape is not mounted yet.');
    if (typeof soundscape.arm !== 'function') throw new Error('Mounted StorySoundscape cannot arm audio.');
    const requested = worldInput(input);
    const live = soundscape.snapshot?.()?.world || soundscape.world || {};
    const liveId = live.worldId || live.id;
    const switchingWorld = requested.id && requested.id !== liveId;
    let world;
    if (switchingWorld) {
      // Workspace defaults initialise a different world, but never overwrite
      // adjustments already made to the currently mounted world's mixer.
      const source = input.world?.id === requested.id ? input.world : {};
      world = { ...source, ...requested, soundscape: { ...source.soundscape, ...requested.soundscape } };
      if (requested.root_hz) world.soundscape.rootHz = requested.root_hz;
    } else if (requested.root_hz || requested.soundscape || (requested.name && requested.name !== live.worldName)) {
      world = {
        id: liveId,
        name: live.worldName || live.name,
        root_hz: live.rootHz ?? live.root_hz,
        ...requested,
        soundscape: { waveform: live.waveform, overtones: live.overtones, ...requested.soundscape },
      };
    }
    await soundscape.arm(world);
    return soundscape;
  }

  async function requireGateway() {
    if (gatewayBus) return gatewayBus;
    if (typeof mobiusProvider === 'function') gatewayBus = await mobiusProvider();
    if (!gatewayBus) {
      await loadMobius();
      const MobiusAudioBus = globalThis.MobiusAudioBus;
      if (typeof MobiusAudioBus !== 'function') throw new Error('Existing Möbius Safe Gateway engine did not register.');
      gatewayBus = new MobiusAudioBus({ owner: 'runa-manifestation' });
    }
    return gatewayBus;
  }

  function nativeHapticsAvailable() {
    return typeof navigatorProvider?.()?.vibrate === 'function';
  }

  function status() {
    const soundscape = story();
    let gateway = null;
    try { gateway = gatewayBus?.getState?.('runa-status') || null; } catch {}
    return Object.freeze({
      schema: RUNA_MANIFESTATION_SCHEMA,
      story_soundscape: storySnapshot(soundscape),
      world_hum_available: Boolean(soundscape?.startHum && soundscape?.stopHum),
      safe_gateway_available: Boolean(gatewayBus || mobiusProvider || typeof globalThis.window !== 'undefined'),
      safe_gateway_active: gatewayActive || Boolean(gateway?.loopHeld),
      safe_gateway_state: gateway ? clone(gateway) : null,
      glyph_sonification_enabled: glyphSonification,
      glyph_haptics_enabled: glyphHaptics,
      native_haptics_available: nativeHapticsAvailable(),
      legacy_heartfield_role: 'compatibility-only',
      recent_receipts: recent.slice(0, 8).map(clone),
    });
  }

  async function startWorldHum(input = {}) {
    const soundscape = await requireStory(input);
    soundscape.startHum();
    const snapshot = storySnapshot(soundscape);
    return receipt('world-hum-start', {
      applied: true,
      engine: 'StorySoundscape',
      world_id: snapshot?.world_id,
      root_hz: snapshot?.root_hz,
      waveform: snapshot?.waveform,
      outputs: { audio: true, haptic: false },
    });
  }

  function stopWorldHum(reason = 'requested') {
    const soundscape = story();
    soundscape?.stopHum?.();
    return receipt('world-hum-stop', {
      applied: Boolean(soundscape),
      engine: 'StorySoundscape',
      reason,
    });
  }

  async function startSafeGateway(input = {}) {
    const bus = await requireGateway();
    const mode = SAFE_GATEWAY_MODES.has(input.mode) ? input.mode : 'gateway-offset';
    const hold = input.hold !== false;
    await bus.ensure?.();
    if (input.master != null) bus.setMaster?.(clamp(input.master, 0.01, 0.32));
    bus.setMonoSafe?.(input.mono_safe === true);
    bus.setPhaseInverted?.(input.phase_inverted !== false);
    bus.setReturnSide?.(['left', 'right', 'both'].includes(input.return_side) ? input.return_side : 'right');
    if (!hold && input.duration_seconds != null) bus.setDuration?.(clamp(input.duration_seconds, 0.25, 30));
    if (hold) await bus.startLoop?.(mode);
    else await bus.runTest?.(mode);
    gatewayActive = hold;
    return receipt('safe-gateway-start', {
      applied: true,
      engine: 'MobiusAudioBus',
      mode,
      holding: hold,
      frequency_plan: {
        left_hz: 369,
        right_hz: 363.5,
        binaural_difference_hz: 5.5,
        centre_floor_hz: 108,
      },
      haptic_carrier_hz: 174,
      haptic_carrier_rendered: false,
      outputs: { audio: true, native_haptic: false },
    });
  }

  function stopSafeGateway(reason = 'requested') {
    if (gatewayBus?.feather) gatewayBus.feather();
    gatewayActive = false;
    return receipt('safe-gateway-stop', {
      applied: Boolean(gatewayBus),
      engine: 'MobiusAudioBus',
      reason,
    });
  }

  async function setGlyphSonification(input = {}) {
    const enabled = input.enabled !== false;
    glyphHaptics = enabled && input.haptics === true;
    if (enabled) await requireStory(input);
    glyphSonification = enabled;
    if (!enabled) {
      try { navigatorProvider?.()?.vibrate?.(0); } catch {}
    }
    return receipt('glyph-sonification-setting', {
      applied: true,
      enabled: glyphSonification,
      haptics_enabled: glyphHaptics,
      engine: 'StorySoundscape',
    });
  }

  function rememberStroke(stroke = {}) {
    const id = String(stroke.stroke_id || stroke.id || '').trim();
    if (!id) return false;
    if (seenStrokeIds.has(id)) return true;
    seenStrokeIds.add(id);
    seenStrokeOrder.push(id);
    while (seenStrokeOrder.length > 128) {
      const stale = seenStrokeOrder.shift();
      seenStrokeIds.delete(stale);
    }
    return false;
  }

  function observeGlyphStroke(stroke = {}, { source = 'glyph-forge' } = {}) {
    if (rememberStroke(stroke)) return { applied: false, duplicate: true, stroke_id: stroke.stroke_id || stroke.id || null };
    if (!glyphSonification) return { applied: false, enabled: false, stroke_id: stroke.stroke_id || stroke.id || null };

    const soundscape = story();
    const snapshot = storySnapshot(soundscape);
    const rootHz = snapshot?.root_hz || 220;
    const frequency = glyphFrequency(stroke, rootHz);
    const duration = glyphDuration(stroke);
    const audible = Boolean(snapshot?.armed && typeof soundscape?.playWorldTone === 'function');
    if (audible) soundscape.playWorldTone(frequency, duration);

    let haptic = false;
    if (glyphHaptics) {
      const navigatorLike = navigatorProvider?.();
      if (typeof navigatorLike?.vibrate === 'function') {
        try { haptic = navigatorLike.vibrate([9, 12, Math.round(12 + duration * 22)]) !== false; } catch {}
      }
    }

    return receipt('glyph-stroke', {
      applied: audible || haptic,
      stroke_id: stroke.stroke_id || stroke.id || null,
      glyph_id: stroke.glyph_id || null,
      brush_id: stroke.brush_id || null,
      source,
      world_id: snapshot?.world_id || null,
      root_hz: rootHz,
      frequency_hz: frequency,
      duration_seconds: duration,
      outputs: { audio: audible, native_haptic: haptic },
      reason: audible || haptic ? null : 'manifestation-output-not-armed-or-supported',
    });
  }

  function pulseHaptic(input = {}) {
    const navigatorLike = navigatorProvider?.();
    const pattern = sanitizeHapticPattern(input.pattern?.length ? input.pattern : (input.pattern || [18, 24, 34]));
    let rendered = false;
    if (pattern.length && typeof navigatorLike?.vibrate === 'function') {
      try { rendered = navigatorLike.vibrate(pattern) !== false; } catch {}
    }
    return receipt('haptic-pulse', {
      applied: rendered,
      pattern,
      outputs: { native_haptic: rendered },
      reason: rendered ? null : 'native-vibration-unavailable',
    });
  }

  function feather(reason = 'Feather') {
    const soundscape = story();
    soundscape?.stopHum?.();
    soundscape?.stopHeartfield?.();
    soundscape?.stopBluebirdWeightedHome?.();
    try { gatewayBus?.feather?.(); } catch {}
    try { navigatorProvider?.()?.vibrate?.(0); } catch {}
    gatewayActive = false;
    glyphSonification = false;
    glyphHaptics = false;
    return receipt('feather', {
      applied: true,
      reason,
      stopped: ['world-hum', 'safe-gateway', 'glyph-sonification', 'legacy-heartfield-output', 'bluebird-weighted-home'],
    });
  }

  return Object.freeze({
    status,
    startWorldHum,
    stopWorldHum,
    startSafeGateway,
    stopSafeGateway,
    setGlyphSonification,
    observeGlyphStroke,
    pulseHaptic,
    feather,
  });
}
