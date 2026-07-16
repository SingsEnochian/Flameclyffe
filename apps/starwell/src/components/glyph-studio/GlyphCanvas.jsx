import React, { useMemo, useRef, useState } from 'react';
import { VIEWBOX, brushRuntime, clamp, makeId } from './glyphStudioModel.js';
import RasterSurface from './RasterSurface.jsx';

function pointWidth(stroke, point, index) {
  const pressure = clamp(point.pressure ?? 0.5, stroke.brush.minPressure, 1);
  const pressureMultiplier = (1 - stroke.brush.pressureSize) + stroke.brush.pressureSize * pressure;
  const progress = stroke.points.length > 1 ? index / (stroke.points.length - 1) : 0.5;
  const startTaper = stroke.brush.taperStart > 0
    ? clamp(progress / stroke.brush.taperStart, 0.08, 1)
    : 1;
  const endTaper = stroke.brush.taperEnd > 0
    ? clamp((1 - progress) / stroke.brush.taperEnd, 0.08, 1)
    : 1;
  return Math.max(1, stroke.brush.size * pressureMultiplier * Math.min(startTaper, endTaper));
}

function pointOpacity(stroke, point) {
  const pressure = clamp(point.pressure ?? 0.5, 0, 1);
  const pressureMultiplier = (1 - stroke.brush.pressureOpacity)
    + stroke.brush.pressureOpacity * pressure;
  return clamp(stroke.brush.opacity * pressureMultiplier, 0, 1);
}

export function StrokeMarks({ stroke }) {
  if (!stroke?.points?.length) return null;
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    return (
      <circle
        cx={point.x}
        cy={point.y}
        r={pointWidth(stroke, point, 0) / 2}
        fill={stroke.brush.colour}
        opacity={pointOpacity(stroke, point)}
      />
    );
  }

  return stroke.points.slice(1).map((point, index) => {
    const previous = stroke.points[index];
    const width = (pointWidth(stroke, previous, index) + pointWidth(stroke, point, index + 1)) / 2;
    return (
      <line
        key={`${stroke.id}-${index}`}
        x1={previous.x}
        y1={previous.y}
        x2={point.x}
        y2={point.y}
        stroke={stroke.brush.colour}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={(pointOpacity(stroke, previous) + pointOpacity(stroke, point)) / 2}
      />
    );
  });
}

function MetricGuides({ guides }) {
  const gridLines = [];
  if (guides.grid) {
    for (let value = 100; value < VIEWBOX; value += 100) {
      gridLines.push(<line key={`x-${value}`} x1={value} y1="0" x2={value} y2={VIEWBOX} className="guide-grid" />);
      gridLines.push(<line key={`y-${value}`} x1="0" y1={value} x2={VIEWBOX} y2={value} className="guide-grid" />);
    }
  }

  return (
    <g aria-hidden="true">
      {gridLines}
      {guides.metrics && <>
        <line x1="0" y1="120" x2={VIEWBOX} y2="120" className="guide-metric ascender" />
        <line x1="0" y1="250" x2={VIEWBOX} y2="250" className="guide-metric cap" />
        <line x1="0" y1="470" x2={VIEWBOX} y2="470" className="guide-metric xheight" />
        <line x1="0" y1="760" x2={VIEWBOX} y2="760" className="guide-metric baseline" />
        <line x1="0" y1="900" x2={VIEWBOX} y2="900" className="guide-metric descender" />
      </>}
      {guides.axes && <>
        <line x1="500" y1="0" x2="500" y2={VIEWBOX} className="guide-axis" />
        <line x1="0" y1="500" x2={VIEWBOX} y2="500" className="guide-axis" />
      </>}
    </g>
  );
}

function TextLayerMark({ layer }) {
  const text = layer.text;
  if (!text) return null;
  const content = text.capitals ? String(text.content || '').toUpperCase() : String(text.content || '');
  const lines = content.split('\n');
  const anchor = text.alignment === 'center' ? 'middle' : text.alignment === 'right' ? 'end' : 'start';
  const transform = text.orientation === 'vertical' ? `rotate(90 ${text.x} ${text.y})` : undefined;
  return (
    <text
      x={text.x}
      y={text.y + Number(text.baseline || 0)}
      transform={transform}
      fill={text.outline ? 'none' : text.colour}
      stroke={text.outline ? text.colour : 'none'}
      strokeWidth={text.outline ? Math.max(1, Number(text.size) * 0.025) : 0}
      fontFamily={text.family}
      fontSize={text.size}
      fontStyle={text.style}
      fontWeight={text.weight}
      textAnchor={anchor}
      textDecoration={text.underline ? 'underline' : 'none'}
      style={{ letterSpacing: `${Number(text.tracking || 0)}px` }}
    >
      {lines.map((line, index) => (
        <tspan key={`${layer.id}-${index}`} x={text.x} dy={index === 0 ? 0 : Number(text.size) * Number(text.leading || 1.2)}>{line || ' '}</tspan>
      ))}
    </text>
  );
}

