import './deep-hud-debug-bead.css';
import { avoidRectsForDefaultPosition, measureHudBounds } from './lib/deepHudBounds.js';
import { DEEP_HUD_DEBUG } from './lib/deepHudDebugContract.js';
import {
  DEEP_HUD,
  getHudLayerSelector,
  getObserverPanelSelector,
} from './lib/deepHudContract.js';

const PANEL_SELECTOR = getObserverPanelSelector();
const HUD_LAYER_SELECTOR = getHudLayerSelector();
const UPDATE_THROTTLE_MS = DEEP_HUD.updateThrottleMs;

let updateTimer = 0;
let observer = null;
let resizeObserver = null;

function debugIsEnabled() {
  if (!import.meta.env.DEV) return false;

  const params = new URLSearchParams(window.location.search);
  let storedPreference = null;

  try {
    storedPreference = window.localStorage?.getItem(DEEP_HUD_DEBUG.storageKey);
  } catch {
    storedPreference = null;
  }

  return params.get(DEEP_HUD_DEBUG.queryParam) === DEEP_HUD_DEBUG.queryEnabledValue
    || storedPreference === DEEP_HUD_DEBUG.storageEnabledValue;
}

function px(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function syncHudLayerState(layer) {
  if (!layer) return;

  const hasDiagnostic = Boolean(layer.querySelector(`:scope > .${DEEP_HUD_DEBUG.beadClass}`));
  if (hasDiagnostic) {
    layer.dataset[DEEP_HUD.data.layer] = DEEP_HUD_DEBUG.diagnosticState;
    return;
  }

  if (layer.childElementCount === 0) {
    layer.dataset[DEEP_HUD.data.layer] = DEEP_HUD.state.empty;
    return;
  }

  if (layer.dataset[DEEP_HUD.data.layer] === DEEP_HUD_DEBUG.diagnosticState) {
    layer.dataset[DEEP_HUD.data.layer] = DEEP_HUD_DEBUG.activeState;
  }
}

function getOrCreateBead(layer) {
  let bead = layer.querySelector(`:scope > .${DEEP_HUD_DEBUG.beadClass}`);
  if (bead) {
    syncHudLayerState(layer);
    return bead;
  }

  bead = document.createElement('output');
  bead.className = DEEP_HUD_DEBUG.beadClass;
  bead.setAttribute('aria-label', DEEP_HUD_DEBUG.beadAriaLabel);
  bead.dataset.deepHudDebug = DEEP_HUD_DEBUG.beadDatasetValue;
  layer.appendChild(bead);
  syncHudLayerState(layer);
  return bead;
}

function updateBead(panel) {
  const layer = panel.querySelector(HUD_LAYER_SELECTOR);
  if (!layer) return;

  const bounds = measureHudBounds({ root: document, shell: panel });
  const position = avoidRectsForDefaultPosition(
    DEEP_HUD_DEBUG.panelKey,
    DEEP_HUD_DEBUG.panelSize,
    bounds,
    DEEP_HUD_DEBUG.fallbackZone,
  );
  const bead = getOrCreateBead(layer);

  bead.style.setProperty('--debug-x', px(position.x - bounds.safeRect.left));
  bead.style.setProperty('--debug-y', px(position.y - bounds.safeRect.top));
  bead.dataset[DEEP_HUD.data.viewport] = bounds.viewportClass;
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

  document.addEventListener(DEEP_HUD.events.bounds, scheduleUpdate);
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  const root = document.querySelector(DEEP_HUD.rootSelector) || document.body;
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
  document.removeEventListener(DEEP_HUD.events.bounds, scheduleUpdate);
  window.removeEventListener('resize', scheduleUpdate);
  window.removeEventListener('orientationchange', scheduleUpdate);

  document.querySelectorAll(`${HUD_LAYER_SELECTOR} > .${DEEP_HUD_DEBUG.beadClass}`).forEach((bead) => {
    const layer = bead.parentElement;
    bead.remove();
    syncHudLayerState(layer);
  });
}

window.addEventListener('pagehide', stopDebugBead, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startDebugBead, { once: true });
} else {
  startDebugBead();
}
