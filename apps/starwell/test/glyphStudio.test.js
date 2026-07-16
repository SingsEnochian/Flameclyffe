import assert from 'node:assert/strict';
import test from 'node:test';
import { BRUSH_ATTRIBUTE_GROUPS, makeBrushLibrary, makeGlyph, makeProject } from '../src/components/glyph-studio/glyphStudioModel.js';
import { glyphToSvg, makeColourState, normaliseGlyph, normaliseProject, projectReceipt } from '../src/components/glyph-studio/glyphStudioIO.js';

test('brush library exposes the full studio attribute rail', () => {
  const library = makeBrushLibrary();
  assert.equal(BRUSH_ATTRIBUTE_GROUPS.length, 14);
  assert.ok(library.brushes.length >= 2);
  assert.ok(library.sets.some((set) => set.name === 'Recent'));
  assert.ok(library.sets.some((set) => set.name === 'Pinned'));
  assert.ok(library.brushes[0].attributes.applePencil);
});

test('project normalisation upgrades legacy layers into studio layers', () => {
  const project = makeProject();
  project.glyphs[0].layers = [{ id: 'legacy', name: 'Legacy Ink', visible: true, locked: false }];
  const normalised = normaliseProject(project);
  const layer = normalised.glyphs[0].layers[0];
  assert.equal(layer.kind, 'vector');
  assert.equal(layer.opacity, 1);
  assert.equal(layer.blendMode, 'normal');
  assert.equal(normalised.activeGlyphId, normalised.glyphs[0].id);
});

test('SVG export preserves glyph metadata, text, and excludes private layers', () => {
  const glyph = normaliseGlyph(makeGlyph('Test Bridge', '◇'));
  const vectorLayer = glyph.layers[0];
  const privateLayer = { ...vectorLayer, id: 'private', name: 'Private', private: true };
  const textLayer = {
    ...vectorLayer,
    id: 'text',
    name: 'Text',
    kind: 'text',
    text: {
      content: 'STARWELL', x: 100, y: 200, family: 'serif', size: 80, style: 'normal', weight: 400,
      tracking: 0, leading: 1.2, baseline: 0, alignment: 'left', orientation: 'horizontal',
      capitals: false, colour: '#e6c67a', outline: false, underline: false,
    },
  };
  glyph.layers = [vectorLayer, privateLayer, textLayer];
  glyph.strokes = [{
    id: 'stroke-1', layerId: vectorLayer.id, points: [{ x: 10, y: 20, pressure: 0.5 }, { x: 100, y: 120, pressure: 0.8 }],
    brush: { size: 20, opacity: 1, pressureSize: 1, pressureOpacity: 0, minPressure: 0.08, taperStart: 0, taperEnd: 0, colour: '#000000' },
  }, {
    id: 'stroke-private', layerId: privateLayer.id, points: [{ x: 1, y: 1, pressure: 1 }],
    brush: { size: 10, opacity: 1, pressureSize: 0, pressureOpacity: 0, minPressure: 0.08, taperStart: 0, taperEnd: 0, colour: '#ff0000' },
  }];
  const svg = glyphToSvg(glyph, 'display-p3');
  assert.match(svg, /Test Bridge/);
  assert.match(svg, /STARWELL/);
  assert.match(svg, /data-colour-profile="display-p3"/);
  assert.doesNotMatch(svg, /stroke-private/);
  assert.doesNotMatch(svg, /Private/);
});

test('export receipt states the FontForge boundary honestly', () => {
  const project = makeProject();
  const library = makeBrushLibrary();
  const receipt = projectReceipt(project, library, makeColourState());
  assert.equal(receipt.fontForge.status, 'not-compiled');
  assert.equal(receipt.glyphCount, 1);
  assert.equal(receipt.brushCount, library.brushes.length);
});
