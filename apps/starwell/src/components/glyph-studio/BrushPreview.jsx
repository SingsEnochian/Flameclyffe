import React from 'react';
import { StrokeMarks } from './GlyphCanvas.jsx';
import { makeBrushSample } from './brushStroke.js';

export default function BrushPreview({ brush, compact = false }) {
  return (
    <svg
      className={compact ? 'brush-preview' : 'brush-live-pad'}
      viewBox="0 0 1000 500"
      role="img"
      aria-label={compact ? `${brush.name} stroke sample` : 'Brush preview pad'}
    >
      <StrokeMarks stroke={makeBrushSample(brush)} />
    </svg>
  );
}
