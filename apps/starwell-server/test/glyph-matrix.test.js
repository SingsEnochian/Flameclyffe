'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateGlyphMatrix, routeGlyphRequest } = require('../lib/glyph-matrix');

test('normalises percentage metrics and derives a provenance-bearing glyph', () => {
  const glyph = generateGlyphMatrix({ sources: [{ id: 'mythience-ui', kind: 'derived-observer-vector', metrics: { P: 0.78, C: 82, R: 76, E: 0.31, M: 0.71, A: 0.79, Q: 0.79 } }] });
  assert.equal(glyph.canonical_vector.C, 0.82);
  assert.equal(glyph.canonical_vector.R, 0.76);
  assert.equal(glyph.geometry_matrix.base_vertex_count, 10);
  assert.match(glyph.glyph_id, /^GLYPH_SET_[0-9a-f-]+$/);
  assert.equal(glyph.provenance[0].source_id, 'mythience-ui');
  assert.match(glyph.boundary, /render instruction/);
});

test('averages each metric only across sources that supplied it', () => {
  const glyph = generateGlyphMatrix({ sources: [
    { id: 'a', metrics: { P: 0.8, C: 0.6 } },
    { id: 'b', metrics: { P: 0.4 } },
  ] });
  assert.equal(glyph.canonical_vector.P, 0.6);
  assert.equal(glyph.canonical_vector.C, 0.6);
  assert.deepEqual(glyph.aggregation.metric_counts, { P: 2, C: 1 });
});

test('refuses empty or simulated default input', () => {
  assert.throws(() => generateGlyphMatrix(), /real source payload/);
});

test('orchestrator routes explicit matrix instructions and requires payloads', () => {
  assert.equal(routeGlyphRequest({ instruction: 'other instrument' }), null);
  const glyph = routeGlyphRequest({ instruction: 'combine this matrix', sources: [{ id: 'capture', metrics: { Q: 0.75 } }] });
  assert.equal(glyph.canonical_vector.Q, 0.75);
});
