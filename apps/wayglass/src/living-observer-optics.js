// Wayglass Observer optical geometry and touch mapping. Pure and independently testable.
// Pointer selection targets actual nodes; rotating the instrument never edits a reading.
export const OBSERVER_PLATE_SIZE = 820;
export const OBSERVER_NODE_RADIUS = 290;
export const OBSERVER_TAU = Math.PI * 2;

export function observerNodes(channelIds, rotation = 0) {
  if (!Array.isArray(channelIds) || !channelIds.length) return [];
  return channelIds.map((id, index) => {
    const angle = -Math.PI / 2 + index * OBSERVER_TAU / channelIds.length + rotation;
    return Object.freeze({
      id,
      angle,
      x: OBSERVER_PLATE_SIZE / 2 + Math.cos(angle) * OBSERVER_NODE_RADIUS,
      y: OBSERVER_PLATE_SIZE / 2 + Math.sin(angle) * OBSERVER_NODE_RADIUS,
    });
  });
}

export function platePoint(clientX, clientY, rect) {
  if (!rect || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: (clientX - rect.left) * OBSERVER_PLATE_SIZE / rect.width,
    y: (clientY - rect.top) * OBSERVER_PLATE_SIZE / rect.height,
  };
}

export function nodeAtPoint(point, channelIds, rotation = 0, tolerance = 39) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  let nearest = null, distance = Math.max(0, tolerance);
  for (const node of observerNodes(channelIds, rotation)) {
    const d = Math.hypot(point.x - node.x, point.y - node.y);
    if (d <= distance) { distance = d; nearest = node.id; }
  }
  return nearest;
}

export function angularDelta(previous, current, centre = OBSERVER_PLATE_SIZE / 2) {
  if (!previous || !current) return 0;
  const a = Math.atan2(previous.y - centre, previous.x - centre);
  const b = Math.atan2(current.y - centre, current.x - centre);
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

export function createObserverRotation() {
  let angle = 0;
  let velocity = 0;
  return Object.freeze({
    get angle() { return angle; },
    drag(delta) {
      if (!Number.isFinite(delta)) return angle;
      const bounded = Math.max(-0.25, Math.min(0.25, delta));
      angle += bounded;
      velocity = bounded * 0.65;
      return angle;
    },
    settle({ reducedMotion = false, lowStim = false } = {}) {
      if (reducedMotion || lowStim) { velocity = 0; return angle; }
      angle += velocity;
      velocity *= 0.91;
      if (Math.abs(velocity) < 0.00008) velocity = 0;
      return angle;
    },
    stop() { velocity = 0; },
  });
}
