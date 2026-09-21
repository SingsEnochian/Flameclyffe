import './relational-field-sidecar.js';
import './universal-codex-animation-sidecar.js';
import { registerAncestryService } from './os/ancestry-service.js';

const GLOBAL_KEY = '__arcsweepAncestry';

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return null;

  const existing = os.capabilities.getService?.('ancestry');
  const service = existing ? null : registerAncestryService(os.capabilities, { bus: os.bus });

  os.health?.set?.({
    service_id: 'ancestry',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'relational-field'],
    recoverable: true,
  });

  const api = Object.freeze({
    schema: 'arcsweep.ancestry-sidecar/v0.4',
    service_id: 'ancestry',
    capabilities: service?.capabilities || [
      'ancestry.status',
      'ancestry.index',
      'ancestry.query',
      'ancestry.read',
      'ancestry.traverse',
      'ancestry.system-lineage',
      'ancestry.narrativenode-plan',
    ],
    relational_field_service: Boolean(globalThis.__arcsweepRelationalField),
    codex_holography_loaded: true,
  });
  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:ancestry-ready', api);
  return api;
}

export const ancestrySidecar = install();
export { install as installAncestrySidecar };
