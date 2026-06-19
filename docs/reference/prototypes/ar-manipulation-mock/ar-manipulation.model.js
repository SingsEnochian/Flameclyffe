export const AR_OBJECT = {
  id: 'observer-core',
  label: 'Observer Core',
  type: 'field-orb',
  canGrab: true,
  canRotate: true,
  canScale: true,
  canAnchor: true,
  canMoveDepth: true,
  minScale: 0.55,
  maxScale: 2.4,
  minZ: -180,
  maxZ: 180,
};

export const AR_MANIPULATION_CONFIG = {
  step: 14,
  zStep: 18,
  rotationStep: 12,
  scaleStep: 0.1,
  pulseMs: 900,
  dismissOpacity: 0.18,
};

export const DEFAULT_MANIPULATION_STATE = {
  x: 0,
  y: 0,
  z: 0,
  rotation: 0,
  scale: 1,
  mode: 'idle',
  anchor: 'floating',
  visible: true,
  pulsing: false,
  selectedIntent: 'select',
};

export const AR_INTENTS = [
  'hover',
  'select',
  'grab',
  'release',
  'drag',
  'rotate',
  'scale',
  'anchor',
  'dismiss',
  'pulse',
];
