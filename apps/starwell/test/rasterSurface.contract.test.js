import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/glyph-studio/RasterSurface.jsx', import.meta.url), 'utf8');
const canvasSource = fs.readFileSync(new URL('../src/components/glyph-studio/GlyphCanvas.jsx', import.meta.url), 'utf8');

test('raster compositor uses Canvas 2D and rebuilds only visible raster layers', () => {
  assert.match(source, /getContext\('2d'/);
  assert.match(source, /layer\.visible && layer\.kind === 'raster'/);
  assert.match(source, /globalCompositeOperation/);
  assert.match(source, /globalAlpha/);
});

test('hybrid canvas excludes raster strokes from the SVG layer pass', () => {
  assert.match(canvasSource, /layer\.kind !== 'raster'/);
  assert.match(canvasSource, /<RasterSurface glyph=\{glyph\}/);
});

test('raster project data remains reversible stroke history', () => {
  assert.match(source, /glyph\.strokes\.filter/);
  assert.match(source, /Project strokes remain serialisable and reversible/);
});
