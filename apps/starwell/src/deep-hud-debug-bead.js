import './deep-hud-debug-bead.css';
import { avoidRectsForDefaultPosition, measureHudBounds } from './lib/deepHudBounds.js';
import {
  DEEP_HUD,
  getHudLayerSelector,
  getObserverPanelSelector,
} from './lib/deepHudContract.js';

const PANEL_SELECTOR = getObserverPanelSelector();
const HUD_LAYER_SELECTOR = getHudLayerSelector();
const BEAD_CLASS = 'deep-hud-debug-bead';
const PANEL_SIZE = { width: 164, height: 52 };
const UPDATE_THROTTLE_MS = DEEP_HUD.updateThrottleMs;
const DEBUG_QUERY_PARAM = 'deepHudDebug';
const DEBUG_ENABLED_VALUE = '1';
const DEBUG_STORAGE_KEY = 'deepHudDebug';
const DEBUG_STORAGE_VALUE = 'true';
const DIAGNOSTIC_STATE = 'diagnostic';
const ACTIVE_STATE = 'active';
const DEBUG_PANEL_KEY = 'status';
const DEBUG_FALLBACK_ZONE = 'bottom-rail';

let updateTimer = 0;
let observer = null;
let resizeObserver = null;

function debugIsEnabled() {
  if (!import.meta.env.DEV) return false;

  const params = new URLSearchParams(window.location.search);
  let storedPreference = null;

  try {
    storedPreference = window.localStorage?.getItem(DEBUG_STORAGE_KEY);
  } catch {
    storedPreference = null;
  }

  return params.get(DEBUG_QUERY_PARAM) === DEBUG_ENABLED_VALUE || storedPreference === DEBUG_STORAGE_VALUE;
}

function px(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function syncHudLayerState(layer) {
  if (!layer) return;

  const hasDiagnostic = Boolean(layer.querySelector(`:scope > .${BEAD_CLASS}`));
  if (hasDiagnostic) {
    layer.dataset[DEEP_HUD.data.layer] = DIAGNOSTIC_STATE;
    return;
  }

  if (layer.childElementCount === 0) {
    layer.dataset[DEEP_HUD.data.layer] = DEEP_HUD.state.empty;
    return;
  }

  if (layer.dataset[DEEP_HUD.data.layer] === DIAGNOSTIC_STATE) {
    layer.dataset[DEEP_HUD.data.layer] = ACTIVE_STATE;
  }
}

function getOrCreateBead(layer) {
  let bead = layer.querySelector(`:scope > .${BEAD_CLASS}`);
  if (bead) {
    syncHudLayerState(layer);
    return bead;
  }

  bead = document.createElement('output');
  bead.className = BEAD_CLASS;
  bead.setAttribute('aria-label', 'DEEP HUD bounds debug status');
  bead.dataset.deepHudDebug = 'bead';
  layer.appendChild(bead);
  syncHudLayerState(layer);
  return bead;
}

function updateBead(panel) {
  const layer = panel.querySelector(HUD_LAYER_SELECTOR);
  if (!layer) return;

  const bounds = measureHudBounds({ root: document, shell: panel });
  const position = avoidRectsForDefaultPosition(DEBUG_PANEL_KEY, PANEL_SIZE, bounds, DEBUG_FALLBACK_ZONE);
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

  document.querySelectorAll(`${HUD_LAYER_SELECTOR} > .${BEAD_CLASS}`).forEach((bead) => {
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
