import { avoidRectsForDefaultPosition, measureHudBounds } from './lib/deepHudBounds.js';

const PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
const HUD_LAYER_SELECTOR = '.deep-observer-hud-layer';
const BEAD_CLASS = 'deep-hud-debug-bead';
const PANEL_SIZE = { width: 164, height: 52 };
const UPDATE_THROTTLE_MS = 120;

let updateTimer = 0;
let observer = null;
let resizeObserver = null;

function debugIsEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get('deepHudDebug') === '1' || window.localStorage?.getItem('deepHudDebug') === 'true';
}

function px(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function getOrCreateBead(layer) {
  let bead = layer.querySelector(`:scope > .${BEAD_CLASS}`);
  if (bead) return bead;

  bead = document.createElement('output');
  bead.className = BEAD_CLASS;
  bead.setAttribute('aria-label', 'DEEP HUD bounds debug status');
  bead.dataset.deepHudDebug = 'bead';
  layer.appendChild(bead);
  return bead;
}

function updateBead(panel) {
  const layer = panel.querySelector(HUD_LAYER_SELECTOR);
  if (!layer) return;

  const bounds = measureHudBounds({ root: document, shell: panel });
  const position = avoidRectsForDefaultPosition('status', PANEL_SIZE, bounds, 'bottom-rail');
  const bead = getOrCreateBead(layer);

  bead.style.setProperty('--debug-x', px(position.x - bounds.safeRect.left));
  bead.style.setProperty('--debug-y', px(position.y - bounds.safeRect.top));
  bead.dataset.deepHudViewport = bounds.viewportClass;
  bead.value = '';
  bead.textContent = `HUD ${bounds.viewportClass} · ${Math.round(bounds.safeRect.width)}×${Math.round(bounds.safeRect.height)}`;
}

function updateAll() {
  if (!debugIsEnabled()) return;
  document.querySelectorAll(PANEL_SELECTOR).forEach(updateBead);
}

function scheduleUpdate() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    updateAll();
  }, UPDATE_THROTTLE_MS);
}

function observePanels() {
  if (!('ResizeObserver' in window)) return;
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(scheduleUpdate);

  document.querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
    resizeObserver.observe(panel);
    const layer = panel.querySelector(HUD_LAYER_SELECTOR);
    if (layer) resizeObserver.observe(layer);
  });
}

function startDebugBead() {
  if (!debugIsEnabled()) return;

  updateAll();
  observePanels();

  document.addEventListener('deep-observer:hud-bounds', scheduleUpdate);
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  const root = document.querySelector('#root') || document.body;
  observer = new MutationObserver(() => {
    observePanels();
    scheduleUpdate();
  });
  observer.observe(root, { childList: true, subtree: true });
}

function stopDebugBead() {
  if (observer) observer.disconnect();
  if (resizeObserver) resizeObserver.disconnect();
  if (updateTimer) window.clearTimeout(updateTimer);
  document.removeEventListener('deep-observer:hud-bounds', scheduleUpdate);
  window.removeEventListener('resize', scheduleUpdate);
  window.removeEventListener('orientationchange', scheduleUpdate);
}

window.addEventListener('pagehide', stopDebugBead, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDebugBead, { once: true });
} else {
  startDebugBead();
}
