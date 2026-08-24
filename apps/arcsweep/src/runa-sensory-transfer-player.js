import { RUNA_SENSORY_PLAN_SCHEMA } from './runa-sensory-transfer.js';
import { createBrowserSurfaceHapticAdapter } from './runa-surface-haptic-adapter.js';

let activeTransfer = null;

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_RUNA_SENSORY_PLAYER: ${message}`);
}

function closeContext(context) {
  if (!context || context.state === 'closed') return Promise.resolve();
  return context.close().catch(() => undefined);
}

function envelopeGain(gainParam, start, end, ceiling, envelope) {
  const duration = Math.max(0.25, end - start);
  const peak = Math.max(0.0008, Number(ceiling) || 0.02);
  gainParam.setValueAtTime(0.0001, start);
  const attack = envelope === 'attack' ? 0.025 : Math.min(0.12, duration * 0.12);
  gainParam.exponentialRampToValueAtTime(peak, start + attack);
  if (envelope === 'decay') {
    gainParam.exponentialRampToValueAtTime(0.0001, end);
    return;
  }
  gainParam.setValueAtTime(peak, Math.max(start + attack, end - 0.16));
  gainParam.exponentialRampToValueAtTime(0.0001, end);
}

export function sensoryTransferIsActive() {
  return Boolean(activeTransfer);
}

export function stopSensoryTransfer(reason = 'Feather') {
  const active = activeTransfer;
  if (!active) return false;
  active.stoppedEarly = true;
  active.stopReason = String(reason || 'stopped');
  try { active.hapticAdapter?.stop?.(); } catch {}
  for (const item of active.audioSources) {
    try { item.gain?.gain?.cancelScheduledValues(active.context?.currentTime); } catch {}
    try { item.gain?.gain?.setTargetAtTime(0.0001, active.context?.currentTime || 0, 0.025); } catch {}
    try { item.source?.stop((active.context?.currentTime || 0) + 0.08); } catch {}
  }
  globalThis.setTimeout(active.finish, 95);
  return true;
}

export async function launchSensoryTransferPlan(plan, {
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  navigatorObject = globalThis.navigator,
  surfaceHapticAdapter = null,
  clock = () => new Date(),
} = {}) {
  invariant(plan?.schema === RUNA_SENSORY_PLAN_SCHEMA, 'a compiled sensory transfer plan is required');
  invariant(plan.authority?.requires_explicit_user_launch === true, 'plan must require explicit launch');
  invariant(plan.authority?.autoplay_authorized === false, 'plan may not authorize autoplay');
  invariant(!activeTransfer, 'another sensory transfer is already active');

  const audioPlan = plan.transfer.carrier_plans.find((item) => item.carrier === 'air_audio') || null;
  const hapticPlan = plan.transfer.carrier_plans.find((item) => item.carrier === 'surface_haptic') || null;
  const audioRequested = Boolean(audioPlan);
  const hapticRequested = Boolean(hapticPlan);
  const hapticAdapter = surfaceHapticAdapter || createBrowserSurfaceHapticAdapter({ navigatorObject });
  const hapticSupported = Boolean(hapticRequested && hapticAdapter?.isSupported?.());
  const durationMs = Math.max(...plan.transfer.carrier_plans.map((item) => Number(item.duration_ms) || 0), 350);
  const startedAtDate = clock();
  const startedAt = startedAtDate.toISOString();
  let context = null;
  const audioSources = [];
  let audioRendered = false;
  let hapticRendered = false;
  let hapticAdapterReceipt = null;
  let settled = false;

  if (audioRequested) {
    invariant(typeof AudioContextClass === 'function', 'Web Audio is unavailable for AIR/FIELD mode');
    context = new AudioContextClass();
    if (context.state === 'suspended') await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startClock = context.currentTime;
    const endClock = startClock + Math.max(0.35, Number(audioPlan.duration_ms) / 1000);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(Number(audioPlan.frequency_hz), startClock);
    envelopeGain(gain.gain, startClock, endClock, audioPlan.amplitude_norm, audioPlan.envelope);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startClock);
    oscillator.stop(endClock + 0.03);
    audioSources.push({ source: oscillator, gain });
    audioRendered = true;
  }

  if (hapticRequested) {
    invariant(hapticAdapter && typeof hapticAdapter.render === 'function', 'surface_haptic adapter is unavailable');
    hapticAdapterReceipt = await hapticAdapter.render(hapticPlan);
    hapticRendered = Boolean(hapticAdapterReceipt?.rendered);
  }

  const runtime = await new Promise((resolve) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      const current = activeTransfer;
      const stoppedEarly = Boolean(current?.stoppedEarly);
      const stopReason = current?.stopReason || null;
      try { hapticAdapter?.stop?.(); } catch {}
      activeTransfer = null;
      void closeContext(context);
      const completedAtDate = clock();
      resolve(Object.freeze({
        audio_requested: audioRequested,
        audio_rendered: audioRendered,
        haptic_requested: hapticRequested,
        haptic_supported: hapticSupported,
        haptic_rendered: hapticRendered,
        haptic_adapter_receipt: hapticAdapterReceipt ? structuredClone(hapticAdapterReceipt) : null,
        rendered_carriers: [
          audioRendered ? 'air_audio' : null,
          hapticRendered ? 'surface_haptic' : null,
        ].filter(Boolean),
        started_at: startedAt,
        completed_at: completedAtDate.toISOString(),
        actual_duration_ms: Math.max(0, completedAtDate.getTime() - startedAtDate.getTime()),
        stopped_early: stoppedEarly,
        stop_reason: stopReason,
      }));
    };

    activeTransfer = {
      context,
      audioSources,
      hapticAdapter,
      finish,
      stoppedEarly: false,
      stopReason: null,
    };

    if (audioSources[0]?.source?.addEventListener) {
      audioSources[0].source.addEventListener('ended', finish, { once: true });
    }
    globalThis.setTimeout(finish, Math.ceil(durationMs) + 180);
  });

  return runtime;
}
