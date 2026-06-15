import { measureHudBounds } from './lib/deepHudBounds.js';
import { HUD_MEASURE_SELECTORS } from './lib/deepHudMeasureSelectors.js';
import {
  DEEP_HUD,
  getHudLayerSelector,
  getHudReadoutSelector,
  getHudStageSelector,
  getObserverPanelSelector,
  markEmptyHudLayer,
  markHudBoundsReady,
} from './lib/deepHudContract.js';

const PANEL_SELECTOR = getObserverPanelSelector();
const HUD_LAYER_SELECTOR = getHudLayerSelector();
const STAGE_SELECTOR = getHudStageSelector();
const READOUT_SELECTOR = getHudReadoutSelector();
const ROOT_SELECTOR = DEEP_HUD.rootSelector;
const UPDATE_THROTTLE_MS = DEEP_HUD.updateThrottleMs;

let observer = null;
let resizeObserver = null;
let updateTimer = 0;
let lastSignature = '';

function px(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function makeBoundsSignature(bounds) {
  const rects = [bounds.shellRect, bounds.stageRect, bounds.readoutRect, bounds.safeRect]
    .filter(Boolean)
    .map((rect) => [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(Number(value) || 0)).join(','));

  return [bounds.viewportClass, bounds.inset, ...rects].join('|');
}

function ensureHudLayer(panel) {
  let layer = panel.querySelector(`:scope > ${HUD_LAYER_SELECTOR}`);
  if (layer) {
    markEmptyHudLayer(layer, DEEP_HUD.owner.reactShell);
    return layer;
  }

  layer = document.createElement('div');
  layer.className = DEEP_HUD.layerClass;
  markEmptyHudLayer(layer, DEEP_HUD.owner.passiveBoundsBinder);
  panel.appendChild(layer);
  return layer;
}

function applyBoundsVars(panel, bounds) {
  const { safeRect, shellRect, stageRect, readoutRect } = bounds;
  const shellLeft = shellRect?.left || 0;
  const shellTop = shellRect?.top || 0;

  markHudBoundsReady(panel, bounds.viewportClass);
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
  panel.dispatchEvent(new CustomEvent(DEEP_HUD.events.bounds, {
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
  const stage = panel.querySelector(STAGE_SELECTOR);
  const readout = panel.querySelector(READOUT_SELECTOR);
  const bounds = measureHudBounds({
    root: panel,
    selectors: HUD_MEASURE_SELECTORS,
    shell: panel,
    stage,
    readout,
  });
  const signature = makeBoundsSignature(bounds);
  if (signature === panel.dataset[DEEP_HUD.data.boundsSignature]) return;

  panel.dataset[DEEP_HUD.data.boundsSignature] = signature;
  lastSignature = signature;
  applyBoundsVars(panel, bounds);
  dispatchBounds(panel, bounds);
}

function bindAll() {
  document.querySelectorAll(PANEL_SELECTOR).forEach(bindPanel);
}

function scheduleBind() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    bindAll();
  }, UPDATE_THROTTLE_MS);
}

function observePanels() {
  if (!('ResizeObserver' in window)) return;
  if (resizeObserver) resizeObserver.disconnect();
  resizeObserver = new ResizeObserver(scheduleBind);

  document.querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
    resizeObserver.observe(panel);
    const stage = panel.querySelector(STAGE_SELECTOR);
    const readout = panel.querySelector(READOUT_SELECTOR);
    const hudLayer = panel.querySelector(HUD_LAYER_SELECTOR);
    if (stage) resizeObserver.observe(stage);
    if (readout) resizeObserver.observe(readout);
    if (hudLayer) resizeObserver.observe(hudLayer);
  });
}

function startBinding() {
  bindAll();
  observePanels();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
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
  window.removeEventListener('resize', scheduleBind);
  window.removeEventListener('orientationchange', scheduleBind);
}

window.addEventListener('pagehide', stopBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBinding, { once: true });
} else {
  startBinding();
}
