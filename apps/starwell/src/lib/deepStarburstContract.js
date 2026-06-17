export const DEEP_STARBURST_BINDING = Object.freeze({
  className: Object.freeze({
    panelLiveGlyph: 'live-glyph-panel',
    panelObserver: 'deep-observer-panel',
    glyphWrap: 'glyph-orb-wrap',
    meterGrid: 'glyph-meter-grid',
    sensorLabel: 'deep-sensor-label',
  }),

  data: Object.freeze({
    native: 'starburstNative',
    bound: 'starburstBound',
    signature: 'starburstSignature',
    sensor: 'deepSensor',
  }),

  attr: Object.freeze({
    native: 'data-starburst-native',
  }),

  native: Object.freeze({
    true: 'true',
    aura: 'aura',
    sensor: 'sensor',
  }),

  timing: Object.freeze({
    updateIntervalMs: 1000,
    bridgePollMs: 60000,
    mutationThrottleMs: 160,
  }),
});

export function getStarburstPanelSelector() {
  const { panelLiveGlyph, panelObserver } = DEEP_STARBURST_BINDING.className;
  return `.${panelLiveGlyph}.${panelObserver}`;
}

export function getStarburstGlyphWrapSelector() {
  return `.${DEEP_STARBURST_BINDING.className.glyphWrap}`;
}

export function getStarburstRootSelector() {
  return '#root';
}

export function getStarburstSensorChipSelector() {
  return `.${DEEP_STARBURST_BINDING.className.meterGrid} > div`;
}

export function getStarburstSensorLabelSelector() {
  return `:scope > .${DEEP_STARBURST_BINDING.className.sensorLabel}`;
}

export function getStarburstSelectors() {
  return {
    root: getStarburstRootSelector(),
    panel: getStarburstPanelSelector(),
    glyphWrap: getStarburstGlyphWrapSelector(),
    sensorChips: getStarburstSensorChipSelector(),
    sensorLabel: getStarburstSensorLabelSelector(),
  };
}

export const DEEP_STARBURST_SELECTORS = Object.freeze(getStarburstSelectors());
