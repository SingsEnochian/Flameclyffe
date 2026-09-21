import test from 'node:test';
import assert from 'node:assert/strict';

import { ANCESTRAL_PUBLIC_MANIFEST } from '../src/ancestral-corpus-seed.js';
import { bindPrivateAncestralSource } from '../src/ancestral-corpus.js';
import { chunkPrivateAncestralText, redactAncestralChunk, ancestralChunkReceipt } from '../src/ancestral-chunking.js';

test('private ancestral text is chunked with positions and remains non-publishable', () => {
  const binding = bindPrivateAncestralSource(ANCESTRAL_PUBLIC_MANIFEST, {
    rootId: 'ancestral:kalladia-cycle',
    sourceRef: 'private://creator-library/kalladia',
  });
  const sourceText = 'A'.repeat(700) + 'B'.repeat(700) + 'C'.repeat(700);
  const chunks = chunkPrivateAncestralText({ binding, sourceText, chunkSize: 800, overlap: 100, tags: ['test'] });
  assert.ok(chunks.length >= 3);
  assert.equal(chunks[0].position.start_char, 0);
  assert.equal(chunks[0].position.end_char, 800);
  assert.equal(chunks[1].position.start_char, 700);
  assert.equal(chunks[0].publication_authority, false);
  assert.ok(chunks[0].text.length > 0);
});

test('public chunk projection strips source locator and manuscript text', () => {
  const binding = bindPrivateAncestralSource(ANCESTRAL_PUBLIC_MANIFEST, {
    rootId: 'ancestral:amalthi-transition',
    sourceRef: 'private://creator-library/amalthi',
  });
  const [privateChunk] = chunkPrivateAncestralText({ binding, sourceText: 'private manuscript prose'.repeat(40), chunkSize: 300 });
  const publicChunk = redactAncestralChunk(privateChunk, {
    summary: 'A reviewed conceptual summary.',
    fingerprints: ['paired-regulation'],
  });
  assert.equal(publicChunk.source_ref, null);
  assert.equal(publicChunk.manuscript_text_present, false);
  assert.equal(Object.prototype.hasOwnProperty.call(publicChunk, 'text'), false);
  assert.equal(publicChunk.publication_authority, false);
});

test('chunk receipt proves no raw-text publication or canon promotion', () => {
  const receipt = ancestralChunkReceipt({ rootId: 'ancestral:amalthi-transition', chunkCount: 12, sourceHash: 'sha256:test' });
  assert.equal(receipt.raw_text_published, false);
  assert.equal(receipt.canon_promoted, false);
  assert.equal(receipt.chunk_count, 12);
});
