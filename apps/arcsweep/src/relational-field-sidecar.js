import { registerRelationalFieldService } from './os/relational-field-service.js';

const GLOBAL_KEY = '__arcsweepRelationalField';

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return null;

  const existing = os.capabilities.getService?.('relational-field');
  const service = existing ? null : registerRelationalFieldService(os.capabilities, { bus: os.bus });

  os.health?.set?.({
    service_id: 'relational-field',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'arcsweep-state'],
    recoverable: true,
  });

  const api = Object.freeze({
    schema: 'arcsweep.relational-field-sidecar/v0.1',
    service_id: 'relational-field',
    capabilities: service?.capabilities || [
      'relation.status',
      'relation.list',
      'relation.get',
      'relation.create',
      'relation.apply-event',
      'relation.project-observer',
      'relation.project-premaqc',
      'relation.project-runa',
    ],
  });
  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:relational-field-ready', api);
  return api;
}

export const relationalFieldSidecar = install();
export { install as installRelationalFieldSidecar };
