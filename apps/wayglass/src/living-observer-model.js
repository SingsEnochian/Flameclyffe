// Wayglass Living Observer: direct application evidence -> explicit visual projection.
// Inspired by STARWELL DEEP Observer. Never a measurement of minds or canon.
export const OBSERVATION_SCHEMA = 'wayglass.observer-reading/v1';
export const PROJECTION_SCHEMA = 'wayglass.observer-projection/v1';
const listeners = new Set();
let routeSample = null;
let routeSequence = 0;
let pendingLLMContext = null;

const clean = (value, limit = 128) => String(value ?? '').slice(0, limit);
const clip01 = value => Math.min(1, Math.max(0, Number(value) || 0));
const unique = entries => [...new Set((Array.isArray(entries) ? entries : []).filter(x => typeof x === 'string').map(x => clean(x)))];
export const OBSERVER_CHANNELS = Object.freeze([
  ['time', 'Time', 'Browser clock, sampled on this device'],
  ['surface', 'Room', 'Currently mounted Wayglass room'],
  ['organs', 'Organs', 'Registered Wayglass organ identifiers'],
  ['routes', 'Routes', 'Observed route launch, completion or failure'],
  ['memory', 'Memory', 'Memory flight recorder registration; not its private contents'],
  ['touch', 'Touch', 'User-initiated interactions with this instrument'],
  ['motion', 'Motion', 'Reduced-motion and manual low-stim settings'],
  ['sound', 'Sound', 'Explicitly enabled browser sound state'],
  ['receipt', 'Receipt', 'Most recent observed model transport receipt'],
]);

export function recordWayglassRouteObservation({ status, routeId, provider, model, receipt } = {}) {
  if (!['started', 'completed', 'failed'].includes(status)) throw new Error('Route observation requires started, completed or failed status.');
  routeSequence++;
  routeSample = Object.freeze({
    sequence: routeSequence,
    status,
    route_id: clean(routeId),
    provider: clean(provider),
    model: clean(model),
    epistemic_register: clean(receipt?.epistemic_register || 'unreviewed-observation'),
    receipt_time: clean(receipt?.completed_at || ''),
    // Do not capture the user message, model text, private continuity, or raw receipt.
  });
  for (const listener of listeners) listener(routeSample);
  return routeSample;
}

