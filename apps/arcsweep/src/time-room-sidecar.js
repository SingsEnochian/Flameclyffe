import { registerTimeRoomService } from './os/time-room-service.js';
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

  os.health?.set?.({
    service_id: 'time-room',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'temporal-witness'],
    recoverable: true,
  });

  if (typeof document !== 'undefined') {
    if (document.body) queueMicrotask(installSurface);
    else document.addEventListener('DOMContentLoaded', installSurface, { once: true });
  }

  const api = Object.freeze({
    schema: 'arcsweep.time-room-sidecar/v1',
    service_id: 'time-room',
    capabilities: timeRoom?.capabilities || ['time-room.status', 'time-room.universes', 'time-room.snapshot'],
    surface: () => surface,
  });
  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:time-room-ready', api);
  return api;
}

export const timeRoomSidecar = install();
export { install as installTimeRoomSidecar };
