export const CONSENT_WEB_CORE = {
  x: 500,
  y: 390,
  label: 'DEEP',
};

export const CONSENT_WEB_CONFIG = {
  bend: 70,
  activityMs: 1400,
  nodeRadius: 34,
  coreRadius: 48,
  labelOffsetY: 58,
  coreLabelOffsetY: 6,
};

export const CONSENT_BRANCHES = [
  { id: 'visual', label: 'Visual Bloom', state: 'on', x: 500, y: 115, description: 'Glow, bloom, and visual emphasis only.' },
  { id: 'sound', label: 'Sound', state: 'off', x: 685, y: 145, description: 'Audible tones and ambience. Not started here.' },
  { id: 'subbass', label: 'Sub-bass', state: 'off', x: 835, y: 280, description: 'Low-frequency body signal. Not started here.' },
  { id: 'haptics', label: 'Haptics', state: 'blocked', x: 870, y: 485, description: 'Device vibration or external haptics.' },
  { id: 'camera', label: 'Camera', state: 'off', x: 735, y: 640, description: 'Vision input. Requires explicit separate consent.' },
  { id: 'gesture', label: 'Gesture Manipulation', state: 'off', x: 500, y: 690, description: 'Spatial grab, rotate, scale, and anchor intents for AR.' },
  { id: 'gaze', label: 'Gaze', state: 'off', x: 265, y: 640, description: 'Eye or pointer attention signal.' },
  { id: 'location', label: 'Location', state: 'blocked', x: 130, y: 485, description: 'Geolocation signal. Blocked in this sketch.' },
  { id: 'logging', label: 'Export / Logging', state: 'on', x: 165, y: 280, description: 'Local notes, exports, or almanac logs.' },
  { id: 'depth', label: 'Depth / LiDAR', state: 'off', x: 315, y: 145, description: 'Spatial depth events for AR. Not started here.' },
];
