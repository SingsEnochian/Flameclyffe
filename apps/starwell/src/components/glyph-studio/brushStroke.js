import { brushRuntime, clamp } from './glyphStudioModel.js';

export function smoothBrushPoint(brush, previous, raw) {
  if (!previous) return raw;
  const alpha = 1 - clamp(brush.streamline + brush.stabilization * 0.35, 0, 0.95);
  return { ...raw, x: previous.x + (raw.x - previous.x) * alpha, y: previous.y + (raw.y - previous.y) * alpha };
}

// A repeatable pen gesture, rendered with the same runtime and smoothing as drawing.
export function makeBrushSample(brush) {
  const runtime = brushRuntime(brush);
  const points = [];
  for (let index = 0; index <= 64; index += 1) {
    const progress = index / 64;
    const raw = {
      x: 110 + progress * 780,
      y: 250 - Math.sin(progress * Math.PI * 2) * 75,
      pressure: 0.15 + Math.sin(progress * Math.PI) * 0.85,
    };
    points.push(smoothBrushPoint(runtime, points.at(-1), raw));
  }
  return { id: 'brush-sample', brush: runtime, points };
}

// Only the pointer that began a stroke may append to or finish it.
export function createStrokeInput(pointFromEvent) {
  let current = null;
  let pointerId = null;
  function owns(event) { return current !== null && event.pointerId === pointerId; }
  function append(event) {
    if (!owns(event)) return false;
    const raw = pointFromEvent(event);
    if (!raw) return false;
    current.points.push(smoothBrushPoint(current.brush, current.points.at(-1), raw));
    return true;
  }
  return {
    get current() { return current; },
    owns,
    start(event, stroke) {
      if (current) return false;
      current = stroke;
      pointerId = event.pointerId;
      if (!append(event)) { current = null; pointerId = null; return false; }
      return true;
    },
    move(event) {
      if (!owns(event)) return false;
      const native = event.nativeEvent || event;
      const samples = native.getCoalescedEvents?.();
      (samples?.length ? samples : [event]).forEach(append);
      return true;
    },
    finish(event) {
      if (!owns(event)) return null;
      // Cancellation/lost capture preserves collected ink without inventing a point.
      if (event.type === 'pointerup') {
        const raw = pointFromEvent(event);
        const previous = current.points.at(-1);
        if (raw && previous && (raw.x !== previous.x || raw.y !== previous.y)) {
          current.points.push(smoothBrushPoint(current.brush, previous, { ...raw, pressure: previous.pressure }));
        }
      }
      const finished = current;
      current = null;
      pointerId = null;
      return finished;
    },
  };
}
