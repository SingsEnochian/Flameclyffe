import { registerTimeRoomService } from './os/time-room-service.js';
import { registerTimeRoomDoorwayService } from './os/time-room-doorway-service.js';
import { installTimeRoomSurface } from './os/time-room-surface.js';

const GLOBAL_KEY = '__arcsweepTimeRoom';

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function contextFromOS(os) {
  const session = os.session?.() || {};
  const capsules = os.capsules?.() || [];
  const active = capsules.length ? capsules[capsules.length - 1] : null;
  return {
    active_world_id: session.active_world_id,
    active_project_id: session.active_project_id,
    active_scene_id: session.active_scene_id,
    active_document_id: session.active_document_id,
    active_room: session.active_room,
    active_context_id: active?.capsule_id || null,
    presence_mode: session.presence_mode || null,
  };
}

function witnessProviderFromOS(os) {
  return async () => {
    if (!os?.capabilities?.getCapability?.('witness.summary')) return null;
    const receipt = await os.capabilities.invoke('witness.summary', {}, {
      actor_id: 'time-room',
      source: 'time-room-sidecar',
      authority: 'read',
      expected_authority: 'read',
    });
    return receipt.status === 'applied' ? receipt.output : null;
  };
}

function snapshotProviderFromOS(os) {
  return async ({ universe_id = null } = {}) => {
    const receipt = await os.capabilities.invoke('time-room.snapshot', { universe_id }, {
      actor_id: 'time-room-doorways',
      source: 'time-room-doorway-service',
      authority: 'read',
      expected_authority: 'read',
    });
    if (receipt.status !== 'applied') throw new Error(receipt.reason || receipt.error || 'Time Room snapshot unavailable.');
    return receipt.output;
  };
}

function navigateProviderFromOS(os) {
  return async (room, patch) => os.navigate(room, patch);
}

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return null;

  const existing = os.capabilities.getService?.('time-room');
  const timeRoom = existing ? null : registerTimeRoomService(os.capabilities, {
    bus: os.bus,
    contextProvider: () => contextFromOS(os),
    witnessProvider: witnessProviderFromOS(os),
  });

  const existingDoorways = os.capabilities.getService?.('time-room-doorways');
  const doorways = existingDoorways ? null : registerTimeRoomDoorwayService(os.capabilities, {
    bus: os.bus,
    snapshotProvider: snapshotProviderFromOS(os),
    navigateProvider: navigateProviderFromOS(os),
    contextProvider: () => contextFromOS(os),
  });

  let surface = null;
  const installSurface = () => {
    if (!surface) surface = installTimeRoomSurface({ os });
    return surface;
  };

  os.bus?.subscribe?.('arcsweep:time-room-observed', (receipt) => {
    dispatch('arcsweep:time-room-updated', {
      snapshot: receipt?.payload || null,
      event_id: receipt?.event_id || null,
    });
  }, { id: 'time-room-dom-bridge' });

  os.bus?.subscribe?.('arcsweep:time-room-doorway-entered', (receipt) => {
    dispatch('arcsweep:time-room-doorway-entered', {
      doorway: receipt?.payload || null,
      event_id: receipt?.event_id || null,
    });
  }, { id: 'time-room-doorway-dom-bridge' });

  os.health?.set?.({
    service_id: 'time-room',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'temporal-witness'],
    recoverable: true,
  });

  os.health?.set?.({
    service_id: 'time-room-doorways',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'time-room'],
    recoverable: true,
  });

  if (typeof document !== 'undefined') {
    if (document.body) queueMicrotask(installSurface);
    else document.addEventListener('DOMContentLoaded', installSurface, { once: true });
  }

  const api = Object.freeze({
    schema: 'arcsweep.time-room-sidecar/v2',
    service_id: 'time-room',
    capabilities: [
      ...(timeRoom?.capabilities || ['time-room.status', 'time-room.universes', 'time-room.snapshot']),
      ...(doorways?.capabilities || ['time-room.doorways', 'time-room.enter-doorway']),
    ],
    surface: () => surface,
  });
  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:time-room-ready', api);
  return api;
}

export const timeRoomSidecar = install();
export { install as installTimeRoomSidecar };
