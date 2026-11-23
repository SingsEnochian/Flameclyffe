/**
 * Wayglass / Runa observer event bridge, v0.1.
 * Pure, read-only projection. No network, storage, identity writes, or Runa sync.
 * Source receipts remain authoritative; geometry is a display, not evidence.
 */
export const WAYGLASS_OBSERVER_LIGHT_SCHEMA = 'wayglass.wonder-light/v0.1';

const EVENT_KINDS = new Set(['observer-reading', 'commons-received', 'commons-sent', 'commons-failed', 'return-verified', 'wonder-question']);
const VERIFICATION = new Set(['verified', 'pending', 'failed', 'unknown', 'hypothesis']);
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9:._\/-]{0,159}$/;

function identifier(value) {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : null;
}

function time(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Only explicitly display-authorized, metadata-only events can cross.
 * Refuses unrecognized statuses and untrusted arbitrary strings.
 * @returns {{ok:true,event:object}|{ok:false,reason:string}}
 */
export function projectWayglassObserverEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'invalid-input' };
  if (input.consent_scope !== 'observer-display' || input.consent_status !== 'granted') {
    return { ok: false, reason: 'consent-not-granted' };
  }
  const kind = input.event_kind;
  const status = input.verification_state;
  if (!EVENT_KINDS.has(kind) || !VERIFICATION.has(status)) return { ok: false, reason: 'unrecognized-event' };
  const source = identifier(input.source_ref);
  const room = identifier(input.room_id);
  const observed = time(input.observed_at);
  if (!source || !room || !observed) return { ok: false, reason: 'missing-provenance' };
  if (kind === 'return-verified' && status !== 'verified') return { ok: false, reason: 'unverified-return' };

  // Deliberately exclude body, prompt, names, secrets, DEEP raw vectors and private receipts.
  const event = Object.freeze({
    schema: WAYGLASS_OBSERVER_LIGHT_SCHEMA,
    source_ref: source,
    event_kind: kind,
    observed_at: observed,
    verification_state: status,
    room_id: room,
    visual_cue: status === 'failed' ? 'dim' : status === 'verified' ? 'steady' : 'unresolved',
    motion_policy: 'reduced-by-default',
  });
  return { ok: true, event };
}

/** A deterministic glyph seed for local renderers, not a numerical observation. */
export function observerGlyphSeed(event) {
  if (!event || event.schema !== WAYGLASS_OBSERVER_LIGHT_SCHEMA) return null;
  const key = [event.source_ref, event.room_id, event.event_kind, event.verification_state].join('|');
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  return hash >>> 0;
}
