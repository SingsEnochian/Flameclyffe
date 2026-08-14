import { RUNA_PREVIEW_PLAN_SCHEMA } from './runa-preview-render.js';

let activePreview = null;

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_PREVIEW_PLAYER: ${message}`);
}

function closeContext(context) {
  if (!context || context.state === 'closed') return Promise.resolve();
  return context.close().catch(() => undefined);
}

export function previewIsActive() {
  return Boolean(activePreview);
}

export function stopRunaPreview(reason = 'Feather') {
  const active = activePreview;
  if (!active) return false;
  active.stoppedEarly = true;
  active.stopReason = String(reason || 'stopped');
  try { active.gain.gain.cancelScheduledValues(active.context.currentTime); } catch {}
  try { active.gain.gain.setTargetAtTime(0.0001, active.context.currentTime, 0.025); } catch {}
  try { active.oscillator.stop(active.context.currentTime + 0.08); } catch {}
  active.finish();
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
  gain.gain.setValueAtTime(0.0001, startClock);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, Number(preview.gain_ceiling)), startClock + Math.min(0.12, durationSeconds * 0.12));
  gain.gain.setValueAtTime(Math.max(0.001, Number(preview.gain_ceiling)), Math.max(startClock + 0.13, endClock - 0.16));
  gain.gain.exponentialRampToValueAtTime(0.0001, endClock);
  oscillator.connect(gain).connect(context.destination);

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
        stopped_early: stoppedEarly,
        stop_reason: stopReason,
        haptic: false,
        midi: false,
        soundfont: false,
      }));
    };

    activePreview = { context, oscillator, gain, finish, stoppedEarly: false, stopReason: null };
    oscillator.addEventListener?.('ended', finish, { once: true });
    oscillator.start(startClock);
    oscillator.stop(endClock + 0.03);
    globalThis.setTimeout(finish, Math.ceil(durationSeconds * 1000) + 180);
  });

  return runtime;
}