function layerBlend(mode) {
  return mode === 'normal' ? 'normal' : mode;
}

export default function GlyphCanvas({ glyph, activeLayer, activeBrush, guides, onCommitStroke }) {
  const svgRef = useRef(null);
  const drawingRef = useRef(null);
  const [draftStroke, setDraftStroke] = useState(null);
  const [stylus, setStylus] = useState({ type: 'none', pressure: 0, tiltX: 0, tiltY: 0, twist: 0 });
  const visibleVectorLayers = useMemo(
    () => glyph.layers.filter((layer) => layer.visible && layer.kind !== 'raster'),
    [glyph.layers],
  );

  function eventPoint(event) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return {
      x: clamp(local.x, 0, VIEWBOX),
      y: clamp(local.y, 0, VIEWBOX),
      pressure: event.pointerType === 'mouse' ? 0.5 : clamp(event.pressure || 0.01, 0.01, 1),
      tiltX: Number(event.tiltX || 0),
      tiltY: Number(event.tiltY || 0),
      twist: Number(event.twist || 0),
      t: performance.now(),
    };
  }

  function appendEvent(event) {
    const stroke = drawingRef.current;
    if (!stroke) return;
    const raw = eventPoint(event);
    if (!raw) return;
    const previous = stroke.points[stroke.points.length - 1];
    const alpha = 1 - clamp(stroke.brush.streamline + stroke.brush.stabilization * 0.35, 0, 0.95);
    const point = previous ? {
      ...raw,
      x: previous.x + (raw.x - previous.x) * alpha,
      y: previous.y + (raw.y - previous.y) * alpha,
    } : raw;
    stroke.points.push(point);
    setStylus({ type: event.pointerType, pressure: point.pressure, tiltX: point.tiltX, tiltY: point.tiltY, twist: point.twist });
  }

  function startStroke(event) {
    if (!activeLayer || !activeBrush || activeLayer.locked || !['vector', 'raster'].includes(activeLayer.kind) || event.button > 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = {
      id: makeId('stroke'),
      layerId: activeLayer.id,
      pointerType: event.pointerType,
      brushId: activeBrush.id,
      brush: brushRuntime(activeBrush),
      points: [],
      createdAt: new Date().toISOString(),
    };
    drawingRef.current = stroke;
    appendEvent(event);
    setDraftStroke({ ...stroke, points: [...stroke.points] });
  }

  function moveStroke(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const events = event.getCoalescedEvents?.() || [event];
    events.forEach(appendEvent);
    const stroke = drawingRef.current;
    setDraftStroke({ ...stroke, points: [...stroke.points] });
  }

  function finishStroke(event) {
    const stroke = drawingRef.current;
    if (!stroke) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drawingRef.current = null;
    setDraftStroke(null);
    if (stroke.points.length) onCommitStroke(stroke);
  }

  return (
    <div className="glyph-stage-wrap">
      <div className="glyph-stage-surface">
        <RasterSurface glyph={glyph} />
        <svg
          ref={svgRef}
          className="glyph-stage"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          onPointerDown={startStroke}
          onPointerMove={moveStroke}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label={`Drawing canvas for ${glyph.name}`}
        >
          <MetricGuides guides={guides} />
          {visibleVectorLayers.map((layer) => (
            <g key={layer.id} opacity={layer.opacity} style={{ mixBlendMode: layerBlend(layer.blendMode) }} data-layer-kind={layer.kind}>
              {layer.kind === 'text' && <TextLayerMark layer={layer} />}
              {glyph.strokes.filter((stroke) => stroke.layerId === layer.id).map((stroke) => <StrokeMarks key={stroke.id} stroke={stroke} />)}
            </g>
          ))}
          {draftStroke && <StrokeMarks stroke={draftStroke} />}
        </svg>
      </div>
      <div className="stage-readout" aria-live="polite">
        <span>{stylus.type}</span>
        <span>P {stylus.pressure.toFixed(2)}</span>
        <span>T {stylus.tiltX}/{stylus.tiltY}</span>
        <span>R {stylus.twist}°</span>
        <span>{activeLayer?.kind === 'raster' ? 'PIXEL' : 'VECTOR'}</span>
      </div>
      {!['vector', 'raster'].includes(activeLayer?.kind) && <div className="stage-mode-note">Select a vector or raster layer to draw. Current layer: {activeLayer?.kind || 'none'}.</div>}
    </div>
  );
}
