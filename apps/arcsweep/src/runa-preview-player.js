import { RUNA_PREVIEW_PLAN_SCHEMA } from './runa-preview-render.js';

let activePreview = null;

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_PREVIEW_PLAYER: ${message}`);
}

function closeContext(context) {
  if (!context || context.state === 'closed') return Promise.resolve();
  return context.close().catch(() => undefined);
}

function envelopeGain(gainParam, start, end, ceiling) {
  const duration = Math.max(0.25, end - start);
  const peak = Math.max(0.0008, Number(ceiling));
  gainParam.setValueAtTime(0.0001, start);
  gainParam.exponentialRampToValueAtTime(peak, start + Math.min(0.14, duration * 0.14));
  gainParam.setValueAtTime(peak, Math.max(start + 0.15, end - 0.18));
  gainParam.exponentialRampToValueAtTime(0.0001, end);
}

function seedFromString(value) {
  let seed = 2166136261;
  for (const char of String(value || 'runa')) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  return seed || 1;
}

function deterministicNoise(length, seedInput) {
  let state = seedFromString(seedInput);
  const values = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    values[index] = ((state >>> 0) / 2147483648) - 1;
  }
  return values;
}

function createHarmonicSources(context, preview, startClock, endClock) {
  const config = preview.keyboard_harmonics;
  if (!config?.assigned) return [];
  const sources = [];
  const perVoiceGain = Math.max(0.0006, Number(config.gain_ceiling) / Math.max(1, config.frequencies_hz.length));
  for (const frequency of config.frequencies_hz) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(Number(frequency), startClock);
    envelopeGain(gain.gain, startClock, endClock, perVoiceGain);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startClock);
    oscillator.stop(endClock + 0.03);
    sources.push({ source: oscillator, gain });
  }
  return sources;
}

function createEnvironmentSource(context, plan, startClock, endClock) {
  const config = plan.preview.environmental_soundscape;
  if (!config?.assigned || config.source !== 'filtered-noise') return null;
  invariant(typeof context.createBuffer === 'function' && typeof context.createBufferSource === 'function' && typeof context.createBiquadFilter === 'function', 'Web Audio noise/filter nodes are unavailable');
  const frames = Math.max(1, Math.ceil((endClock - startClock) * context.sampleRate));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  buffer.getChannelData(0).set(deterministicNoise(frames, plan.plan_fingerprint));
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(0.7, startClock);
  filter.frequency.setValueAtTime(Number(config.filter_start_hz), startClock);
  filter.frequency.linearRampToValueAtTime(Number(config.filter_end_hz), endClock);
  envelopeGain(gain.gain, startClock, endClock, Number(config.gain_ceiling));
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(startClock);
  source.stop(endClock + 0.03);
  return { source, gain, filter };
}

export function previewIsActive() {
  return Boolean(activePreview);
}

export function stopRunaPreview(reason = 'Feather') {
  const active = activePreview;
  if (!active) return false;
  active.stoppedEarly = true;
  active.stopReason = String(reason || 'stopped');
  for (const item of active.sources) {
    try { item.gain?.gain?.cancelScheduledValues(active.context.currentTime); } catch {}
    try { item.gain?.gain?.setTargetAtTime(0.0001, active.context.currentTime, 0.025); } catch {}
    try { item.source.stop(active.context.currentTime + 0.08); } catch {}
  }
  globalThis.setTimeout(active.finish, 95);
  return true;
}

export async function launchRunaPreviewPlan(plan, { AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
  invariant(plan?.schema === RUNA_PREVIEW_PLAN_SCHEMA, 'a compiled Runa preview plan is required');
  invariant(plan.authority?.requires_explicit_user_launch === true, 'preview plan must require explicit launch');
  invariant(plan.authority?.autoplay_authorized === false, 'preview plan may not authorize autoplay');
  invariant(typeof AudioContextClass === 'function', 'Web Audio is unavailable in this browser');
  invariant(!activePreview, 'another Runa preview is already active');

  const context = new AudioContextClass();
  if (context.state === 'suspended') await context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const preview = plan.preview;
  const startClock = context.currentTime;
  const durationSeconds = Math.max(0.25, Number(preview.duration_ms) / 1000);
  const midpoint = startClock + durationSeconds / 2;
  const endClock = startClock + durationSeconds;
  const startedAt = new Date().toISOString();
  const rootBefore = Number(preview.base_hz);
  let settled = false;

  oscillator.type = preview.waveform;
  oscillator.frequency.setValueAtTime(Number(preview.base_hz), startClock);
  oscillator.frequency.linearRampToValueAtTime(Number(preview.target_hz), midpoint);
  oscillator.frequency.linearRampToValueAtTime(Number(preview.base_hz), endClock);
  envelopeGain(gain.gain, startClock, endClock, Number(preview.gain_ceiling));
  oscillator.connect(gain).connect(context.destination);

  const sources = [{ source: oscillator, gain }];
  sources.push(...createHarmonicSources(context, preview, startClock, endClock));
  const environment = createEnvironmentSource(context, plan, startClock, endClock);
  if (environment) sources.push(environment);

  const runtime = await new Promise((resolve) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      const current = activePreview;
      const stoppedEarly = Boolean(current?.stoppedEarly);
      const stopReason = current?.stopReason || null;
      const actualDurationMs = Math.max(0, Date.now() - Date.parse(startedAt));
      activePreview = null;
      void closeContext(context);
      resolve(Object.freeze({
        audio: true,
        bus: 'temporary-preview-output',
        waveform: preview.waveform,
        root_hz_before: rootBefore,
        root_hz_after: rootBefore,
        actual_duration_ms: actualDurationMs,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        keyboard_harmonics: Boolean(preview.keyboard_harmonics?.assigned),
        environmental_soundscape: Boolean(preview.environmental_soundscape?.assigned),
        stopped_early: stoppedEarly,
        stop_reason: stopReason,
        haptic: false,
        midi: false,
        soundfont: false,
      }));
    };

    activePreview = { context, sources, finish, stoppedEarly: false, stopReason: null };
    oscillator.addEventListener?.('ended', finish, { once: true });
    oscillator.start(startClock);
    oscillator.stop(endClock + 0.03);
    globalThis.setTimeout(finish, Math.ceil(durationSeconds * 1000) + 180);
  });

  return runtime;
}
