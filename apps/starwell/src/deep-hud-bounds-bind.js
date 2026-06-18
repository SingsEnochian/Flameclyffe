import { measureHudBounds } from './lib/deepHudBounds.js';
import {
  DEEP_HUD_BOUNDS_EVENT,
  DEEP_HUD_DATA_KEYS,
  DEEP_HUD_LAYER_CLASS,
  DEEP_HUD_LAYER_OWNER,
  DEEP_HUD_LAYER_SELECTOR,
  DEEP_HUD_LAYER_STATE,
  DEEP_HUD_PANEL_SELECTOR,
  DEEP_HUD_READOUT_SELECTOR,
  DEEP_HUD_ROOT_SELECTOR,
  DEEP_HUD_SCOPE_LAYER_SELECTOR,
  DEEP_HUD_STAGE_SELECTOR,
  DEEP_HUD_UPDATE_THROTTLE_MS,
} from './lib/deepHudLayerContract.js';

let observer = null;
let resizeObserver = null;
let updateTimer = 0;
let lastSignature = '';
const fallbackFrames = new Set();

function px(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function makeBoundsSignature(bounds) {
  const rects = [bounds.shellRect, bounds.stageRect, bounds.readoutRect, bounds.safeRect]
    .filter(Boolean)
    .map((rect) => [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(Number(value) || 0)).join(','));

  return [bounds.viewportClass, bounds.inset, ...rects].join('|');
}

function getLayerState(layer) {
  return layer.childElementCount === 0 ? DEEP_HUD_LAYER_STATE.empty : DEEP_HUD_LAYER_STATE.active;
}

function queueFallbackFrame(callback) {
  const frameId = window.requestAnimationFrame(() => {
    fallbackFrames.delete(frameId);
    callback();
  });
  fallbackFrames.add(frameId);
  return frameId;
}

function scheduleFallbackLayer(panel) {
  if (panel.dataset[DEEP_HUD_DATA_KEYS.fallbackReady] === 'true') return;
  if (panel.dataset[DEEP_HUD_DATA_KEYS.fallbackPending] === 'true') return;

  panel.dataset[DEEP_HUD_DATA_KEYS.fallbackPending] = 'true';
  queueFallbackFrame(() => {
    queueFallbackFrame(() => {
      delete panel.dataset[DEEP_HUD_DATA_KEYS.fallbackPending];
      if (panel.querySelector(DEEP_HUD_SCOPE_LAYER_SELECTOR)) return;
      panel.dataset[DEEP_HUD_DATA_KEYS.fallbackReady] = 'true';
      scheduleBind();
    });
  });
}

function clearFallbackState(panel) {
  delete panel.dataset[DEEP_HUD_DATA_KEYS.fallbackPending];
  delete panel.dataset[DEEP_HUD_DATA_KEYS.fallbackReady];
}

function ensureHudLayer(panel) {
  let layer = panel.querySelector(DEEP_HUD_SCOPE_LAYER_SELECTOR);
  if (layer) {
    if (!layer.dataset[DEEP_HUD_DATA_KEYS.owner]) {
      layer.dataset[DEEP_HUD_DATA_KEYS.owner] = DEEP_HUD_LAYER_OWNER.react;
    }
    if (!layer.dataset[DEEP_HUD_DATA_KEYS.layer]) {
      layer.dataset[DEEP_HUD_DATA_KEYS.layer] = getLayerState(layer);
    }
    if (layer.dataset[DEEP_HUD_DATA_KEYS.owner] === DEEP_HUD_LAYER_OWNER.react) {
      clearFallbackState(panel);
    }
    return layer;
  }

  if (panel.dataset[DEEP_HUD_DATA_KEYS.fallbackReady] !== 'true') {
    scheduleFallbackLayer(panel);
    return null;
  }

  layer = document.createElement('div');
  layer.className = DEEP_HUD_LAYER_CLASS;
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset[DEEP_HUD_DATA_KEYS.layer] = DEEP_HUD_LAYER_STATE.empty;
  layer.dataset[DEEP_HUD_DATA_KEYS.owner] = DEEP_HUD_LAYER_OWNER.fallback;
  layer.dataset[DEEP_HUD_DATA_KEYS.fallback] = 'true';
  panel.appendChild(layer);
  return layer;
}

function applyBoundsVars(panel, bounds) {
  const { safeRect, shellRect, stageRect, readoutRect } = bounds;
  const shellLeft = shellRect?.left || 0;
  const shellTop = shellRect?.top || 0;

  panel.dataset[DEEP_HUD_DATA_KEYS.bounds] = 'ready';
  panel.dataset[DEEP_HUD_DATA_KEYS.viewport] = bounds.viewportClass;
  panel.style.setProperty('--deep-hud-inset', px(bounds.inset));

  panel.style.setProperty('--deep-hud-safe-left', px(safeRect.left - shellLeft));
  panel.style.setProperty('--deep-hud-safe-top', px(safeRect.top - shellTop));
  panel.style.setProperty('--deep-hud-safe-width', px(safeRect.width));
  panel.style.setProperty('--deep-hud-safe-height', px(safeRect.height));

  if (stageRect) {
    panel.style.setProperty('--deep-hud-stage-left', px(stageRect.left - shellLeft));
    panel.style.setProperty('--deep-hud-stage-top', px(stageRect.top - shellTop));
    panel.style.setProperty('--deep-hud-stage-width', px(stageRect.width));
    panel.style.setProperty('--deep-hud-stage-height', px(stageRect.height));
  }

  if (readoutRect) {
    panel.style.setProperty('--deep-hud-readout-left', px(readoutRect.left - shellLeft));
    panel.style.setProperty('--deep-hud-readout-top', px(readoutRect.top - shellTop));
    panel.style.setProperty('--deep-hud-readout-width', px(readoutRect.width));
    panel.style.setProperty('--deep-hud-readout-height', px(readoutRect.height));
  }
}

function dispatchBounds(panel, bounds) {
  panel.dispatchEvent(new CustomEvent(DEEP_HUD_BOUNDS_EVENT, {
    bubbles: true,
    detail: {
      viewportClass: bounds.viewportClass,
      inset: bounds.inset,
      shellRect: bounds.shellRect,
      stageRect: bounds.stageRect,
      readoutRect: bounds.readoutRect,
      safeRect: bounds.safeRect,
      avoidRects: bounds.avoidRects,
      snapZones: bounds.snapZones,
    },
  }));
}

function bindPanel(panel) {
  ensureHudLayer(panel);
  const stage = panel.querySelector(DEEP_HUD_STAGE_SELECTOR);
  const readout = panel.querySelector(DEEP_HUD_READOUT_SELECTOR);
  const bounds = measureHudBounds({ root: panel, shell: panel, stage, readout });
  const signature = makeBoundsSignature(bounds);
  if (signature === panel.dataset[DEEP_HUD_DATA_KEYS.boundsSignature]) return;

  panel.dataset[DEEP_HUD_DATA_KEYS.boundsSignature] = signature;
  lastSignature = signature;
  applyBoundsVars(panel, bounds);
  dispatchBounds(panel, bounds);
}

function bindAll() {
  document.querySelectorAll(DEEP_HUD_PANEL_SELECTOR).forEach(bindPanel);
}

function scheduleBind() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    bindAll();
  }, DEEP_HUD_UPDATE_THROTTLE_MS);
}

