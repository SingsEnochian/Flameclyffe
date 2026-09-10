import { registerTemporalWitnessService } from './os/temporal-witness-service.js';
import { installTemporalWitnessSurface } from './os/temporal-witness-surface.js';

const GLOBAL_KEY = '__arcsweepTemporalWitness';

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function localStorageSafe() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return null;

  const existing = os.capabilities.getService?.('temporal-witness');
  const temporalWitness = existing ? null : registerTemporalWitnessService(os.capabilities, {
    bus: os.bus,
    storage: localStorageSafe(),
    contextProvider: () => {
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
    },
  });

  let surface = null;
  const installSurface = () => {
    if (!surface) surface = installTemporalWitnessSurface({ os });
    return surface;
  };

  os.bus?.subscribe?.('arcsweep:temporal-witness-recorded', 'temporal-witness-dom-bridge', (receipt) => {
    dispatch('arcsweep:temporal-witness-updated', {
      record: receipt?.payload || null,
      event_id: receipt?.event_id || null,
    });
  });

  os.health?.set?.({
    service_id: 'temporal-witness',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel'],
    recoverable: true,
  });

  if (typeof document !== 'undefined') {
    if (document.body) queueMicrotask(installSurface);
    else document.addEventListener('DOMContentLoaded', installSurface, { once: true });
  }

  const api = Object.freeze({
    schema: 'arcsweep.temporal-witness-sidecar/v1',
    service_id: 'temporal-witness',
    capabilities: temporalWitness?.capabilities || ['witness.status', 'witness.summary', 'witness.recent', 'witness.list-local', 'witness.record'],
    surface: () => surface,
  });
  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:temporal-witness-ready', api);
  return api;
}

export const temporalWitnessSidecar = install();
export { install as installTemporalWitnessSidecar };
