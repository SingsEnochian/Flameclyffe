import React, { useEffect, useRef } from 'react';
import { VIEWBOX, clamp } from './glyphStudioModel.js';

const COMPOSITE_MODES = new Set([
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity',
]);

function canvasBlendMode(mode) {
  if (!mode || mode === 'normal') return 'source-over';
  return COMPOSITE_MODES.has(mode) ? mode : 'source-over';
}

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

function drawStroke(context, stroke) {
  if (!stroke?.points?.length) return;
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = stroke.brush.colour;
  context.fillStyle = stroke.brush.colour;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.globalAlpha = pointOpacity(stroke, point);
    context.beginPath();
    context.arc(point.x, point.y, pointWidth(stroke, point, 0) / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  stroke.points.slice(1).forEach((point, index) => {
    const previous = stroke.points[index];
    context.globalAlpha = (pointOpacity(stroke, previous) + pointOpacity(stroke, point)) / 2;
    context.lineWidth = (pointWidth(stroke, previous, index) + pointWidth(stroke, point, index + 1)) / 2;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  });
  context.restore();
}

function renderLayer(layer, strokes) {
  const surface = document.createElement('canvas');
  surface.width = VIEWBOX;
  surface.height = VIEWBOX;
  const context = surface.getContext('2d', { alpha: true });
  if (!context) return surface;
  strokes.forEach((stroke) => drawStroke(context, stroke));
  return surface;
}

/**
 * RasterSurface is the pixel-backed half of Glyph Studio's hybrid renderer.
 * Project strokes remain serialisable and reversible; visible raster layers are
 * rebuilt into Canvas 2D surfaces in layer order whenever project state changes.
 */
export default function RasterSurface({ glyph }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !context) return;

    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const pixelSize = Math.round(VIEWBOX * ratio);
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize;
      canvas.height = pixelSize;
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, VIEWBOX, VIEWBOX);

    glyph.layers
      .filter((layer) => layer.visible && layer.kind === 'raster')
      .forEach((layer) => {
        const strokes = glyph.strokes.filter((stroke) => stroke.layerId === layer.id);
        const layerSurface = renderLayer(layer, strokes);
        context.save();
        context.globalAlpha = clamp(Number(layer.opacity ?? 1), 0, 1);
        context.globalCompositeOperation = canvasBlendMode(layer.blendMode);
        context.drawImage(layerSurface, 0, 0, VIEWBOX, VIEWBOX);
        context.restore();
      });
  }, [glyph]);

  return <canvas ref={canvasRef} className="glyph-raster-surface" width={VIEWBOX} height={VIEWBOX} aria-hidden="true" />;
}
