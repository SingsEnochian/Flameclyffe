const SIDECARS = [
  './observer-bridge.js',
  './feedback-queue-bootstrap.js',
  './rich-text-core.js',
  './mobile-navigation-sidecar.js',
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
  './house-commons-command-room.js',
  './house-commons-thread-restoration.js',
  './house-commons-deep-link-router.js',
  './house-commons-attachments.js',
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
  './feedback-chamber-v2.js',
  './story-mode-sidecar.js',
];

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function mountArcsweepSidecars() {
  const failures = [];
  for (const specifier of SIDECARS) {
    try {
      await import(specifier);
    } catch (error) {
      failures.push({ specifier, message: error?.message || String(error) });
      console.error(`[Arcsweep] sidecar failed: ${specifier}`, error);
    }
    await yieldToBrowser();
  }
  window.dispatchEvent(new CustomEvent('arcsweep:sidecars-ready', { detail: { failures } }));
  return failures;
}

export { SIDECARS };
