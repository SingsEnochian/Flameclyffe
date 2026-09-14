import { registerSomaticCartographyService } from './os/somatic-cartography-service.js';
import { installSomaticCartographyCueSurface } from './os/somatic-cartography-surface.js';

const GLOBAL_KEY = '__arcsweepSomaticCartography';

function dispatch(name, detail) {
  if (typeof globalThis.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  globalThis.dispatchEvent(new CustomEvent(name, { detail }));
}

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return null;

  const cueSurface = installSomaticCartographyCueSurface({ os });
  const existing = os.capabilities.getService?.('somatic-cartography');
  const helm = existing ? null : registerSomaticCartographyService(os.capabilities, {
    bus: os.bus,
    dispatchCue: (cue) => cueSurface?.present?.(cue) || { applied: false, supported: false, awaiting_presentation: true },
  });

  os.health?.set?.({
    service_id: 'somatic-cartography',
    status: 'healthy',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'glyphforge', 'runa-sensory'],
    recoverable: true,
  });

  const api = Object.freeze({
    schema: 'arcsweep.somatic-cartography-sidecar/v1',
    service_id: 'somatic-cartography',
    capabilities: helm?.capabilities || ['somatic.cartography.status', 'somatic.observe', 'somatic.cue', 'somatic.observe-hold', 'somatic.plan', 'somatic.execute-course', 'somatic.observation.record'],
    cueSurface: () => cueSurface,
    helm: () => helm,
  });

  globalThis[GLOBAL_KEY] = api;
  dispatch('arcsweep:somatic-cartography-ready', api);
  return api;
}

export const somaticCartographySidecar = install();
export { install as installSomaticCartographySidecar };
