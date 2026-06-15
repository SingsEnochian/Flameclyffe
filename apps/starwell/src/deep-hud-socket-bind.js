import {
  DEEP_HUD,
  getHudLayerSelector,
  getObserverPanelSelector,
  markEmptyHudLayer,
} from './lib/deepHudContract.js';

const PANEL_SELECTOR = getObserverPanelSelector();
const HUD_LAYER_SELECTOR = getHudLayerSelector();
const ROOT_SELECTOR = DEEP_HUD.rootSelector;
const UPDATE_THROTTLE_MS = DEEP_HUD.updateThrottleMs;

let observer = null;
let updateTimer = 0;

function ensurePanelSocket(panel) {
  let layer = panel.querySelector(`:scope > ${HUD_LAYER_SELECTOR}`);
  if (layer) {
    markEmptyHudLayer(layer, layer.dataset[DEEP_HUD.data.layerOwner] || DEEP_HUD.owner.bootstrapSocketBinder);
    return layer;
  }

  layer = document.createElement('div');
  layer.className = DEEP_HUD.layerClass;
  markEmptyHudLayer(layer, DEEP_HUD.owner.bootstrapSocketBinder);

  if (panel.firstElementChild) {
    panel.insertBefore(layer, panel.firstElementChild);
  } else {
    panel.appendChild(layer);
  }

  return layer;
}

function bindSockets() {
  document.querySelectorAll(PANEL_SELECTOR).forEach(ensurePanelSocket);
}

function scheduleBind() {
  if (updateTimer) return;
  updateTimer = window.setTimeout(() => {
    updateTimer = 0;
    bindSockets();
  }, UPDATE_THROTTLE_MS);
}

function startSocketBinding() {
  bindSockets();

  const root = document.querySelector(ROOT_SELECTOR) || document.body;
  observer = new MutationObserver(scheduleBind);
  observer.observe(root, { childList: true, subtree: true });
}

function stopSocketBinding() {
  if (observer) observer.disconnect();
  if (updateTimer) window.clearTimeout(updateTimer);
}

window.addEventListener('pagehide', stopSocketBinding, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSocketBinding, { once: true });
} else {
  startSocketBinding();
}
