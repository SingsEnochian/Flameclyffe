import { arcsweepOS } from './os/bootstrap.js';
import { createAfferentBus } from './afferent-bus.js';

const GLOBAL_KEY = '__arcsweepAfferent';

function install() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];
  const afferent = createAfferentBus({ bus: arcsweepOS.bus, eventTarget: globalThis });
  const api = Object.freeze({
    schema: afferent.schema,
    status: () => afferent.status(),
    publish: (signal) => afferent.publish(signal),
    subscribe: (listener) => afferent.subscribe(listener),
    normalizeGlyphBrushSample: (sample) => afferent.normalizeGlyphBrushSample(sample),
  });
  globalThis[GLOBAL_KEY] = api;
  arcsweepOS.health?.set?.({
    service_id: 'afferent-bus',
    status: 'healthy',
    version: arcsweepOS.manifest?.version || 'unknown',
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel'],
    recoverable: true,
  });
  globalThis.addEventListener?.('beforeunload', () => afferent.destroy(), { once: true });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:afferent-ready', { detail: { schema: afferent.schema } }));
  return api;
}

export const arcsweepAfferent = install();
