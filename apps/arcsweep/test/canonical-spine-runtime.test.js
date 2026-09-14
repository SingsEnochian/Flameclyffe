import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSpineAssetUrl, canonicalSpineHealth, inspectCanonicalNode } from '../src/canonical-spine.js';

test('Canonical Spine asset URL resolves from ArcSweep root and Spine room', () => {
  assert.equal(
    canonicalSpineAssetUrl({ origin: 'https://example.test', pathname: '/apps/arcsweep/' }),
    'https://example.test/apps/arcsweep/canonical-spine.seed.json',
  );
  assert.equal(
    canonicalSpineAssetUrl({ origin: 'https://example.test', pathname: '/apps/arcsweep/spine/' }),
    'https://example.test/apps/arcsweep/canonical-spine.seed.json',
  );
  assert.equal(
    canonicalSpineAssetUrl({ origin: 'https://example.test', pathname: '/Flameclyffe/apps/arcsweep/spine/index.html' }),
    'https://example.test/Flameclyffe/apps/arcsweep/canonical-spine.seed.json',
  );
});

test('Canonical Spine health exposes structural failures without hiding them', () => {
  const health = canonicalSpineHealth({ schema: 'wrong', nodes: [], edges: [], knowledgeBoundaries: [], receipts: [], updatedAt: 'x', architecturalRule: 'x' });
  assert.equal(health.ok, false);
  assert.ok(health.errors.length > 0);
});

test('node inspection returns incoming and outgoing topology', () => {
  const graph = {
    nodes: [
      { id: 'system:a', name: 'A' },
      { id: 'system:b', name: 'B' },
    ],
    edges: [{ from: 'system:a', to: 'system:b', type: 'depends_on' }],
    knowledgeBoundaries: [],
  };
  const inspected = inspectCanonicalNode(graph, 'system:b');
  assert.equal(inspected.incoming.length, 1);
  assert.equal(inspected.outgoing.length, 0);
});
