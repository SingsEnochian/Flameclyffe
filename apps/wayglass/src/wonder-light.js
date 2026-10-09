// Source-backed optical cues for Wayglass; no participant/interiority inference.
export const WONDER_LIGHT_SCHEMA = 'wayglass.wonder-light/v0.1';
export const WONDER_LIGHT_EVENT = 'wayglass:commons-lifecycle';
const MAX_EVENTS = 12;
const states = Object.freeze({
  'route-started': ['pending', 'violet', 'route launch observed'],
  'route-completed': ['transport-confirmed', 'teal', 'model transport completed; answer not verified'],
  'route-failed': ['failed', 'rose', 'model transport failed'],
  'commons-pending': ['pending', 'violet', 'Commons request pending'],
  'commons-accepted': ['http-confirmed', 'ice', 'Commons host accepted the request; persistence not independently checked'],
  'commons-stored': ['stored-receipt', 'teal', 'Commons record returned by authenticated host'],
  'commons-failed': ['failed', 'rose', 'Commons request failed'],
  'commons-unavailable': ['unavailable', 'amber', 'Commons host or sign-in unavailable'],
  'wonder-open': ['authored-open-question', 'gold', 'unresolved Wonder question, not a fact'],
  'return-candidate': ['unverified-continuity', 'gold', 'return candidate: continuity remains unverified; no resumption or relationship claim'],
  'synthetic-demo': ['synthetic', 'violet', 'synthetic demonstration only'],
});
const clean = (value, max=180) => String(value ?? '').trim().slice(0, max);
const entries = [];
const listeners = new Set();

export function createWonderLightEvent({ kind, source_ref, event_id, observed_at, room_id } = {}) {
  const rule = states[kind];
  if (!rule) throw new Error('Unknown Wonder light event kind');
  const source = clean(source_ref);
  if (!source) throw new Error('Wonder light requires a source reference');
  if (kind === 'commons-stored' && !source.startsWith('commons-entry:')) {
    throw new Error('Stored Commons light requires a persisted entry reference');
  }
  return Object.freeze({
    schema: WONDER_LIGHT_SCHEMA, kind,
    source_ref: source, event_id: clean(event_id) || source,
    observed_at: clean(observed_at) || new Date().toISOString(),
    room_id: clean(room_id) || 'wayglass:living-observer',
    verification_state: rule[0], visual_cue: rule[1], boundary: rule[2],
  });
}

export function subscribeWonderLight(listener) {
  if (typeof listener !== 'function') throw new TypeError('Wonder listener must be a function');
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function readWonderLights() { return entries.slice(); }
export function publishWonderLight(input) {
  const event = createWonderLightEvent(input);
  if (entries.some(x => x.event_id === event.event_id && x.kind === event.kind)) return event;
  entries.unshift(event);
  entries.length = Math.min(entries.length, MAX_EVENTS);
  // An optical observer must never change the success/failure of a Commons write.
  for (const listener of listeners) { try { listener(event); } catch { /* presentation failure is isolated */ } }
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
    amber: '#f1ca91', gold: '#e7cc8d', ice: '#a5c8f4',
  };
  const reduced = lowStim === true;
  return Object.freeze({
    colour: palette[event.visual_cue] || '#accbd0',
    phase: reduced ? 0.5 : Math.min(1, Math.max(0, ageMs / 1700)),
    dashed: ['authored-open-question','synthetic','unavailable','unverified-continuity'].includes(event.verification_state),
    intensity: ['failed','unavailable'].includes(event.verification_state) ? 0.42 : 0.64,
    label: event.kind.replaceAll('-', ' ') + ' · ' + event.verification_state,
  });
}
export function drawWonderLight(g, event, timeMs, { reducedMotion=false, lowStim=false, width=820, height=820, lens=null } = {}) {
  const still = reducedMotion || lowStim;
  const config = wonderLightVisual(event, Math.max(0,timeMs), still);
  if (!config || !g) return;
  const cx=width/2,cy=height/2,progress=config.phase;
  const radius=still?338:180+158*progress;
  const bend=still?0:0.015;
  const ox=Number.isFinite(lens?.x)?Math.max(-10,Math.min(10,(lens.x-cx)*bend)):0;
  const oy=Number.isFinite(lens?.y)?Math.max(-10,Math.min(10,(lens.y-cy)*bend)):0;
  const fading=still?0.4:1-progress*.72;
  g.save();
  if(config.dashed && typeof g.setLineDash==='function')g.setLineDash([10,15]);
  // Front rim, refracted inner interface and back rim: optical depth, not a flat stroke.
  const shells=still ? [0,1] : [0,1,2];
  for(const layer of shells){
    const shift=layer===0?0:layer===1?-7:7;
    g.beginPath();
    g.arc(cx+ox*layer*.5,cy+oy*layer*.5,radius+shift,0,Math.PI*2);
    g.lineWidth=layer===0?3.5:layer===1?1.35:5;
    g.strokeStyle=config.colour;
    g.globalAlpha=config.intensity*fading*(layer===0?1:layer===1?.52:.13);
    g.shadowColor=config.colour;
    g.shadowBlur=still?0:layer===0?18:6;
    g.stroke();
  }
  g.restore();
}
export function resetWonderLightsForTest() { entries.length=0; }
