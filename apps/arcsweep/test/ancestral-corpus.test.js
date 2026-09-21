import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  bindPrivateAncestralSource,
  buildAncestralTraversal,
  createAncestralCorpus,
  queryAncestralCorpus,
  validateAncestralManifest,
} from '../src/ancestral-corpus.js';
import { ANCESTRAL_PUBLIC_MANIFEST } from '../src/ancestral-corpus-seed.js';

test('public ancestral manifest contains no source refs or manuscript prose', async () => {
  assert.equal(validateAncestralManifest(ANCESTRAL_PUBLIC_MANIFEST), true);
  for (const root of ANCESTRAL_PUBLIC_MANIFEST.roots) {
    assert.equal(root.source_ref, null);
    assert.equal(Object.prototype.hasOwnProperty.call(root, 'prose'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(root, 'text'), false);
  }

  const json = JSON.parse(await readFile(new URL('../corpus/ancestral/manifest.v0.1.json', import.meta.url), 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(ANCESTRAL_PUBLIC_MANIFEST)), json);
});

test('private bindings remain runtime-only and are never returned as public source refs', () => {
  const binding = bindPrivateAncestralSource(ANCESTRAL_PUBLIC_MANIFEST, {
    rootId: 'ancestral:amalthi-transition',
    sourceRef: 'private://creator-library/amalthi',
    contentHash: 'sha256:test',
    boundAt: '2026-09-20T22:15:00-04:00',
  });
  assert.equal(binding.publication_authority, false);
  assert.equal(binding.source_ref, 'private://creator-library/amalthi');

  const corpus = createAncestralCorpus(ANCESTRAL_PUBLIC_MANIFEST, { privateBindings: [binding] });
  const result = queryAncestralCorpus(corpus, { rootIds: ['ancestral:amalthi-transition'] });
  assert.equal(result.roots.length, 1);
  assert.equal(result.roots[0].private_binding_present, true);
  assert.equal(result.roots[0].source_ref, null);
});

test('ancestral query preserves correspondence boundaries instead of merging canons', () => {
  const corpus = createAncestralCorpus(ANCESTRAL_PUBLIC_MANIFEST);
  const result = queryAncestralCorpus(corpus, { presentSystemRefs: ['runa'] });
  assert.equal(result.correspondences.length, 1);
  assert.equal(result.correspondences[0].correspondence_id, 'correspondence:resonance-state');
  assert.equal(result.correspondences[0].status, 'steward_reviewed');
  assert.equal(result.correspondences[0].confidence, 'qualitative');
});

test('traversal walks root to correspondence to present systems while preserving node kinds', () => {
  const corpus = createAncestralCorpus(ANCESTRAL_PUBLIC_MANIFEST);
  const graph = buildAncestralTraversal(corpus, 'ancestral:kalladia-cycle');
  const ids = new Set(graph.nodes.map((node) => node.id));
  assert.ok(ids.has('ancestral:kalladia-cycle'));
  assert.ok(ids.has('correspondence:relational-identity'));
  assert.ok(ids.has('correspondence:resonance-state'));
  assert.ok(ids.has('runa'));
  assert.ok(ids.has('premaqc'));
  assert.ok(ids.has('universal-codex'));
  assert.equal(graph.nodes.find((node) => node.id === 'ancestral:kalladia-cycle').kind, 'ancestral-root');
  assert.equal(graph.nodes.find((node) => node.id === 'runa').kind, 'present-system');
});
