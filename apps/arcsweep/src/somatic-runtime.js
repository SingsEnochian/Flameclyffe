export const SOMATIC_CUE_SCHEMA = 'arcsweep.somatic-cue/v1';
export const SOMATIC_RECEIPT_SCHEMA = 'arcsweep.somatic-receipt/v1';

const CUES = Object.freeze({
  threshold: Object.freeze({
    id: 'threshold',
    meaning: 'A boundary or mode transition is available.',
    tones_hz: Object.freeze([220, 330]),
    tone_ms: 110,
    gap_ms: 55,
    vibration_ms: Object.freeze([45, 35, 75]),
  }),
  accepted: Object.freeze({
    id: 'accepted',
    meaning: 'An action completed or was accepted.',
    tones_hz: Object.freeze([330, 440]),
    tone_ms: 90,
    gap_ms: 35,
    vibration_ms: Object.freeze([35, 25, 35]),
  }),
  warning: Object.freeze({
    id: 'warning',
    meaning: 'Attention is required before continuing.',
    tones_hz: Object.freeze([196, 196]),
    tone_ms: 140,
    gap_ms: 70,
    vibration_ms: Object.freeze([90, 55, 90]),
  }),
  navigation: Object.freeze({
    id: 'navigation',
    meaning: 'ArcSweep changed rooms or context.',
    tones_hz: Object.freeze([262, 294]),
    tone_ms: 75,
    gap_ms: 25,
    vibration_ms: Object.freeze([28, 22, 52]),
  }),
  brush_contact: Object.freeze({
    id: 'brush_contact',
    meaning: 'Glyph Forge brush contact or parameter acknowledgement.',
    tones_hz: Object.freeze([174]),
    tone_ms: 65,
    gap_ms: 0,
    vibration_ms: Object.freeze([24]),
  }),
});

let activeCue = null;

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_SOMATIC_RUNTIME: ${message}`);
}

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function listSomaticCues() {
  return Object.freeze(Object.values(CUES).map((cue) => Object.freeze(clone(cue))));
}

export function getSomaticCue(cueId) {
  const cue = CUES[String(cueId || '').trim()];
  return cue ? Object.freeze(clone(cue)) : null;
}

export function somaticCueIsActive() {
  return Boolean(activeCue);
}

export function stopSomaticCue(reason = 'Feather') {
  const current = activeCue;
  if (!current) return false;
  current.stopped_early = true;
  current.stop_reason = String(reason || 'stopped');
  try { current.oscillator?.stop?.(); } catch {}
  try { current.context?.close?.(); } catch {}
  try { current.vibrate?.(0); } catch {}
  clearTimeout(current.timer);
  activeCue = null;
  return true;
}

function scheduleToneSequence(context, cue, gainCeiling) {
  const sources = [];
  const start = context.currentTime;
  let cursor = start;
  for (const hz of cue.tones_hz) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const duration = Math.max(0.03, cue.tone_ms / 1000);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(Number(hz), cursor);
    gain.gain.setValueAtTime(0.0001, cursor);
    gain.gain.exponentialRampToValueAtTime(gainCeiling, cursor + Math.min(0.02, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, cursor + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + duration + 0.01);
    sources.push({ oscillator, gain });
    cursor += duration + Math.max(0, cue.gap_ms / 1000);
  }
  return { sources, endClock: cursor };
}

export async function emitSomaticCue(cueId, {
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  vibrate = globalThis.navigator?.vibrate?.bind(globalThis.navigator) || null,
  gainCeiling = 0.025,
  channels = { audio: true, haptic: true },
  source = 'human-ui',
} = {}) {
  const cue = getSomaticCue(cueId);
  invariant(cue, `unknown cue: ${cueId}`);
  invariant(!activeCue, 'another somatic cue is active');

  const startedAt = nowIso();
  const audioRequested = channels?.audio !== false;
  const hapticRequested = channels?.haptic !== false;
  const audioAvailable = typeof AudioContextClass === 'function';
  const hapticAvailable = typeof vibrate === 'function';
  let context = null;
  let tonePlan = null;

  if (audioRequested && audioAvailable) {
    context = new AudioContextClass();
    if (context.state === 'suspended') await context.resume();
    tonePlan = scheduleToneSequence(context, cue, Math.max(0.001, Math.min(0.08, Number(gainCeiling) || 0.025)));
  }
  if (hapticRequested && hapticAvailable) vibrate([...cue.vibration_ms]);

  const audioDuration = cue.tones_hz.length * cue.tone_ms + Math.max(0, cue.tones_hz.length - 1) * cue.gap_ms;
  const hapticDuration = cue.vibration_ms.reduce((sum, value) => sum + value, 0);
  const durationMs = Math.max(audioRequested ? audioDuration : 0, hapticRequested ? hapticDuration : 0, 1);

  return await new Promise((resolve) => {
    const state = {
      context,
      oscillator: tonePlan?.sources?.[0]?.oscillator || null,
      vibrate,
      stopped_early: false,
      stop_reason: null,
      timer: null,
    };
    const finish = () => {
      if (activeCue !== state) return;
      activeCue = null;
      try { context?.close?.(); } catch {}
      resolve(Object.freeze({
        schema: SOMATIC_RECEIPT_SCHEMA,
        cue_id: cue.id,
        meaning: cue.meaning,
        source,
        started_at: startedAt,
        completed_at: nowIso(),
        duration_ms: durationMs,
        audio: Boolean(audioRequested && audioAvailable),
        haptic: Boolean(hapticRequested && hapticAvailable),
        audio_route: audioRequested && audioAvailable ? 'system-selected-output' : null,
        bone_conduction_ready: Boolean(audioRequested && audioAvailable),
        stopped_early: state.stopped_early,
        stop_reason: state.stop_reason,
      }));
    };
    state.timer = setTimeout(finish, durationMs + 45);
    activeCue = state;
  });
}
