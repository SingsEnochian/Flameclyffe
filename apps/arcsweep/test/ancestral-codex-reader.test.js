import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  ancestralCodexForSystem,
  ancestralCodexIndex,
  ancestralCodexSnapshot,
} from '../src/ancestral-codex-reader.js';

test('Universal Codex ancestral reader exposes four-pane archaeology without source prose', () => {
  const snapshot = ancestralCodexSnapshot('ancestral:amalthi-transition');
  assert.equal(snapshot.selected.kind, 'ancestral-root');
  assert.equal(snapshot.public_source_text_present, false);
  assert.equal(snapshot.canon_merge_authority, false);
  assert.match(snapshot.boundary, /does not merge canons/i);
  assert.ok(snapshot.related.some((node) => node.kind === 'correspondence'));
});

test('system lineage shows reviewed correspondences into Runa', () => {
  const lineage = ancestralCodexForSystem('runa');
  assert.equal(lineage.system_ref, 'runa');
  assert.equal(lineage.correspondences.length, 1);
  assert.equal(lineage.correspondences[0].correspondence_id, 'correspondence:resonance-state');
  assert.ok(lineage.roots.some((root) => root.root_id === 'ancestral:kalladia-cycle'));
});

test('reader index keeps roots, correspondences and present systems distinct', () => {
  const index = ancestralCodexIndex();
  assert.ok(index.some((item) => item.kind === 'ancestral-root'));
  assert.ok(index.some((item) => item.kind === 'correspondence'));
  assert.ok(index.some((item) => item.kind === 'present-system'));
});

test('Vite packages the ancestral reader as a first-class ArcSweep route', async () => {
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../ancestry/index.html', import.meta.url), 'utf8');
  assert.match(vite, /ancestry:\s*resolve\(ARCSWEEP_ROOT, 'ancestry\/index\.html'\)/);
  assert.match(html, /Universal Codex · Ancestral Reader/);
  assert.match(html, /Root → Correspondence → Present System/);
});
