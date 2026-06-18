export const DEEP_HUD_PANEL_SELECTOR = '.live-glyph-panel.deep-observer-panel';
export const DEEP_HUD_LAYER_CLASS = 'deep-observer-hud-layer';
export const DEEP_HUD_LAYER_SELECTOR = `.${DEEP_HUD_LAYER_CLASS}`;
export const DEEP_HUD_SCOPE_LAYER_SELECTOR = `:scope > ${DEEP_HUD_LAYER_SELECTOR}`;
export const DEEP_HUD_STAGE_SELECTOR = '.glyph-orb-wrap';
export const DEEP_HUD_READOUT_SELECTOR = '.glyph-readout';
export const DEEP_HUD_ROOT_SELECTOR = '#root';
export const DEEP_HUD_BOUNDS_EVENT = 'deep-observer:hud-bounds';
export const DEEP_HUD_UPDATE_THROTTLE_MS = 120;

export const DEEP_HUD_LAYER_OWNER = Object.freeze({
  react: 'react',
  fallback: 'passive-bounds-binder',
});

export const DEEP_HUD_LAYER_STATE = Object.freeze({
  empty: 'empty',
  active: 'active',
  diagnostic: 'diagnostic',
});

export const DEEP_HUD_DATA_KEYS = Object.freeze({
  bounds: 'deepHudBounds',
  boundsSignature: 'deepHudBoundsSignature',
  fallback: 'deepHudLayerFallback',
  fallbackPending: 'deepHudLayerFallbackPending',
  fallbackReady: 'deepHudLayerFallbackReady',
  layer: 'deepHudLayer',
  owner: 'deepHudLayerOwner',
  viewport: 'deepHudViewport',
});