function observePanels() {
  if (!('ResizeObserver' in window)) return;
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(scheduleBind);

  document.querySelectorAll(DEEP_HUD_PANEL_SELECTOR).forEach((panel) => {
    resizeObserver.observe(panel);
    const stage = panel.querySelector(DEEP_HUD_STAGE_SELECTOR);
    const readout = panel.querySelector(DEEP_HUD_READOUT_SELECTOR);
    const hudLayer = panel.querySelector(DEEP_HUD_LAYER_SELECTOR);
    if (stage) resizeObserver.observe(stage);
    if (readout) resizeObserver.observe(readout);
    if (hudLayer) resizeObserver.observe(hudLayer);
  });
}

function startBinding() {
  bindAll();
  observePanels();

  const root = document.querySelector(DEEP_HUD_ROOT_SELECTOR) || document.body;
  observer = new MutationObserver(() => {
    observePanels();
    scheduleBind();
  });
  observer.observe(root, { childList: true, subtree: true });

  window.addEventListener('resize', scheduleBind, { passive: true });
  window.addEventListener('orientationchange', scheduleBind, { passive: true });
}

function stopBinding() {
  if (observer) observer.disconnect();
  if (resizeObserver) resizeObserver.disconnect();
  if (updateTimer) window.clearTimeout(updateTimer);
  fallbackFrames.forEach((frameId) => window.cancelAnimationFrame(frameId));
  fallbackFrames.clear();
  window.removeEventListener('resize', scheduleBind);
  window.removeEventListener('orientationchange', scheduleBind);
}

window.addEventListener('pagehide', stopBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
