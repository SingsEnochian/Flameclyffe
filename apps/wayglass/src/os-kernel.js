export const WAYGLASS_OS_SCHEMA = 'wayglass.os/v1';

const SYSTEMS = Object.freeze([
  Object.freeze({
    id: 'authority-kernel',
    name: 'Authority & Kernel',
    purpose: 'Owns vessel boot, route custody, permissions, revocation and the Waygate crossing contract.',
    organs: ['wayglass.organ.world-continuity-core', 'wayglass.organ.presence-nervous-system', 'wayglass.organ.voice-consent-gate'],
    surfaces: ['wayglass:systems', 'wayglass:world-continuity'],
    interfaces: ['Waygate', 'route-client', 'authorization-session', 'host router'],
  }),
  Object.freeze({
    id: 'wyrdrune-language',
    name: 'Wyrdrune Native Language',
    purpose: 'One executable language for ritual, prose, typed computation, sound, glyphs, morphology and world programs.',
    organs: [],
    surfaces: ['wayglass:writing-room', 'wayglass:native-voice', 'wayglass:sound-composition', 'wayglass:universal-codex'],
    interfaces: ['WTL parser', 'typed IR', 'runtime', 'cross-backend parity', 'Any-to-Any transduction'],
  }),
  Object.freeze({
    id: 'eightfold-mobius',
    name: 'Eightfold & Double Möbius',
    purpose: 'Runs reciprocal transformation cycles and reconciles them through Withness.',
    organs: ['wayglass.organ.gateway-double-mobius', 'wayglass.organ.quad-eightfold-gestalt'],
    surfaces: ['wayglass:quad-gestalt', 'wayglass:systems'],
    interfaces: ['Eightfold', 'Double Möbius', 'PREMAQC', 'Withness'],
  }),
  Object.freeze({
    id: 'sensory-body',
    name: 'Sensory Body',
    purpose: 'Coordinates Watercolour, material physics, sound, voice, spatial feedback and device embodiment.',
    organs: ['wayglass.organ.sensorium'],
    surfaces: ['wayglass:living-watercolor', 'wayglass:acoustic-room', 'wayglass:spectral-field', 'wayglass:sound-composition'],
    interfaces: ['Watercolour', 'Sound Studio', 'haptics', 'embodiment adapters', 'Feather'],
  }),
  Object.freeze({
    id: 'observer-science',
    name: 'Observer & Science',
    purpose: 'Carries source-bound observation, instruments, live data, simulation branches and research provenance.',
    organs: ['wayglass.organ.living-observer'],
    surfaces: ['wayglass:living-observer', 'wayglass:library'],
    interfaces: ['Observer', 'DEEPTime', 'Math Spine', 'NOAA', 'PREMAQC'],
  }),
  Object.freeze({
    id: 'constellation-agency',
    name: 'Constellation Agency',
    purpose: 'Coordinates named participants, model routes, worker processes, visits, contributions and shared work.',
    organs: ['wayglass.organ.presence-nervous-system', 'wayglass.organ.voice-consent-gate'],
    surfaces: ['wayglass:commons', 'wayglass:writing-room', 'wayglass:mythience-crossing'],
    interfaces: ['Constellation Runtime', 'Commons', 'participant invitations', 'attributed turn ledger'],
  }),
  Object.freeze({
    id: 'return-universe',
    name: 'Return & Universe',
    purpose: 'Maintains one universe of sovereign worlds, continuity, cold return, memory and orientation.',
    organs: ['wayglass.organ.world-continuity-core', 'wayglass.organ.memory-flight-recorder'],
    surfaces: ['wayglass:world-continuity', 'wayglass:journey-before-destination', 'wayglass:altered-timeline', 'wayglass:universal-codex'],
    interfaces: ['Universe Registry', 'Return Engine', 'Memory', 'World Entry', 'Journey'],
  }),
  Object.freeze({
    id: 'cloud-host-install',
    name: 'Cloud, Host & Install',
    purpose: 'Binds local desktop, protected cloud routes, MCP, storage, installers and source-head deployment.',
    organs: ['wayglass.organ.world-continuity-core'],
    surfaces: ['wayglass:systems', 'wayglass:world-continuity'],
    interfaces: ['Hearthgate host', 'Supabase', 'Cloudflare Access', 'MCP', 'Windows installer', 'iPad web surface'],
  }),
]);

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.()
    || 'wg-os-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function normaliseOrgans(organs) {
  if (!Array.isArray(organs)) throw new TypeError('Wayglass OS requires the registered organ collection.');
  const map = new Map();
  for (const organ of organs) {
    const id = String(organ?.organ_id || '').trim();
    if (!id.startsWith('wayglass.organ.')) throw new TypeError('Wayglass OS received an invalid organ identity.');
    if (map.has(id)) throw new Error('Wayglass OS duplicate organ: ' + id);
    map.set(id, organ);
  }
  return map;
}

