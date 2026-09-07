import React, { useMemo, useRef, useState } from 'react';
import { VIEWBOX, brushRuntime, clamp, makeId } from './glyphStudioModel.js';
import { createLiveBrushFrame, liveBrushSensoryEngine } from './liveBrushRuntime.js';

function pointSpeedNorm(stroke, point, index) {
  const previous = index > 0 ? stroke.points[index - 1] : null;
  if (!previous) return 0;
  const dt = Math.max(1, Number(point.t || 0) - Number(previous.t || 0));
  const distance = Math.hypot(Number(point.x) - Number(previous.x), Number(point.y) - Number(previous.y));
  return clamp((distance / (dt / 1000)) / 1800, 0, 1);
}

function pointTilt(point) {
  return clamp(Math.hypot(Number(point.tiltX || 0), Number(point.tiltY || 0)) / 90, 0, 1);
}

function deterministicNoise(index, salt = 0) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}

function pointWidth(stroke, point, index) {
  const brush = stroke.brush || {};
  const pressure = clamp(point.pressure ?? 0.5, brush.minPressure ?? 0.08, 1);
  const pressureSize = brush.pressureSize ?? 0;
  const pressureMultiplier = (1 - pressureSize) + pressureSize * pressure;
  const progress = stroke.points.length > 1 ? index / (stroke.points.length - 1) : 0.5;
  const startTaper = (brush.taperStart ?? 0) > 0
    ? clamp(progress / brush.taperStart, 0.08, 1)
    : 1;
  const endTaper = (brush.taperEnd ?? 0) > 0
    ? clamp((1 - progress) / brush.taperEnd, 0.08, 1)
    : 1;
  const speedNorm = pointSpeedNorm(stroke, point, index);
  const speedMultiplier = 1 + (brush.speedSize ?? 0) * (speedNorm - 0.5);
  const tiltMultiplier = 1 + (brush.tiltSize ?? 0) * pointTilt(point);
  const jitterMultiplier = 1 + (brush.jitterSize ?? 0) * deterministicNoise(index, 3) * 0.35;
  const size = Number(brush.size ?? 1) * pressureMultiplier * speedMultiplier * tiltMultiplier * jitterMultiplier;
  return clamp(Math.max(1, size * Math.min(startTaper, endTaper)), brush.minSize ?? 1, brush.maxSize ?? 10000);
}

function pointOpacity(stroke, point, index) {
  const brush = stroke.brush || {};
  const pressure = clamp(point.pressure ?? 0.5, 0, 1);
  const pressureOpacity = brush.pressureOpacity ?? 0;
  const pressureMultiplier = (1 - pressureOpacity) + pressureOpacity * pressure;
  const speedNorm = pointSpeedNorm(stroke, point, index);
  const speedMultiplier = 1 + (brush.speedOpacity ?? 0) * (speedNorm - 0.5);
  const tiltMultiplier = 1 - (brush.tiltOpacity ?? 0) * pointTilt(point) * 0.7;
  const jitterMultiplier = 1 + (brush.jitterOpacity ?? 0) * deterministicNoise(index, 7) * 0.3;
  const flow = clamp(brush.flow ?? 1, 0, 1);
  const opacity = Number(brush.opacity ?? 1) * pressureMultiplier * speedMultiplier * tiltMultiplier * jitterMultiplier * flow;
  return clamp(opacity, brush.minOpacity ?? 0, brush.maxOpacity ?? 1);
}

function offsetPoint(point, brush, index) {
  const lateral = (brush.lateralJitter ?? 0) + (brush.scatter ?? 0) * 0.75;
  if (!lateral) return point;
  const amount = Math.max(1, Number(brush.size ?? 1)) * lateral * 0.45;
  return {
    ...point,
    x: Number(point.x) + deterministicNoise(index, 11) * amount,
    y: Number(point.y) + deterministicNoise(index, 17) * amount,
  };
}

function grainDash(brush, width) {
  const depth = clamp(brush.grainDepth ?? 0, 0, 1);
  const spacing = clamp(brush.spacing ?? 0, 0, 1);
  if (depth < 0.03 && spacing < 0.08) return undefined;
  const mark = Math.max(1, width * (1.65 - depth * 0.9));
  const gap = Math.max(0.5, width * (0.12 + depth * 0.9 + spacing * 1.7));
  return `${mark} ${gap}`;
}

