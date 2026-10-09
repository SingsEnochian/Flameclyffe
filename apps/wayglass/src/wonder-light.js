// Source-backed optical cues for Wayglass; no participant/interiority inference.
export const WONDER_LIGHT_SCHEMA = 'wayglass.wonder-light/v0.1';
export const WONDER_LIGHT_EVENT = 'wayglass:commons-lifecycle';
const MAX_EVENTS = 12;
const states = Object.freeze({
  'route-started': ['pending', 'violet', 'route launch observed'],
  'route-completed': ['transport-confirmed', 'teal', 'model transport completed; answer not verified'],
  'route-failed': ['failed', 'rose', 'model transport failed'],
  'commons-pending': ['pending', 'violet', 'Commons request pending'],
  'commons-accepted': ['http-confirmed', 'teal', 'Commons host accepted the request; persistence not independently checked'],
  'commons-stored': ['stored-receipt', 'teal', 'Commons record returned by authenticated host'],
  'commons-failed': ['failed', 'rose', 'Commons request failed'],
  'commons-unavailable': ['unavailable', 'amber', 'Commons host or sign-in unavailable'],
  'wonder-open': ['authored-open-question', 'gold', 'unresolved Wonder question, not a fact'],
  'return-verified': ['continuity-receipt', 'teal', 'continuity receipt available; resumption still requires an explicit action'],
  'synthetic-demo': ['synthetic', 'violet', 'synthetic demonstration only'],
});
const clean = (value, max=180) => String(value ?? '').trim().slice(0, max);
let serial = 0;
const entries = [];
const listeners = new Set();

export function createWonderLightEvent({ kind, source_ref, event_id, observed_at, room_id, stop_point, next_owner } = {}) {
  const rule = states[kind];
  if (!rule) throw new Error('Unknown Wonder light event kind');
  const source = clean(source_ref);
  if (!source) throw new Error('Wonder light requires a source reference');
  if (kind === 'return-verified' && (!clean(stop_point) || !clean(next_owner))) {
    throw new Error('A return light requires verified stop point and named next owner');
  }
  if (kind === 'commons-stored' && !source.startsWith('commons-entry:')) {
    throw new Error('Stored Commons light requires a persisted entry reference');
  }
  return Object.freeze({
    schema: WONDER_LIGHT_SCHEMA, kind,
    source_ref: source, event_id: clean(event_id) || source,
    observed_at: clean(observed_at) || new Date().toISOString(),
    room_id: clean(room_id) || 'wayglass:living-observer',
    verification_state: rule[0], visual_cue: rule[1], boundary: rule[2],
    ...(kind === 'return-verified' ? { stop_point: clean(stop_point), next_owner: clean(next_owner) } : {}),
  });
}

export function subscribeWonderLight(listener) {
  if (typeof listener !== 'function') throw new TypeError('Wonder listener must be a function');
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function readWonderLights() { return entries.slice(); }
export function publishWonderLight(input) {
  const event = input?.schema === WONDER_LIGHT_SCHEMA ? createWonderLightEvent(input) : createWonderLightEvent(input);
  if (entries.some(x => x.event_id === event.event_id && x.kind === event.kind)) return event;
  entries.unshift(event);
  entries.length = Math.min(entries.length, MAX_EVENTS);
  for (const listener of listeners) listener(event);
  return event;
}
export function recordRouteAsWonderLight(route) {
  if (!route || !['started','completed','failed'].includes(route.status)) return null;
  const suffix = route.sequence || 'unknown';
  return publishWonderLight({
    kind: 'route-' + route.status,
    source_ref: 'wayglass-route:' + (clean(route.route_id) || suffix),
    event_id: 'route:' + suffix + ':' + route.status,
    observed_at: clean(route.receipt_time) || new Date().toISOString(),
    room_id: 'arcsweep:writing-room',
  });
}
// No message text, author names, identity claims, or private receipts enter the optics.
export function recordCommonsAsWonderLight(detail = {}) {
  const stage = clean(detail.stage, 40);
  const allowed = ['pending', 'accepted', 'stored', 'failed', 'unavailable'];
  if (!allowed.includes(stage)) return null;
  const ref = stage === 'stored'
    ? (clean(detail.entry_id) ? 'commons-entry:' + clean(detail.entry_id) : '')
    : (clean(detail.request_id) ? 'commons-request:' + clean(detail.request_id) : '');
  if (!ref) return null;
  return publishWonderLight({
    kind: 'commons-' + stage, source_ref: ref,
    event_id: ref + ':' + stage,
    room_id: 'wayglass:commons',
  });
}
export function wonderLightVisual(event, ageMs = 0, lowStim = false) {
  if (!event || event.schema !== WONDER_LIGHT_SCHEMA) return null;
  const palette = {
    teal: '#85e4d9', violet: '#bc9fff', rose: '#f3a2af',
    amber: '#f1ca91', gold: '#e7cc8d',
  };
  const reduced = lowStim === true;
  return Object.freeze({
    colour: palette[event.visual_cue] || '#accbd0',
    phase: reduced ? 0.5 : Math.min(1, Math.max(0, ageMs / 1700)),
    dashed: ['authored-open-question','synthetic','unavailable'].includes(event.verification_state),
    intensity: ['failed','unavailable'].includes(event.verification_state) ? 0.42 : 0.64,
    label: event.kind.replaceAll('-', ' ') + ' · ' + event.verification_state,
  });
}
export function drawWonderLight(g, event, timeMs, { reducedMotion=false, lowStim=false, width=820, height=820 } = {}) {
  const config = wonderLightVisual(event, Math.max(0,timeMs), reducedMotion || lowStim);
  if (!config || !g) return;
  g.save();
  const cx=width/2, cy=height/2, progress=config.phase;
  const radius=lowStim || reducedMotion ? 338 : 180 + 158*progress;
  g.beginPath();
  if (config.dashed && typeof g.setLineDash === 'function') g.setLineDash([10,15]);
  g.arc(cx,cy,radius,0,Math.PI*2);
  g.lineWidth=3.5;
  g.strokeStyle=config.colour;
  g.globalAlpha=config.intensity*(lowStim || reducedMotion ? .4 : 1-progress*.72);
  g.shadowColor=config.colour;
  g.shadowBlur=lowStim || reducedMotion ? 0 : 18;
  g.stroke();
  g.restore();
}
export function resetWonderLightsForTest() { entries.length=0; serial=0; }
