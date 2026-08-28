import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SIGILLUM_DEI_AEMETH_GEOMETRY_VERSION,
  SIGILLUM_DEI_AEMETH_WITNESS,
  regularPolygonPoints,
  renderSigillumDeiAemethSvg,
  sigillumDeiAemethGeometry,
  steppedStarPoints,
} from '../src/aemeth-seal-vectors.js';

test('Sigillum vector is rooted in the public-domain Sloane MS 3188 manuscript witness', () => {
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.date, '1582');
  assert.match(SIGILLUM_DEI_AEMETH_WITNESS.source, /Sloane MS 3188/);
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.rightsState, 'public-domain');
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.geometryAuthority, 'primary-manuscript witness');
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.geometryVersion, SIGILLUM_DEI_AEMETH_GEOMETRY_VERSION);
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.comparisonWitness.rightsState, 'restricted');
  assert.equal(SIGILLUM_DEI_AEMETH_WITNESS.comparisonWitness.publicAssetAllowed, false);
});

test('first Sigillum pass preserves fortyfold outer and sevenfold inner geometry', () => {
  const geometry = sigillumDeiAemethGeometry();
  const sectorLayer = geometry.layers.find((layer) => layer.id === 'outer-annulus-sectors');
  const heptagon = geometry.layers.find((layer) => layer.id === 'outer-heptagon');
  const heptagram = geometry.layers.find((layer) => layer.id === 'great-heptagram');
  assert.equal(sectorLayer.count, 40);
  assert.equal(heptagon.count, 7);
  assert.equal(heptagram.count, 7);
  assert.equal(heptagram.step, 2);
  assert.equal(regularPolygonPoints(7, 100).length, 7);
  assert.equal(steppedStarPoints(7, 2, 100).length, 7);
});

test('Sigillum SVG is semantic vector geometry with forty explicit sectors and no raster image', () => {
  const svg = renderSigillumDeiAemethSvg();
  assert.match(svg, /viewBox="0 0 1000 1000"/);
  assert.equal((svg.match(/data-aemeth-sigil-sector=/g) || []).length, 40);
  for (const layer of ['outer-boundaries', 'outer-sevenfold', 'middle-sevenfold', 'inner-sevenfold']) {
    assert.match(svg, new RegExp(`data-aemeth-sigil-layer="${layer}"`));
  }
  assert.match(svg, /data-aemeth-sigil-shape="central-heptagram"/);
  assert.doesNotMatch(svg, /<image|data:image|\.png|\.jpg/i);
});

test('inscriptions remain outside the geometry pass until transcription evidence is verified', () => {
  const geometry = sigillumDeiAemethGeometry();
  assert.equal(geometry.inscriptions.status, 'pending-verification');
  assert.equal(geometry.inscriptions.committed, false);
  assert.match(geometry.inscriptions.reason, /modern private typesetting is never copied/i);
});
