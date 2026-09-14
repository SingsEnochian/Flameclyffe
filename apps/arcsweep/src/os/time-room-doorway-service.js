import {
  TIME_ROOM_DOORWAY_RECEIPT_SCHEMA,
  createTimeRoomDoorwayReceipt,
  createTimeRoomDoorwaySet,
  doorwayPatch,
} from './time-room-doorways.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function contextSummary(contextProvider) {
  const context = typeof contextProvider === 'function' ? contextProvider() || {} : {};
  return {
    active_world_id: context.active_world_id || context.world_id || null,
    active_project_id: context.active_project_id || context.project_id || null,
    active_scene_id: context.active_scene_id || context.scene_id || null,
    active_document_id: context.active_document_id || context.document_id || null,
    active_room: context.active_room || context.room || null,
    presence_mode: context.presence_mode || null,
  };
}

export function registerTimeRoomDoorwayService(registry, {
  bus = null,
  snapshotProvider,
  navigateProvider,
  contextProvider = () => ({}),
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) {
    throw new Error('Time Room Doorways require the ArcSweep capability registry.');
  }
  if (typeof snapshotProvider !== 'function') throw new Error('Time Room Doorways require snapshotProvider().');
  if (typeof navigateProvider !== 'function') throw new Error('Time Room Doorways require navigateProvider().');

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:time-room-doorway-entered')) {
      bus.define('arcsweep:time-room-doorway-entered', (payload) => (
        payload?.schema === TIME_ROOM_DOORWAY_RECEIPT_SCHEMA
        && payload?.status === 'entered'
        && Boolean(payload?.doorway_id)
        && Boolean(payload?.destination_room)
      ));
    }
  }

  registry.registerService({
    service_id: 'time-room-doorways',
    label: 'ArcSweep Time Room Doorways',
    authority_boundary: {
      doorway_recommendation: true,
      navigation_only: true,
      human_confirmation_required: true,
      autonomous_entry: false,
      canon_promotion: false,
      source_mutation: false,
    },
    consumes: ['time-room.snapshot', 'os.navigate'],
    emits: ['arcsweep:time-room-doorway-entered'],
  });

  registry.registerCapability({
    capability_id: 'time-room.doorways',
    service_id: 'time-room-doorways',
    description: 'Recommend bounded ArcSweep room doorways from the current Time Room reading without opening any door.',
    authority: 'read',
    input_schema: { optional: ['universe_id'] },
    validate: (input = {}) => input?.universe_id == null || Boolean(String(input.universe_id).trim()),
    execute: async (input = {}) => {
      const snapshot = await snapshotProvider({ universe_id: input.universe_id || null });
      return createTimeRoomDoorwaySet(snapshot);
    },
  });

  registry.registerCapability({
    capability_id: 'time-room.enter-doorway',
    service_id: 'time-room-doorways',
    description: 'Open one current Time Room doorway after an explicit human confirmation, preserving the OS context capsule and returning navigation evidence.',
    authority: 'operate',
    requires_confirmation: true,
    input_schema: { required: ['doorway_id'], optional: ['universe_id'] },
    validate: (input = {}) => Boolean(String(input?.doorway_id || '').trim()),
    execute: async (input = {}) => {
      const snapshot = await snapshotProvider({ universe_id: input.universe_id || null });
      const set = createTimeRoomDoorwaySet(snapshot);
      const doorway = set.doorways.find((item) => item.doorway_id === input.doorway_id);
      if (!doorway) throw new Error(`Doorway is not present in the current Time Room reading: ${input.doorway_id}`);
      if (!doorway.enterable) throw new Error(doorway.held_reason || 'The current Time Room reading does not permit this doorway yet.');

      const before = contextSummary(contextProvider);
      const patch = doorwayPatch({ doorway, snapshot, context: before });
      const navigation = await navigateProvider(doorway.destination_room, clone(patch));
      if (navigation?.status !== 'applied' || navigation?.output?.ok !== true) {
        const reason = navigation?.reason || navigation?.error || navigation?.output?.status || 'navigation-not-observed';
        throw new Error(`Doorway navigation failed: ${reason}`);
      }

      const receipt = createTimeRoomDoorwayReceipt({
        doorway,
        snapshot,
        navigation_receipt: navigation,
        origin_room: before.active_room,
      }, { now });
      bus?.publish?.('arcsweep:time-room-doorway-entered', receipt, { source: 'time-room-doorways' });
      return receipt;
    },
  });

  return Object.freeze({
    service_id: 'time-room-doorways',
    capabilities: ['time-room.doorways', 'time-room.enter-doorway'],
  });
}
