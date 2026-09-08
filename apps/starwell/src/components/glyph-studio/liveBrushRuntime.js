import { brushRuntime, clamp, makeId } from './glyphStudioModel.js';

export const LIVE_BRUSH_FRAME_SCHEMA = 'starwell.brush.live-frame.v0.1';
export const BRUSH_SETTING_RECEIPT_SCHEMA = 'starwell.brush.setting-change.v0.1';
export const BRUSH_SENSORY_PREFS_KEY = 'starwell.glyphStudio.brushSensory.v0.1';

const DEFAULT_SENSORY_PREFS = Object.freeze({
  sound: true,
  haptic: true,
  observer: true,
});

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(safeNumber(a.x) - safeNumber(b.x), safeNumber(a.y) - safeNumber(b.y));
}

function speedBetween(point, previousPoint) {
  if (!point || !previousPoint) return 0;
  const dt = Math.max(1, safeNumber(point.t) - safeNumber(previousPoint.t));
  return distance(point, previousPoint) / (dt / 1000);
}

function band(value, low, high, names) {
  if (value < low) return names[0];
  if (value > high) return names[2];
  return names[1];
}

export function brushRevision(brush) {
  return `${brush?.id || 'brush-unknown'}@${brush?.modifiedAt || 'unversioned'}`;
}

export function createBrushSemanticContext(brush, point = {}, previousPoint = null) {
  const runtime = brushRuntime(brush);
  const pressure = clamp(safeNumber(point.pressure, 0.5), 0, 1);
  const speed = speedBetween(point, previousPoint);
  const speedNorm = clamp(speed / 1800, 0, 1);
  const tilt = clamp(Math.hypot(safeNumber(point.tiltX), safeNumber(point.tiltY)) / 90, 0, 1);
  const roughness = clamp((runtime.roughness * 0.55) + (runtime.grainDepth * 0.45), 0, 1);
  const wetness = clamp((runtime.dilution * 0.45) + (runtime.charge * 0.35) + (runtime.wetEdges * 0.2), 0, 1);
  const flow = clamp(runtime.flow * ((1 - runtime.pressureFlow) + runtime.pressureFlow * pressure), 0, 1);

  return {
    brushId: brush?.id || null,
    brushRevision: brushRevision(brush),
    brushName: brush?.name || 'Unnamed Brush',
    pressure,
    pressureBand: band(pressure, 0.32, 0.72, ['light', 'medium', 'firm']),
    speed,
    speedNorm,
    speedBand: band(speedNorm, 0.22, 0.68, ['slow', 'medium', 'fast']),
    tilt,
    tiltBand: band(tilt, 0.22, 0.62, ['upright', 'angled', 'low']),
    roughness,
    textureBand: band(roughness, 0.28, 0.68, ['smooth', 'textured', 'coarse']),
    wetness,
    wetnessBand: band(wetness, 0.25, 0.66, ['dry', 'damp', 'wet']),
    flow,
    flowBand: band(flow, 0.32, 0.72, ['restrained', 'open', 'flooded']),
    metallic: runtime.metallic,
    grain: runtime.grainSource,
    shape: runtime.shapeSource,
    renderingMode: runtime.renderingMode,
  };
}

export function createLiveBrushFrame(brush, point = {}, previousPoint = null, source = 'glyph-canvas') {
  const runtime = brushRuntime(brush);
  const semantic = createBrushSemanticContext(brush, point, previousPoint);
  const pressure = semantic.pressure;
  const speedNorm = semantic.speedNorm;
  const tilt = semantic.tilt;

  const pitch = 110
    + pressure * 210
    + speedNorm * 170
    + runtime.metallic * 120
    + tilt * 45;
  const roughness = semantic.roughness;
  const brightness = 420 + (1 - roughness) * 2200 + runtime.metallic * 1200;
  const gain = clamp(0.012 + pressure * 0.055 + semantic.flow * 0.022, 0.008, 0.11);
  const waveform = roughness > 0.72 ? 'sawtooth' : runtime.metallic > 0.45 ? 'triangle' : 'sine';
  const hapticIntensity = clamp(
    0.12
    + pressure * 0.46
    + roughness * 0.22
    + runtime.grainDepth * 0.18
    + runtime.metallic * 0.08,
    0,
    1,
  );

  return {
    schemaVersion: LIVE_BRUSH_FRAME_SCHEMA,
    id: makeId('brush-frame'),
    source,
    at: new Date().toISOString(),
    brushId: brush?.id || null,
    brushRevision: brushRevision(brush),
    brushName: brush?.name || 'Unnamed Brush',
    point: {
      x: safeNumber(point.x),
      y: safeNumber(point.y),
      pressure,
      tiltX: safeNumber(point.tiltX),
      tiltY: safeNumber(point.tiltY),
      twist: safeNumber(point.twist),
      t: safeNumber(point.t),
    },
    semantic,
    sensory: {
      visual: {
        size: runtime.size,
        opacity: runtime.opacity,
        flow: runtime.flow,
        spacing: runtime.spacing,
        grainDepth: runtime.grainDepth,
        grainScale: runtime.grainScale,
        scatter: runtime.scatter,
        roughness: runtime.roughness,
        metallic: runtime.metallic,
        colour: runtime.colour,
      },
      audio: {
        pitch,
        gain,
        brightness,
        roughness,
        waveform,
      },
      haptic: {
        intensity: hapticIntensity,
        textureHz: Math.round(24 + roughness * 92 + speedNorm * 72),
        pulseMs: Math.round(7 + hapticIntensity * 19),
      },
    },
  };
}

