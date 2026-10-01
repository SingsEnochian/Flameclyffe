export const GESTURE_STATE_SCHEMA = 'arcsweep.gesture-state/v1';
export const GESTURE_FEEDBACK_EVENT = 'arcsweep:gesture-feedback';

const CUE_BY_STATE = Object.freeze({
  aware: 'gesture_aware',
  targeted: 'gesture_targeted',
  armed: 'gesture_armed',
  captured: 'gesture_captured',
  committing: 'gesture_commit_request',
  cancelled: 'gesture_cancelled',
  'tracking-lost': 'gesture_tracking_lost',
});

const SILENT_STATES = new Set(['quiet', 'moving', 'settling', 'release']);

function clamp(value, low, high, fallback = low) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(low, Math.min(high, number)) : fallback;
}

function makeEvent(type, detail) {
  if (typeof CustomEvent === 'function') return new CustomEvent(type, { detail });
  return { type, detail };
}

function normaliseState(detail = {}) {
  if (!detail || detail.schema !== GESTURE_STATE_SCHEMA) return null;
  const state = String(detail.state || detail.phase || '').trim().toLowerCase();
  if (!state) return null;
  return Object.freeze({
    schema: GESTURE_STATE_SCHEMA,
    event_id: String(detail.event_id || `gesture:${Date.now()}`),
    source: String(detail.source || 'astra-gesture'),
    gesture: String(detail.gesture || 'unknown'),
    state,
    phase: String(detail.phase || state),
    hand: detail.hand == null ? null : String(detail.hand),
    target_id: detail.target_id == null ? null : String(detail.target_id),
    confidence: clamp(detail.confidence, 0, 1, 0),
  });
}

export function gestureCueForState(state) {
  return CUE_BY_STATE[String(state || '').trim().toLowerCase()] || null;
}

export function createGestureSomaticFeedback({
  somatic,
  profile,
  eventTarget = globalThis,
  now = () => Date.now(),
} = {}) {
  if (!somatic?.emit || !somatic?.stop || !profile?.load) {
    throw new Error('Gesture somatic feedback requires somatic emit/stop and profile store.');
  }

  let destroyed = false;
  let cueInFlight = false;
  let lastFeedbackAt = 0;
  let lastSignature = null;

  async function handle(detail) {
    if (destroyed) return { status: 'ignored', reason: 'destroyed' };
    const event = normaliseState(detail);
    if (!event) return { status: 'ignored', reason: 'invalid-gesture-state' };

    if (event.gesture.toLowerCase() === 'feather') {
      const result = await somatic.stop();
      eventTarget?.dispatchEvent?.(makeEvent(GESTURE_FEEDBACK_EVENT, {
        schema: 'arcsweep.gesture-feedback/v1',
        event_id: event.event_id,
        gesture: event.gesture,
        state: event.state,
        cue_id: null,
        status: 'stopped',
        reason: 'Feather',
      }));
      return result;
    }

    if (SILENT_STATES.has(event.state)) return { status: 'silent', reason: 'continuous-or-settling-state' };
    const cueId = gestureCueForState(event.state);
    if (!cueId) return { status: 'ignored', reason: 'unmapped-state' };

    const state = profile.load();
    if (!state.enabled) return { status: 'suppressed', reason: 'somatic-disabled' };
    if (state.quiet_mode) return { status: 'suppressed', reason: 'quiet-mode' };
    if (state.bindings?.gesture_feedback !== true) return { status: 'suppressed', reason: 'gesture-feedback-disabled' };
    if (event.state !== 'tracking-lost' && event.confidence < Number(state.gesture?.min_confidence ?? 0.55)) {
      return { status: 'suppressed', reason: 'low-confidence' };
    }
    if (cueInFlight) return { status: 'suppressed', reason: 'cue-in-flight' };

    const signature = `${event.gesture}:${event.state}:${event.target_id || ''}`;
    const stamp = now();
    const cooldown = Math.max(80, Number(state.gesture?.feedback_cooldown_ms) || 120);
    if (signature === lastSignature && stamp - lastFeedbackAt < cooldown) {
      return { status: 'suppressed', reason: 'repeat-cooldown' };
    }

    lastSignature = signature;
    lastFeedbackAt = stamp;
    cueInFlight = true;
    try {
      const result = await somatic.emit(cueId, {
        channels: state.channels,
        gain_ceiling: state.gain_ceiling,
        context: {
          trigger: 'arcsweep:gesture-state',
          gesture_event_id: event.event_id,
          gesture_source: event.source,
          gesture: event.gesture,
          gesture_state: event.state,
          phase: event.phase,
          hand: event.hand,
          target_id: event.target_id,
          confidence: event.confidence,
        },
      });
      eventTarget?.dispatchEvent?.(makeEvent(GESTURE_FEEDBACK_EVENT, {
        schema: 'arcsweep.gesture-feedback/v1',
        event_id: event.event_id,
        gesture: event.gesture,
        state: event.state,
        cue_id: cueId,
        status: result?.status || 'applied',
      }));
      return result;
    } finally {
      cueInFlight = false;
    }
  }

  const listener = (event) => { void handle(event?.detail).catch(() => {}); };
  eventTarget?.addEventListener?.('arcsweep:gesture-state', listener);

  return Object.freeze({
    schema: 'arcsweep.gesture-somatic-feedback/v1',
    handle,
    status: () => Object.freeze({
      destroyed,
      cue_in_flight: cueInFlight,
      last_feedback_at: lastFeedbackAt || null,
      last_signature: lastSignature,
    }),
    destroy() {
      destroyed = true;
      eventTarget?.removeEventListener?.('arcsweep:gesture-state', listener);
    },
  });
}
