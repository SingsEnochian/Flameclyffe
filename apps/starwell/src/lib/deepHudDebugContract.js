export const DEEP_HUD_DEBUG = Object.freeze({
  beadClass: 'deep-hud-debug-bead',
  beadAriaLabel: 'DEEP HUD bounds debug status',
  beadDatasetKey: 'deepHudDebug',
  beadDatasetValue: 'bead',
  queryParam: 'deepHudDebug',
  queryEnabledValue: '1',
  storageKey: 'deepHudDebug',
  storageEnabledValue: 'true',
  socketLogPrefix: '[DEEP HUD socket]',
  diagnosticState: 'diagnostic',
  activeState: 'active',
  panelKey: 'status',
  fallbackZone: 'bottom-rail',
  panelSize: Object.freeze({
    width: 164,
    height: 52,
  }),
});
