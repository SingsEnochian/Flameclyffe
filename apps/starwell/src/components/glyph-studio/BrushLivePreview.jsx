import React, { useMemo } from 'react';
import { StrokeMarks } from './GlyphCanvas.jsx';
import { brushRuntime, clamp } from './glyphStudioModel.js';

const RAW_POINTS = Object.freeze([
  { x: 24, y: 66, pressure: 0.16, tiltX: 10, tiltY: 4, twist: 0, t: 0 },
  { x: 62, y: 45, pressure: 0.32, tiltX: 18, tiltY: 8, twist: 18, t: 20 },
  { x: 105, y: 34, pressure: 0.58, tiltX: 28, tiltY: 12, twist: 42, t: 40 },
  { x: 154, y: 51, pressure: 0.88, tiltX: 36, tiltY: 18, twist: 70, t: 60 },
  { x: 203, y: 69, pressure: 0.7, tiltX: 31, tiltY: 12, twist: 102, t: 80 },
  { x: 250, y: 55, pressure: 0.44, tiltX: 22, tiltY: 8, twist: 138, t: 100 },
  { x: 296, y: 31, pressure: 0.2, tiltX: 12, tiltY: 5, twist: 170, t: 120 },
]);

function previewStroke(brush) {
  const runtime = brushRuntime(brush);
  const alpha = 1 - clamp(runtime.streamline + runtime.stabilization * 0.35, 0, 0.95);
  const points = [];
  for (const raw of RAW_POINTS) {
    const previous = points[points.length - 1];
    points.push(previous ? {
      ...raw,
      x: previous.x + (raw.x - previous.x) * alpha,
      y: previous.y + (raw.y - previous.y) * alpha,
    } : { ...raw });
  }
  return {
    id: `preview-${brush.id}`,
    brushId: brush.id,
    pointerType: 'pen',
    brush: runtime,
    points,
  };
}

export default function BrushLivePreview({ brush }) {
  const stroke = useMemo(() => previewStroke(brush), [brush]);
  return (
    <svg
      viewBox="0 0 320 100"
      role="img"
      aria-label={`Live stroke preview for ${brush.name}`}
      style={{ width: '100%', height: '5.4rem', display: 'block', overflow: 'visible' }}
      data-brush-preview-id={brush.id}
    >
      <StrokeMarks stroke={stroke} />
    </svg>
  );
}

export { previewStroke };