export function makeBrushAuditionStroke(brush) {
  const runtime = brushRuntime(brush);
  const points = [];
  for (let index = 0; index < 18; index += 1) {
    const progress = index / 17;
    points.push({
      x: 70 + progress * 860,
      y: 510 + Math.sin(progress * Math.PI * 2.15) * 95 + Math.sin(progress * Math.PI * 5.5) * 20,
      pressure: clamp(0.18 + Math.sin(progress * Math.PI) * 0.76, 0.05, 1),
      tiltX: Math.sin(progress * Math.PI * 1.5) * 32,
      tiltY: Math.cos(progress * Math.PI * 1.25) * 24,
      twist: progress * 140,
      t: index * 26,
    });
  }

  return {
    id: `audition-${brushRevision(brush)}`,
    layerId: 'brush-audition',
    pointerType: 'pen',
    brushId: brush?.id || null,
    brushRevision: brushRevision(brush),
    brush: runtime,
    points,
    createdAt: brush?.modifiedAt || new Date(0).toISOString(),
  };
}

export function createBrushSettingChangeReceipt({ brush, group, setting, previousValue, nextValue }) {
  return {
    schemaVersion: BRUSH_SETTING_RECEIPT_SCHEMA,
    id: makeId('brush-setting'),
    brushId: brush?.id || null,
    brushRevision: brushRevision(brush),
    group,
    setting,
    previousValue,
    nextValue,
    changedAt: new Date().toISOString(),
  };
}

export function getBrushSensoryPreferences() {
  if (typeof window === 'undefined') return { ...DEFAULT_SENSORY_PREFS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BRUSH_SENSORY_PREFS_KEY) || 'null');
    return { ...DEFAULT_SENSORY_PREFS, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_SENSORY_PREFS };
  }
}

export function setBrushSensoryPreferences(next) {
  const preferences = { ...DEFAULT_SENSORY_PREFS, ...(next || {}) };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BRUSH_SENSORY_PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // Local persistence is helpful, not required for the sensory loop.
    }
    window.dispatchEvent(new CustomEvent('starwell:brush-sensory-preferences', { detail: preferences }));
  }
  return preferences;
}

function dispatch(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

let audio = null;
let lastHapticAt = 0;
let auditionStopTimer = null;

function ensureAudio() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (audio) return audio;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 180;
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  gain.gain.value = 0;
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  audio = { context, oscillator, filter, gain };
  return audio;
}

function updateAudio(frame, preferences) {
  if (!preferences.sound) return;
  const engine = ensureAudio();
  if (!engine) return;
  engine.context.resume?.();
  const now = engine.context.currentTime;
  engine.oscillator.type = frame.sensory.audio.waveform;
  engine.oscillator.frequency.setTargetAtTime(frame.sensory.audio.pitch, now, 0.012);
  engine.filter.frequency.setTargetAtTime(frame.sensory.audio.brightness, now, 0.018);
  engine.filter.Q.setTargetAtTime(0.6 + frame.sensory.audio.roughness * 7.5, now, 0.02);
  engine.gain.gain.setTargetAtTime(frame.sensory.audio.gain, now, 0.012);
}

function updateHaptic(frame, preferences) {
  if (!preferences.haptic || typeof window === 'undefined') return;
  const now = performance.now();
  if (now - lastHapticAt < 42) return;
  lastHapticAt = now;
  dispatch('starwell:brush-haptic-frame', frame.sensory.haptic);
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(frame.sensory.haptic.pulseMs);
  }
}

export const liveBrushSensoryEngine = {
  start(frame) {
    const preferences = getBrushSensoryPreferences();
    if (preferences.observer) dispatch('starwell:live-brush-start', frame);
    updateAudio(frame, preferences);
    updateHaptic(frame, preferences);
  },

  update(frame) {
    const preferences = getBrushSensoryPreferences();
    if (preferences.observer) dispatch('starwell:live-brush-frame', frame);
    updateAudio(frame, preferences);
    updateHaptic(frame, preferences);
  },

  stop(frame = null) {
    const preferences = getBrushSensoryPreferences();
    if (preferences.observer) dispatch('starwell:live-brush-stop', frame);
    if (audio) {
      audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.025);
    }
  },
};

export function auditionBrushDefinition(brush, source = 'brush-studio') {
  const stroke = makeBrushAuditionStroke(brush);
  const previousPoint = stroke.points[7];
  const point = stroke.points[8];
  const frame = createLiveBrushFrame(brush, point, previousPoint, source);
  liveBrushSensoryEngine.start(frame);
  dispatch('starwell:brush-audition', { brushRevision: frame.brushRevision, frame });
  if (typeof window !== 'undefined') {
    window.clearTimeout(auditionStopTimer);
    auditionStopTimer = window.setTimeout(() => liveBrushSensoryEngine.stop(frame), 105);
  }
  return frame;
}

export function dispatchBrushSettingChange(receipt) {
  dispatch('starwell:brush-setting-change', receipt);
  return receipt;
}
