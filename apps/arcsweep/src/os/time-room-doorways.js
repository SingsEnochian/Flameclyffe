export const TIME_ROOM_DOORWAY_SCHEMA = 'arcsweep.time-room-doorway/v1';
export const TIME_ROOM_DOORWAY_SET_SCHEMA = 'arcsweep.time-room-doorway-set/v1';
export const TIME_ROOM_DOORWAY_RECEIPT_SCHEMA = 'arcsweep.time-room-doorway-receipt/v1';

const HELD_READINESS = new Set(['resting', 'waiting']);

const DOORWAY_MAP = Object.freeze({
  'terra-aeterna': Object.freeze([
    { room: 'worlds', label: 'World Door', purpose: 'Open the active world surface for settlement, place, and continuity work.' },
    { room: 'records', label: 'Canon Door', purpose: 'Open records for canon return, receipts, and continuity evidence.' },
    { room: 'forge', label: 'Forge Door', purpose: 'Open Forge when world hum, glyph, or embodied making is the ripe next move.' },
  ]),
  'luna-who-called-down-the-moon': Object.freeze([
    { room: 'scripts', label: 'Story Door', purpose: 'Open Scripts for Moonmere scenes, pack law, healing arcs, and roleplay.' },
    { room: 'records', label: 'Canon Door', purpose: 'Open Records for Luna law, moon phases, names, and continuity.' },
  ]),
  'taveren-vaen': Object.freeze([
    { room: 'scripts', label: 'Pattern Door', purpose: 'Open Scripts for Kestrelle, Dreaming, Stones, and Resonant bond scenes.' },
    { room: 'records', label: 'Archive Door', purpose: 'Open Records for later-Turning canon, Pattern receipts, and weave continuity.' },
  ]),
  'star-trek-reboot-160': Object.freeze([
    { room: 'scripts', label: 'Bridge Door', purpose: 'Open Scripts for shipboard scenes, mission beats, and roleplay.' },
    { room: 'records', label: 'Ship Log Door', purpose: 'Open Records for stardates, mission logs, crew continuity, and evidence.' },
  ]),
  'bluebird-grove': Object.freeze([
    { room: 'records', label: 'Grove Record Door', purpose: 'Open Records for Bluebird questions, returns, ghost-tones, and continuity.' },
    { room: 'commons', label: 'Presence Door', purpose: 'Open House Commons when the next move is relational conversation rather than archive work.' },
  ]),
  hearthweave: Object.freeze([
    { room: 'commons', label: 'House Door', purpose: 'Open House Commons for co-presence, resident greeting, and Hearthweave conversation.' },
    { room: 'worlds', label: 'Hearth Door', purpose: 'Open Worlds for room-state, Templehouse, and Hearthweave world work.' },
  ]),
  'observer-chamber': Object.freeze([
    { room: 'deep-observer', label: 'Observatory Door', purpose: 'Open DEEP / Field for PREMAQC, Observer, and convergence inspection.' },
    { room: 'records', label: 'Evidence Door', purpose: 'Open Records for receipts, chronology, and replay evidence.' },
  ]),
  'time-room': Object.freeze([
    { room: 'portal', label: 'Return Door', purpose: 'Return to the Portal without changing the active world.' },
    { room: 'worlds', label: 'World Door', purpose: 'Open Worlds when the clocks say the next move belongs to world-state.' },
    { room: 'records', label: 'Record Door', purpose: 'Open Records when the next move is continuity, evidence, or canon review.' },
  ]),
  default: Object.freeze([
    { room: 'worlds', label: 'World Door', purpose: 'Open Worlds to name and register the local universe.' },
    { room: 'records', label: 'Record Door', purpose: 'Open Records to establish continuity and arrival evidence.' },
  ]),
});

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  return Object.freeze(clone(value));
}