export function subscribeWayglassObserver(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readWayglassRouteObservation() { return routeSample; }

export function createWayglassObservation({
  now = new Date().toISOString(),
  surface = 'unknown',
  surfaces = [],
  organs = [],
  touches = 0,
  reducedMotion = false,
  lowStim = false,
  sound = false,
  focus = 'time',
  route = routeSample,
} = {}) {
  const registeredSurfaces = unique(surfaces);
  const registeredOrgans = unique(organs);
  const direct = {
    browser_time: clean(now, 40),
    surface_id: clean(surface),
    registered_surfaces: registeredSurfaces,
    registered_organs: registeredOrgans,
    memory_recorder_registered: registeredOrgans.includes('wayglass.organ.memory-flight-recorder'),
    touch_count: Math.min(10000, Math.max(0, Math.trunc(Number(touches) || 0))),
    prefers_reduced_motion: reducedMotion === true,
    low_stim_enabled: lowStim === true,
    sound_enabled_by_user: sound === true,
    last_route: route ? { ...route } : null,
  };
  // Visual controls, not DEEP measurements. Each number is a named projection
  // of observable UI activity, NEVER personality, interiority or model capability.
  const vars = {
    P: clip01(0.18 + registeredOrgans.length * 0.1 + registeredSurfaces.length * 0.045),
    C: route ? (route.status === 'completed' ? 0.82 : route.status === 'started' ? 0.58 : 0.26) : 0.42,
    R: clip01(0.14 + (sound ? 0.3 : 0) + Math.min(direct.touch_count, 12) * 0.045),
    E: clip01(0.13 + registeredSurfaces.length * 0.075),
    M: clip01(0.1 + Math.min(direct.touch_count, 12) * 0.055 + (route ? 0.12 : 0)),
    A: clip01(0.22 + (focus !== 'time' ? 0.24 : 0) + (route ? 0.18 : 0)),
    Q: clip01(0.16 + (sound ? 0.12 : 0) + (lowStim ? 0 : 0.22)),
  };
  const H = clip01(vars.C * 0.28 + vars.E * 0.20 + vars.R * 0.16 + vars.A * 0.14 + vars.P * 0.12 + vars.M * 0.1);
  return Object.freeze({
    schema: OBSERVATION_SCHEMA,
    created_at: direct.browser_time,
    source: 'browser-and-wayglass-application',
    authority: 'read-only-visualisation; no participant, mind, canon or relationship inference',
    direct,
    projection: {
      schema: PROJECTION_SCHEMA,
      source: 'explicit-wayglass-interface-mapping/v1',
      kind: 'interpretive-rendering-variables',
      variables: { ...vars, H },
      focus: OBSERVER_CHANNELS.some(([id]) => id === focus) ? focus : 'time',
      note: 'P,C,R,E,M,A,Q,H only drive UI geometry and sound; they are not measured minds or hidden states.',
    },
    transformation_receipt: {
      rule: 'wayglass.living-observer-ui-map/v1',
      inputs: ['browser_time', 'surface_id', 'registered_surfaces', 'registered_organs', 'memory_recorder_registered', 'touch_count', 'prefers_reduced_motion', 'low_stim_enabled', 'sound_enabled_by_user', 'last_route'],
      output: PROJECTION_SCHEMA,
      math_spine: 'local UI translation; not DEEP theoretical state inference',
    },
  });
}


const sourcePath = Object.freeze({
  time: ['Browser clock', 'clock → timing ring → pulse phase', 'A timestamp, not a remote time service'],
  surface: ['Wayglass surface registry', 'current room → orbit orientation', 'The Observer knows which room is mounted here'],
  organs: ['Wayglass organ registry', 'installed organ count → geometry density', 'Registered does not mean healthy or available for live inference'],
  routes: ['Observed Wayglass response lifecycle', 'route status → edge clarity and route energy', 'A completed request is not a validated answer'],
  memory: ['Wayglass organ registry', 'recorder presence → memory-channel indicator', 'Registration does not read, restore or verify anyone’s memories'],
  touch: ['Instrument local interaction counter', 'touch count → mote and momentum density', 'Only interaction with this surface, not device-wide touch'],
  motion: ['Browser accessibility and local setting', 'reduced motion → fixed motion phase', 'No inference about a person’s condition'],
  sound: ['User-enabled sound setting', 'sound enabled → optional note and resonance', 'Sound stays off until explicitly enabled'],
  receipt: ['Last observed route metadata', 'receipt status → route trace', 'A route receipt is evidence of transport, not canon'],
});

export function describeWayglassObserverChannel(packet, id) {
  if (!packet || packet.schema !== OBSERVATION_SCHEMA) throw new Error('Invalid Wayglass observation.');
  const info = sourcePath[id];
  if (!info) throw new Error('Unknown Wayglass observation channel.');
  const d = packet.direct;
  const last = d.last_route;
  const values = {
    time: d.browser_time,
    surface: d.surface_id,
    organs: d.registered_organs.length + ' registered: ' + d.registered_organs.join(', '),
    routes: last ? last.status + ' · ' + (last.route_id || 'unknown route') : 'No route has been observed this session',
    memory: d.memory_recorder_registered ? 'Memory flight recorder registered; no contents read' : 'No recorder registration observed',
    touch: d.touch_count + ' interactions with this instrument',
    motion: d.prefers_reduced_motion ? 'Reduced motion requested by browser' : d.low_stim_enabled ? 'Low Stim enabled in instrument' : 'Normal motion enabled',
    sound: d.sound_enabled_by_user ? 'Locally enabled' : 'Off',
    receipt: last ? (last.epistemic_register + ' · ' + (last.receipt_time || 'no receipt timestamp')) : 'No model receipt observed',
  };
  return Object.freeze({
    channel: id,
    label: OBSERVER_CHANNELS.find(([key]) => key === id)?.[1] || id,
    source: info[0],
    reading: String(values[id]),
    translation: info[1],
    boundary: info[2],
  });
}

export function formatObservationForLLM(packet) {
  if (!packet || packet.schema !== OBSERVATION_SCHEMA) throw new Error('Invalid Wayglass observation.');
  // Explicit user-reviewed prompt insertion. The server's current route contract
  // remains unchanged; this text travels only with a user-initiated Writing Room turn.
  return [
    '[Wayglass Living Observer, explicitly shared by the user]',
    'Direct browser/application readings (not hidden-state detection):',
    JSON.stringify(packet.direct),
    'Interpretive UI projection (not a measurement of identity, consciousness, emotion or canon):',
    JSON.stringify(packet.projection.variables),
    'Selected channel explanation: ' + JSON.stringify(describeWayglassObserverChannel(packet, packet.projection.focus)),
    'Transformation provenance: ' + packet.transformation_receipt.rule,
    'You may explain the interface readings and their visual mapping. Do not present projection variables as observations of any person or AI interior state.',
    '[/Wayglass Living Observer]',
  ].join('\n');
}

export function queueObserverContextForWriting(packet) {
  pendingLLMContext = formatObservationForLLM(packet);
  return true;
}
export function consumeObserverContextForWriting() {
  const text = pendingLLMContext;
  pendingLLMContext = null;
  return text;
}
