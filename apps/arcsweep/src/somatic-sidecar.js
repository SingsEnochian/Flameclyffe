import { arcsweepOS } from './os/bootstrap.js';
import { registerSomaticService } from './os/somatic-service.js';

const GLOBAL_KEY = '__arcsweepSomatic';

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const service = registerSomaticService(arcsweepOS.capabilities, { bus: arcsweepOS.bus });
  arcsweepOS.health?.set?.({
    service_id: 'somatic-interface',
    status: 'healthy',
    version: arcsweepOS.manifest?.version || 'unknown',
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel'],
    recoverable: true,
  });
  const api = Object.freeze({
    service_id: service.service_id,
    capabilities: [...service.capabilities],
    status: () => arcsweepOS.capabilities.invoke('somatic.status', {}, { authority: 'read', actor_id: 'human-ui', source: 'somatic-sidecar' }),
    cues: () => arcsweepOS.capabilities.invoke('somatic.list-cues', {}, { authority: 'read', actor_id: 'human-ui', source: 'somatic-sidecar' }),
    emit: (cue_id, options = {}) => arcsweepOS.capabilities.invoke('somatic.emit-cue', { cue_id, ...options }, { authority: 'operate', actor_id: 'human-ui', source: 'somatic-sidecar', confirmed: true }),
    stop: () => arcsweepOS.capabilities.invoke('somatic.stop', {}, { authority: 'operate', actor_id: 'human-ui', source: 'somatic-sidecar' }),
  });
  globalThis[GLOBAL_KEY] = api;
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:somatic-ready', { detail: { service_id: service.service_id, capabilities: service.capabilities } }));
  return api;
}

export const arcsweepSomatic = install();