function text(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function doorwayId(universeId, room) {
  return `doorway:${text(universeId, 120) || 'unknown'}:${text(room, 80) || 'unknown'}`;
}

function readinessState(snapshot = {}) {
  return text(snapshot?.readiness?.state, 80) || 'unknown';
}

function reasonForDoor(snapshot = {}, spec = {}, index = 0) {
  const canHappen = Array.isArray(snapshot.can_happen) ? snapshot.can_happen.filter(Boolean) : [];
  const named = canHappen[index] || canHappen[0] || null;
  if (named) return `${spec.purpose} The Time Room currently names “${text(named, 160)}” as possible.`;
  return spec.purpose;
}

export function createTimeRoomDoorwaySet(snapshot = {}) {
  if (snapshot?.schema !== 'arcsweep.time-room-snapshot/v1') {
    throw new Error('Time Room doorway planning requires a time-room snapshot/v1.');
  }

  const universeId = text(snapshot.universe_id, 120) || 'time-room';
  const state = readinessState(snapshot);
  const held = HELD_READINESS.has(state);
  const source = DOORWAY_MAP[universeId] || DOORWAY_MAP.default;

  const doorways = source.map((spec, index) => freeze({
    schema: TIME_ROOM_DOORWAY_SCHEMA,
    doorway_id: doorwayId(universeId, spec.room),
    universe_id: universeId,
    destination_room: spec.room,
    label: spec.label,
    purpose: spec.purpose,
    reason: reasonForDoor(snapshot, spec, index),
    rank: index + 1,
    recommended: index === 0 && !held,
    enterable: !held,
    requires_confirmation: true,
    autonomous_entry: false,
    held_reason: held
      ? `The Time Room is ${state}; the door stays visible but does not open until the human chooses a later reading.`
      : null,
  }));

  return freeze({
    schema: TIME_ROOM_DOORWAY_SET_SCHEMA,
    universe_id: universeId,
    generated_at: snapshot.generated_at || null,
    readiness: freeze({
      state,
      pressure: snapshot?.readiness?.pressure || 'unknown',
      held,
    }),
    selection_policy: 'human-confirmed-only',
    autonomous_entry: false,
    doorways,
  });
}

export function createTimeRoomDoorwayReceipt({
  doorway,
  snapshot,
  navigation_receipt = null,
  origin_room = null,
} = {}, { now = () => new Date() } = {}) {
  if (doorway?.schema !== TIME_ROOM_DOORWAY_SCHEMA) throw new Error('Doorway receipt requires a time-room doorway/v1.');
  if (snapshot?.schema !== 'arcsweep.time-room-snapshot/v1') throw new Error('Doorway receipt requires a time-room snapshot/v1.');

  const navigationOutput = navigation_receipt?.output || {};
  const contextCapsuleId = navigationOutput.context_capsule_id || null;
  const entered = navigation_receipt?.status === 'applied' && navigationOutput.ok === true;

  return freeze({
    schema: TIME_ROOM_DOORWAY_RECEIPT_SCHEMA,
    doorway_id: doorway.doorway_id,
    universe_id: doorway.universe_id,
    origin_room: origin_room || snapshot?.context?.room || null,
    destination_room: doorway.destination_room,
    label: doorway.label,
    status: entered ? 'entered' : 'not-entered',
    human_confirmed: true,
    autonomous_entry: false,
    navigation_call_id: navigation_receipt?.call_id || null,
    context_capsule_id: contextCapsuleId,
    entered_at: entered ? now().toISOString() : null,
  });
}

export function doorwayPatch({ doorway, snapshot, context = {} } = {}) {
  if (doorway?.schema !== TIME_ROOM_DOORWAY_SCHEMA) throw new Error('Doorway patch requires a time-room doorway/v1.');
  const activeWorld = context.active_world_id || context.world_id || null;
  const worldId = snapshot?.universe_id === 'time-room' ? activeWorld : snapshot?.universe_id || activeWorld;
  return freeze({
    world_id: worldId || null,
    project_id: context.active_project_id || context.project_id || null,
    scene_id: context.active_scene_id || context.scene_id || null,
    document_id: context.active_document_id || context.document_id || null,
    current_goal: `Time Room doorway: ${doorway.label} · ${doorway.purpose}`,
    relevant_objects: [doorway.doorway_id, `universe:${doorway.universe_id}`],
    open_work: [],
    authority_boundary: {
      source: 'time-room-doorway',
      human_confirmation_required: true,
      autonomous_entry: false,
      canon_promotion: false,
    },
  });
}
