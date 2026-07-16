import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  FONTFORGE_PYTHON,
  buildFontJob,
  eligibleLayer,
  fontForgeCandidates,
  glyphOutlineSvg,
  parseCodepoint,
} = require('../../starwell-server/fontforge/worker.js');

function projectFixture() {
  return {
    id: 'project-test',
    name: 'Kelyran Test',
    glyphs: [{
      id: 'glyph-test',
      name: 'Bridge Mark',
      character: '◇',
      codepoint: 'E000',
      advanceWidth: 920,
      leftBearing: 60,
      rightBearing: 80,
      layers: [
        { id: 'ink', name: 'Ink', kind: 'vector', visible: true, opacity: 1, blendMode: 'normal' },
        { id: 'private', name: 'Private', kind: 'vector', visible: true, opacity: 1, blendMode: 'normal', private: true },
        { id: 'paint', name: 'Paint', kind: 'raster', visible: true, opacity: 1, blendMode: 'normal' },
      ],
      strokes: [
        {
          id: 'stroke-visible',
          layerId: 'ink',
          brush: { size: 40, pressureSize: 0.5, minPressure: 0.08, taperStart: 0.1, taperEnd: 0.1 },
          points: [
            { x: 120, y: 720, pressure: 0.4 },
            { x: 500, y: 300, pressure: 0.9 },
            { x: 850, y: 720, pressure: 0.5 },
          ],
        },
        {
          id: 'stroke-private',
          layerId: 'private',
          brush: { size: 100, pressureSize: 0 },
          points: [{ x: 999, y: 999, pressure: 1 }],
        },
      ],
    }],
  };
}

test('FontForge outline conversion creates filled geometry and excludes private layers', () => {
  const project = projectFixture();
  const svg = glyphOutlineSvg(project.glyphs[0]);
  assert.match(svg, /<polygon/);
  assert.match(svg, /<circle/);
  assert.match(svg, /translate\(0 760\) scale\(1 -1\)/);
  assert.doesNotMatch(svg, /999\.000/);
  assert.doesNotMatch(svg, /stroke-private/);
});

test('FontForge job records eligible and excluded layers with deterministic outputs', () => {
  const job = buildFontJob(projectFixture(), { familyName: 'Kelyran Test', formats: ['ttf', 'otf', 'exe', 'ttf'] });
  assert.equal(job.schemaVersion, 'starwell.fontforge.job.v0.2');
  assert.equal(job.fontName, 'KelyranTest');
  assert.deepEqual(job.formats, ['ttf', 'otf']);
  assert.equal(job.glyphs[0].glyphName, 'uniE000');
  assert.equal(job.glyphs[0].strokeCount, 1);
  assert.equal(job.glyphs[0].eligibleVectorLayers.length, 1);
  assert.equal(job.glyphs[0].excludedLayers.length, 2);
  assert.equal(job.totalPoints, 3);
});

test('FontForge job rejects duplicate and invalid Unicode scalar values', () => {
  const project = projectFixture();
  project.glyphs.push({ ...structuredClone(project.glyphs[0]), id: 'duplicate' });
  assert.throws(() => buildFontJob(project), /Duplicate codepoint/);
  assert.throws(() => parseCodepoint('D800'), /scalar range/);
  assert.throws(() => parseCodepoint('NOTHEX'), /Invalid Unicode/);
});

test('font source eligibility excludes reference, masks, clipping, hidden, and blended layers', () => {
  assert.equal(eligibleLayer({ kind: 'vector', visible: true, opacity: 1, blendMode: 'normal' }), true);
  assert.equal(eligibleLayer({ kind: 'vector', visible: true, reference: true }), false);
  assert.equal(eligibleLayer({ kind: 'vector', visible: true, maskOf: 'ink' }), false);
  assert.equal(eligibleLayer({ kind: 'vector', visible: true, clippingMask: true }), false);
  assert.equal(eligibleLayer({ kind: 'vector', visible: false }), false);
  assert.equal(eligibleLayer({ kind: 'vector', visible: true, blendMode: 'multiply' }), false);
});

test('worker invocation contract disables init scripts and plugins', () => {
  assert.match(FONTFORGE_PYTHON, /importOutlines/);
  assert.match(FONTFORGE_PYTHON, /removeOverlap/);
  assert.match(FONTFORGE_PYTHON, /font\.generate/);
  const candidates = fontForgeCandidates({}, 'win32');
  assert.ok(candidates.some((candidate) => candidate.toLowerCase().includes('fontforge')));
});
