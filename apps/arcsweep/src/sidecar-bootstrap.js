const SIDECARS = [
  './observer-bridge.js',
  './feedback-queue-bootstrap.js',
  './rich-text-core.js',
  './world-registry-persistence-sidecar.js',
  './terra-prime-waking-world-sidecar.js',
  './instrument-sidecars.js',
  './react-ion-helm-sidecar.js',
  './glyph-drift-observatory-sidecar.js',
  './continuity-evidence-sidecar.js',
  './continuity-experiment-sidecar.js',
  './constellation-runtime-adapter.js',
  './model-presence-bus.js',
  './model-presence-live-ui.js',
  './runtime-presence-diagnostics.js',
  './runtime-integration-bootstrap.js',
  './house-commons-chat-v3.js',
  './runtime-envelope-live-ui.js',
  './canon-intelligence-live-ui.js',
  './constellation-presence.js',
  './runtime-world-presence.js',
  './self-authorship-panel.js',
  './script-cortex-controls.js',
  './scene-cognition-ui.js',
  './worldseed-live-ui.js',
  './possible-worlds-live-ui.js',
  './worldseed-package-live-ui.js',
  './worldseed-threshold-live-ui.js',
  './worldseed-braid-live-ui.js',
  './worldseed-seed-library-live-ui.js',
  './canon-web-link-sidecar.js',
];

export async function mountArcsweepSidecars() {
  const failures = [];
  for (const specifier of SIDECARS) {
    try {
      await import(specifier);
    } catch (error) {
      failures.push({ specifier, message: error?.message || String(error) });
      console.error(`[Arcsweep] sidecar failed: ${specifier}`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  window.dispatchEvent(new CustomEvent('arcsweep:sidecars-ready', { detail: { failures } }));
  return failures;
}

export { SIDECARS };
