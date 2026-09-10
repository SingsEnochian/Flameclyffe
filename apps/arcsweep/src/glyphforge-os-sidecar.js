import { registerGlyphForgeService } from './os/glyphforge-service.js';

export function installGlyphForgeOSService() {
  const os = globalThis.__arcsweepOS;
  if (!os?.capabilities?.registerService) return false;
  if (os.capabilities.getService('glyphforge')) return true;
  registerGlyphForgeService(os.capabilities);
  os.health?.set?.({
    service_id: 'glyphforge',
    status: globalThis.__starwellGlyphStudioBridge?.schema === 'starwell.glyph-studio-bridge/v1' ? 'healthy' : 'degraded',
    version: os.manifest?.version || null,
    last_success_at: new Date().toISOString(),
    dependencies: ['arcsweep-os-kernel', 'starwell-glyph-studio'],
    recoverable: true,
  });
  return true;
}

if (!installGlyphForgeOSService() && typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('arcsweep:os-ready', installGlyphForgeOSService, { once: true });
}

if (typeof globalThis.addEventListener === 'function') {
  globalThis.addEventListener('starwell:glyph-studio-bridge-ready', () => {
    const os = globalThis.__arcsweepOS;
    if (!os) return;
    if (!os.capabilities.getService('glyphforge')) installGlyphForgeOSService();
    os.health?.set?.({
      service_id: 'glyphforge',
      status: 'healthy',
      version: os.manifest?.version || null,
      last_success_at: new Date().toISOString(),
      dependencies: ['arcsweep-os-kernel', 'starwell-glyph-studio'],
      recoverable: true,
    });
  });
}
