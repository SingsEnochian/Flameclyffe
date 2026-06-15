export const DEEP_HUD = Object.freeze({
  liveGlyphPanelClass: 'live-glyph-panel',
  panelClass: 'deep-observer-panel',
  layerClass: 'deep-observer-hud-layer',
  stageClass: 'glyph-orb-wrap',
  readoutClass: 'glyph-readout',
  rootSelector: '#root',
  updateThrottleMs: 120,

  state: Object.freeze({
    empty: 'empty',
    ready: 'ready',
  }),

  owner: Object.freeze({
    reactShell: 'react-shell',
    passiveBoundsBinder: 'passive-bounds-binder',
    bootstrapSocketBinder: 'bootstrap-socket-binder',
  }),

  attr: Object.freeze({
    layer: 'data-deep-hud-layer',
    layerOwner: 'data-deep-hud-layer-owner',
  }),

  data: Object.freeze({
    layer: 'deepHudLayer',
    layerOwner: 'deepHudLayerOwner',
    bounds: 'deepHudBounds',
    boundsSignature: 'deepHudBoundsSignature',
    viewport: 'deepHudViewport',
  }),

  events: Object.freeze({
    bounds: 'deep-observer:hud-bounds',
  }),
});

export function getObserverPanelSelector() {
  return `.${DEEP_HUD.liveGlyphPanelClass}.${DEEP_HUD.panelClass}`;
}

export function getHudLayerSelector() {
  return `.${DEEP_HUD.layerClass}`;
}

export function getHudStageSelector() {
  return `.${DEEP_HUD.stageClass}`;
}

export function getHudReadoutSelector() {
  return `.${DEEP_HUD.readoutClass}`;
}

export function getEmptyHudLayerProps(owner = DEEP_HUD.owner.reactShell) {
  return {
    className: DEEP_HUD.layerClass,
    'aria-hidden': 'true',
    [DEEP_HUD.attr.layer]: DEEP_HUD.state.empty,
    [DEEP_HUD.attr.layerOwner]: owner,
  };
}

export function markEmptyHudLayer(layer, owner = DEEP_HUD.owner.reactShell) {
  const isEmpty = layer.childElementCount === 0;

  if (!layer.dataset[DEEP_HUD.data.layer] && isEmpty) {
    layer.dataset[DEEP_HUD.data.layer] = DEEP_HUD.state.empty;
  }

  if (owner && !layer.dataset[DEEP_HUD.data.layerOwner]) {
    layer.dataset[DEEP_HUD.data.layerOwner] = owner;
  }

  if (layer.dataset[DEEP_HUD.data.layer] === DEEP_HUD.state.empty && isEmpty && !layer.hasAttribute('aria-hidden')) {
    layer.setAttribute('aria-hidden', 'true');
  }
}

export function markHudBoundsReady(panel, viewportClass) {
  panel.dataset[DEEP_HUD.data.bounds] = DEEP_HUD.state.ready;
  panel.dataset[DEEP_HUD.data.viewport] = viewportClass;
}
