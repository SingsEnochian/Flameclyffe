'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGlyphLiveService } = require('../lib/glyph-live');

test('live glyph service updates its registry and aggregates current sources', () => {
  const live = createGlyphLiveService();
  live.ingest({ id: 'a', kind: 'measured', metrics: { P: 0.8, Q: 0.6 } });
  const glyph = live.ingest({ id: 'b', kind: 'derived', metrics: { P: 0.4, Q: 0.8 } });
  assert.equal(glyph.canonical_vector.P, 0.6);
  assert.equal(glyph.canonical_vector.Q, 0.7);
  assert.equal(live.status().source_count, 2);
  assert.equal(live.status().client_count, 0);
  assert.equal(live.remove('a'), true);
  assert.equal(live.latest.canonical_vector.P, 0.4);
});