export function StrokeMarks({ stroke }) {
  if (!stroke?.points?.length) return null;
  if (stroke.points.length === 1) {
    const point = offsetPoint(stroke.points[0], stroke.brush || {}, 0);
    return (
      <circle
        cx={point.x}
        cy={point.y}
        r={pointWidth(stroke, point, 0) / 2}
        fill={stroke.brush.colour}
        opacity={pointOpacity(stroke, point, 0)}
      />
    );
  }

  return stroke.points.slice(1).map((point, index) => {
    const previousRaw = stroke.points[index];
    const previous = offsetPoint(previousRaw, stroke.brush || {}, index);
    const current = offsetPoint(point, stroke.brush || {}, index + 1);
    const width = (pointWidth(stroke, previousRaw, index) + pointWidth(stroke, point, index + 1)) / 2;
    const opacity = (pointOpacity(stroke, previousRaw, index) + pointOpacity(stroke, point, index + 1)) / 2;
    const dash = grainDash(stroke.brush || {}, width);
    const wetEdge = clamp(stroke.brush?.wetEdges ?? 0, 0, 1);
    const metallic = clamp(stroke.brush?.metallic ?? 0, 0, 1);

    return (
      <g key={`${stroke.id}-${index}`}>
        {(wetEdge > 0.04 || metallic > 0.04) && (
          <line
            x1={previous.x}
            y1={previous.y}
            x2={current.x}
            y2={current.y}
            stroke={stroke.brush.colour}
            strokeWidth={width * (1.05 + wetEdge * 0.32 + metallic * 0.12)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity * (0.18 + wetEdge * 0.2 + metallic * 0.12)}
          />
        )}
        <line
          x1={previous.x}
          y1={previous.y}
          x2={current.x}
          y2={current.y}
          stroke={stroke.brush.colour}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
          opacity={opacity}
        />
      </g>
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
  const drawingBrushRef = useRef(null);
  const lastFrameRef = useRef(null);
  const [draftStroke, setDraftStroke] = useState(null);
  const [stylus, setStylus] = useState({ type: 'none', pressure: 0, tiltX: 0, tiltY: 0, twist: 0 });
  const visibleLayers = useMemo(() => glyph.layers.filter((layer) => layer.visible), [glyph.layers]);

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
    const brushDefinition = drawingBrushRef.current;
    if (!stroke || !brushDefinition) return;
    const raw = eventPoint(event);
    if (!raw) return;
    const previous = stroke.points[stroke.points.length - 1];
    const alpha = 1 - clamp((stroke.brush.streamline ?? 0) + (stroke.brush.stabilization ?? 0) * 0.35, 0, 0.95);
    const point = previous ? {
      ...raw,
      x: previous.x + (raw.x - previous.x) * alpha,
      y: previous.y + (raw.y - previous.y) * alpha,
    } : raw;
    stroke.points.push(point);
    const frame = createLiveBrushFrame(brushDefinition, point, previous, 'glyph-canvas');
    if (previous) liveBrushSensoryEngine.update(frame);
    else liveBrushSensoryEngine.start(frame);
    lastFrameRef.current = frame;
    setStylus({ type: event.pointerType, pressure: point.pressure, tiltX: point.tiltX, tiltY: point.tiltY, twist: point.twist });
  }

  function startStroke(event) {
    if (!activeLayer || !activeBrush || activeLayer.locked || !['vector', 'raster'].includes(activeLayer.kind) || event.button > 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const brushDefinition = structuredClone(activeBrush);
    const stroke = {
      id: makeId('stroke'),
      layerId: activeLayer.id,
      pointerType: event.pointerType,
      brushId: activeBrush.id,
      brushRevision: activeBrush.modifiedAt || null,
      brush: brushRuntime(brushDefinition),
      points: [],
      createdAt: new Date().toISOString(),
    };
    drawingRef.current = stroke;
    drawingBrushRef.current = brushDefinition;
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
    liveBrushSensoryEngine.stop(lastFrameRef.current);
    drawingRef.current = null;
    drawingBrushRef.current = null;
    lastFrameRef.current = null;
    setDraftStroke(null);
    if (stroke.points.length) onCommitStroke(stroke);
  }

  return (
    <div className="glyph-stage-wrap">
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
        <rect width={VIEWBOX} height={VIEWBOX} className="stage-paper" />
        <MetricGuides guides={guides} />
        {visibleLayers.map((layer) => (
          <g key={layer.id} opacity={layer.opacity} style={{ mixBlendMode: layerBlend(layer.blendMode) }} data-layer-kind={layer.kind}>
            {layer.kind === 'text' && <TextLayerMark layer={layer} />}
            {glyph.strokes.filter((stroke) => stroke.layerId === layer.id).map((stroke) => <StrokeMarks key={stroke.id} stroke={stroke} />)}
          </g>
        ))}
        {draftStroke && <StrokeMarks stroke={draftStroke} />}
      </svg>
      <div className="stage-readout" aria-live="polite">
        <span>{stylus.type}</span>
        <span>P {stylus.pressure.toFixed(2)}</span>
        <span>T {stylus.tiltX}/{stylus.tiltY}</span>
        <span>R {stylus.twist}°</span>
      </div>
      {!['vector', 'raster'].includes(activeLayer?.kind) && <div className="stage-mode-note">Select a vector or raster layer to draw. Current layer: {activeLayer?.kind || 'none'}.</div>}
    </div>
  );
}
