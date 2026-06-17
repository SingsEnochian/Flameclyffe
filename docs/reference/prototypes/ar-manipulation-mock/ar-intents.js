export const POINTER_INTENTS = {
  hover: 'hover',
  select: 'select',
  grab: 'grab',
  release: 'release',
  drag: 'drag',
  rotate: 'rotate',
  scale: 'scale',
  anchor: 'anchor',
  dismiss: 'dismiss',
  pulse: 'pulse',
  reset: 'reset',
};

export const SYNTHETIC_GESTURES = {
  pinchDrag: 'synthetic:pinch-drag',
  twoHandRotate: 'synthetic:two-hand-rotate',
  handScale: 'synthetic:hand-scale',
  airAnchor: 'synthetic:air-anchor',
};

export function normaliseIntent(intent) {
  return String(intent || POINTER_INTENTS.select).trim().toLowerCase();
}

export function describeIntent(intent) {
  const clean = normaliseIntent(intent);
  if (clean.startsWith('synthetic:')) return clean.replace('synthetic:', 'synthetic ');
  return clean;
}
