import { StorySoundscape } from './story-soundscape.js';

export const MAGIC_BOOK_SOUND_BRIDGE_VERSION = 'arcsweep.magic-book-sound-bridge/v1';

const COMMAND_SCHEMA = 'magic-book.sound-bank-command/v1';
const ALLOWED_ORIGINS_KEY = 'arcsweep.magic-book.allowed-origins/v1';
const queue = [];
let activeSoundscape = null;
let flushScheduled = false;

function readAllowedOrigins() {
  const origins = new Set();
  try {
    if (globalThis.location?.origin) origins.add(globalThis.location.origin);
    const raw = globalThis.localStorage?.getItem(ALLOWED_ORIGINS_KEY);
    for (const value of raw ? JSON.parse(raw) : []) if (typeof value === 'string' && value) origins.add(value);
  } catch {}
  return origins;
}

function eventAllowed(event) {
  if (!event?.origin || event.origin === 'null') return true;
  return readAllowedOrigins().has(event.origin);
}

function capture(soundscape) {
  if (!soundscape) return;
  activeSoundscape = soundscape;
  scheduleFlush();
}

function patchCaptureMethod(name) {
  const original = StorySoundscape.prototype[name];
  if (typeof original !== 'function' || original.__magicBookSoundCapture) return;
  const wrapped = function magicBookSoundCapture(...args) {
    capture(this);
    return original.apply(this, args);
  };
  wrapped.__magicBookSoundCapture = MAGIC_BOOK_SOUND_BRIDGE_VERSION;
  wrapped.__original = original;
  StorySoundscape.prototype[name] = wrapped;
}

for (const name of ['snapshot', 'setWorld', 'arm']) patchCaptureMethod(name);

function transient(soundscape, frequency, binding = {}) {
  if (!soundscape?.context || !soundscape?.buses?.tones) return false;
  const now = soundscape.context.currentTime;
  const duration = Math.max(0.04, Number(binding.durationMs || 300) / 1000);
  const oscillator = soundscape.context.createOscillator();
  const gain = soundscape.context.createGain();
  oscillator.type = binding.waveform || 'sine';
  oscillator.frequency.setValueAtTime(Math.max(20, Number(frequency) || soundscape.world?.rootHz || 369), now);
  const peak = Math.max(0.002, Math.min(0.12, Number(binding.gain || 0.035)));
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(soundscape.buses.tones);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
  return true;
}

function dispatchReceipt(command, detail = {}) {
  const receipt = Object.freeze({
    schema: 'arcsweep.magic-book-sound-receipt/v1',
    version: MAGIC_BOOK_SOUND_BRIDGE_VERSION,
    created_at: new Date().toISOString(),
    gesture_id: command?.gestureId || null,
    action: command?.action?.type || null,
    cue_id: command?.cueId || null,
    ...detail,
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:magic-book-sound-receipt', { detail: receipt }));
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('arcsweep:magic-book-sound-receipt', receipt, { source: 'magic-book-sound-bridge' });
  } catch {}
  return receipt;
}

async function executeCommand(command) {
  const soundscape = activeSoundscape;
  if (!soundscape) return false;
  const context = command.context || {};
  const binding = command.binding || {};
  const rootHz = Math.max(20, Number(context.rootHz) || soundscape.world?.rootHz || 369);
  const ratio = Number(binding.frequencyRatio || 1);
  const frequency = rootHz * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
  const duration = Math.max(0.05, Number(binding.durationMs || 360) / 1000);
  const velocity = Math.max(1, Math.min(127, Number(binding.velocity || 76)));

  try {
    await soundscape.arm({ id: context.volumeId || soundscape.world?.worldId, rootHz });
    if (binding.presetKey && soundscape.soundfontPresets?.some((preset) => soundscape.presetKey?.(preset) === binding.presetKey)) {
      soundscape.selectSoundfontPreset(binding.presetKey);
    }

    let source = 'oscillator-fallback';
    let played = false;
    if (soundscape.soundfontSynth && soundscape.selectedSoundfontPreset) {
      played = soundscape.playSoundfontNote(frequency, duration, velocity);
      if (played) source = 'soundfont-bank';
    }
    if (!played) played = transient(soundscape, frequency, binding);

    if (command?.action?.type === 'runa.enter-calm' && !soundscape.humActive) soundscape.startHum?.();
    dispatchReceipt(command, {
      played,
      source,
      frequency_hz: frequency,
      preset: soundscape.selectedSoundfontPreset?.name || null,
      bank_count: soundscape.soundfontBanks?.size || 0,
    });
    return played;
  } catch (error) {
    dispatchReceipt(command, { played: false, source: 'error', message: error?.message || String(error) });
    return false;
  }
}

async function flushQueue() {
  flushScheduled = false;
  if (!activeSoundscape) return;
  while (queue.length) await executeCommand(queue.shift());
}

function scheduleFlush() {
  if (flushScheduled || !queue.length || !activeSoundscape) return;
  flushScheduled = true;
  queueMicrotask(() => void flushQueue());
}

export function ingestMagicBookSoundCommand(command) {
  if (!command || command.schema !== COMMAND_SCHEMA) return false;
  queue.push(command);
  scheduleFlush();
  return true;
}

function onMessage(event) {
  if (!eventAllowed(event)) return;
  ingestMagicBookSoundCommand(event.data);
}

function onLocalCommand(event) {
  ingestMagicBookSoundCommand(event?.detail);
}

if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('message', onMessage);
  globalThis.addEventListener('magic-book:sound-bank-command', onLocalCommand);
}

globalThis.__arcsweepMagicBookSoundBridge = Object.freeze({
  schema: MAGIC_BOOK_SOUND_BRIDGE_VERSION,
  ingest: ingestMagicBookSoundCommand,
  get active() {
    return Boolean(activeSoundscape);
  },
  get pending() {
    return queue.length;
  },
});

globalThis.dispatchEvent?.(new CustomEvent('arcsweep:magic-book-sound-bridge-ready', {
  detail: { schema: MAGIC_BOOK_SOUND_BRIDGE_VERSION },
}));