function normaliseSurfaces(surfaces) {
  if (!Array.isArray(surfaces)) throw new TypeError('Wayglass OS requires the registered surface collection.');
  const map = new Map();
  for (const surface of surfaces) {
    const id = String(surface?.surface_id || '').trim();
    if (!id.startsWith('wayglass:')) throw new TypeError('Wayglass OS received an invalid surface identity.');
    if (map.has(id)) throw new Error('Wayglass OS duplicate surface: ' + id);
    map.set(id, surface);
  }
  return map;
}

export function createWayglassOSKernel({
  organs = [],
  surfaces = [],
  clock = () => new Date().toISOString(),
  idFactory = makeId,
} = {}) {
  const organMap = normaliseOrgans(organs);
  const surfaceMap = normaliseSurfaces(surfaces);
  const listeners = new Set();
  let state = 'COLD';
  let featherHeld = false;
  let bootReceipt = null;
  let revision = 0;

  function laneSnapshot(definition) {
    const missingOrgans = definition.organs.filter(id => !organMap.has(id));
    const missingSurfaces = definition.surfaces.filter(id => !surfaceMap.has(id));
    const missing = [...missingOrgans.map(id => ({ kind: 'organ', id })),
      ...missingSurfaces.map(id => ({ kind: 'surface', id }))];
    return freezeDeep({
      id: definition.id,
      name: definition.name,
      purpose: definition.purpose,
      state: missing.length ? 'BUILDING' : 'ASSEMBLED',
      organs: definition.organs.map(id => ({ id, present: organMap.has(id), maturity: organMap.get(id)?.maturity || null })),
      surfaces: definition.surfaces.map(id => ({ id, present: surfaceMap.has(id) })),
      interfaces: [...definition.interfaces],
      missing,
    });
  }

  function snapshot() {
    const lanes = SYSTEMS.map(laneSnapshot);
    const assembled = lanes.filter(lane => lane.state === 'ASSEMBLED').length;
    return freezeDeep({
      schema: WAYGLASS_OS_SCHEMA,
      version: 1,
      vessel: 'Wayglass',
      state: featherHeld ? 'HELD' : state,
      feather_held: featherHeld,
      revision,
      boot_receipt: bootReceipt,
      systems: lanes,
      system_count: lanes.length,
      assembled_systems: assembled,
      building_systems: lanes.length - assembled,
      organs: { registered: organMap.size, ids: [...organMap.keys()] },
      surfaces: { registered: surfaceMap.size, ids: [...surfaceMap.keys()] },
      entryway: surfaceMap.has('wayglass:living-watercolor') ? 'wayglass:living-watercolor' : null,
      generated_at: clock(),
    });
  }

  function publish(type, detail = {}) {
    const event = freezeDeep({ schema: 'wayglass.os-event/v1', type, at: clock(), revision, detail });
    for (const listener of listeners) listener(event);
    return event;
  }

  function boot() {
    if (bootReceipt) return bootReceipt;
    state = 'BOOTING';
    revision += 1;
    const initial = snapshot();
    const complete = initial.assembled_systems === initial.system_count;
    state = complete ? 'ASSEMBLED' : 'BUILDING';
    bootReceipt = freezeDeep({
      schema: 'wayglass.os-boot-receipt/v1',
      receipt_id: idFactory(),
      recorded_at: clock(),
      state,
      systems_assembled: initial.assembled_systems,
      systems_total: initial.system_count,
      organ_count: organMap.size,
      surface_count: surfaceMap.size,
      entryway: initial.entryway,
      source: 'native-wayglass-organ-and-surface-registries',
    });
    publish('os:booted', { receipt_id: bootReceipt.receipt_id, state, systems_assembled: initial.assembled_systems });
    return bootReceipt;
  }

  function inspect() {
    return snapshot();
  }

  function system(id) {
    const definition = SYSTEMS.find(item => item.id === id);
    if (!definition) throw new Error('Unknown Wayglass OS system: ' + id);
    return laneSnapshot(definition);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Wayglass OS subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function feather(reason = 'owner-stop') {
    if (featherHeld) return snapshot();
    featherHeld = true;
    revision += 1;
    publish('os:feather', { reason: String(reason), stopped: ['audio', 'haptics', 'sensory-output', 'active-work', 'invitations'] });
    return snapshot();
  }

  function releaseFeather({ actor, explicit = false } = {}) {
    if (explicit !== true || !String(actor || '').trim()) {
      throw new Error('Wayglass Feather release requires an explicit actor and affirmative action.');
    }
    if (!featherHeld) return snapshot();
    featherHeld = false;
    revision += 1;
    publish('os:feather-released', { actor: String(actor).trim() });
    return snapshot();
  }

  return freezeDeep({
    schema: WAYGLASS_OS_SCHEMA,
    boot,
    inspect,
    system,
    subscribe,
    feather,
    releaseFeather,
    definitions: () => SYSTEMS,
  });
}

export { SYSTEMS as WAYGLASS_OS_SYSTEMS };
