import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  MAGIC_BOOK_BINDING_SCHEMA,
  MAGIC_BOOK_PAGES,
  MAGIC_BOOK_RECEIPT_SCHEMA,
  appendMagicBookReceipt,
  closeMagicBook,
  createMagicBookReceipt,
  normaliseMagicBookBinding,
  openMagicBook,
  pageById,
  turnMagicBookPage,
} from '../src/magic-book-model.js';

test('Magic Book binding normalises to a real page and preserves return context', () => {
  const binding = normaliseMagicBookBinding({
    active_page_id: 'glyph-forge',
    active_world_id: 'terra-aeterna',
    active_room: 'forge',
    return_room: 'portal',
  });
  assert.equal(binding.schema, MAGIC_BOOK_BINDING_SCHEMA);
  assert.equal(binding.active_page_id, 'glyph-forge');
  assert.equal(binding.active_world_id, 'terra-aeterna');
  assert.equal(binding.active_room, 'forge');
  assert.equal(binding.return_room, 'portal');
  assert.equal(pageById('missing').id, 'threshold');
});

test('opening and closing the Book are receipted state transitions', () => {
  const opened = openMagicBook({}, {
    worldId: 'terra-aeterna',
    room: 'portal',
    reducedMotion: true,
    openedAt: '2026-09-18T04:00:00.000Z',
  });
  assert.equal(opened.state.open, true);
  assert.equal(opened.state.return_room, 'portal');
  assert.equal(opened.state.reduced_motion, true);
  assert.equal(opened.receipt.schema, MAGIC_BOOK_RECEIPT_SCHEMA);
  assert.equal(opened.receipt.kind, 'book-open');

  const closed = closeMagicBook(opened.state, { closedAt: '2026-09-18T04:01:00.000Z' });
  assert.equal(closed.state.open, false);
  assert.equal(closed.receipt.kind, 'book-close');
  assert.equal(closed.receipt.detail.return_room, 'portal');
});

test('page turns preserve direction and do not flatten binding state', () => {
  const start = normaliseMagicBookBinding({
    active_page_id: 'threshold',
    active_world_id: 'terra-aeterna',
    active_room: 'portal',
  });
  const forward = turnMagicBookPage(start, 'glyph-forge', {
    worldId: 'terra-aeterna',
    room: 'portal',
    turnedAt: '2026-09-18T04:02:00.000Z',
  });
  assert.equal(forward.direction, 'forward');
  assert.equal(forward.state.active_page_id, 'glyph-forge');
  assert.equal(forward.receipt.detail.from_page_id, 'threshold');
  assert.equal(forward.receipt.detail.to_page_id, 'glyph-forge');

  const backward = turnMagicBookPage(forward.state, 'threshold', {
    worldId: 'terra-aeterna',
    room: 'portal',
    turnedAt: '2026-09-18T04:03:00.000Z',
  });
  assert.equal(backward.direction, 'backward');
});

test('receipt ledger is bounded and keeps newest entries', () => {
  let receipts = [];
  for (let i = 0; i < 6; i += 1) {
    receipts = [...appendMagicBookReceipt(receipts, createMagicBookReceipt({
      kind: 'test',
      createdAt: '2026-09-18T04:0' + i + ':00.000Z',
      receiptId: 'receipt-' + i,
    }), 3)];
  }
  assert.equal(receipts.length, 3);
  assert.deepEqual(receipts.map((item) => item.receipt_id), ['receipt-3', 'receipt-4', 'receipt-5']);
});

test('Magic Book has exactly the v0.1 proof pages', () => {
  assert.deepEqual(MAGIC_BOOK_PAGES.map((page) => page.id), ['threshold', 'glyph-forge', 'receipts']);
});

test('live Magic Book surface uses Three.js only for embodiment while DOM stays interactive', async () => {
  const source = await readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /await import\('three'\)/);
  assert.match(source, /new THREE\.WebGLRenderer/);
  assert.match(source, /PlaneGeometry\(3\.28, 4\.45, 32, 1\)/);
  assert.match(source, /setCurl/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /css-fallback/);
  assert.match(source, /DOM pages remain the accessible interaction surface/);
});

test('Glyph Forge page shares STARWELL project and brush persistence instead of inventing a second format', async () => {
  const source = await readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /PROJECT_STORAGE_KEY/);
  assert.match(source, /BRUSH_STORAGE_KEY/);
  assert.match(source, /COLOUR_STORAGE_KEY/);
  assert.match(source, /normaliseProject/);
  assert.match(source, /makeBrushLibrary/);
  assert.match(source, /brushRuntime/);
  assert.match(source, /starwell\.glyph-studio-bridge\/v1/);
  assert.match(source, /surface: 'arcsweep-magic-book-glyph-page'/);
});

test('Glyph Forge page handles Pencil-grade pointer data and emits the existing stroke receipt contract', async () => {
  const source = await readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /getCoalescedEvents/);
  assert.match(source, /event\.pressure/);
  assert.match(source, /event\.tiltX/);
  assert.match(source, /event\.tiltY/);
  assert.match(source, /event\.twist/);
  assert.match(source, /arcsweep:glyph-brush-sample/);
  assert.match(source, /starwell:glyph-stroke-committed/);
  assert.match(source, /starwell\.glyph-stroke-receipt\/v1/);
});

test('page and glyph actions leave Magic Book receipts and room crossings use the live OS route', async () => {
  const source = await readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8');
  for (const kind of ['page-turn', 'glyph-stroke', 'brush-setting-change', 'brush-select', 'room-crossing']) {
    assert.match(source, new RegExp(kind));
  }
  assert.match(source, /__arcsweepOS\?\.navigate/);
  assert.match(source, /data-book-room/);
  assert.match(source, /return_room/);
});

test('Magic Book is mounted by the normal lazy sidecar boot graph', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /magic-book-sidecar\.js/);
  const globals = source.slice(source.indexOf('const GLOBAL_SIDECARS'), source.indexOf('const SIDECAR_PACKS'));
  assert.match(globals, /magic-book-sidecar\.js/);
});

test('Universal Codex and Generator Atelier are visible first-class doorways', async () => {
  const source = await readFile(new URL('../src/magic-book-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /<span>Universal Codex<\/span>/);
  assert.match(source, /<span>Generator Atelier<\/span>/);
  assert.match(source, /data-generator-atelier-open/);
  assert.match(source, /openGeneratorAtelier/);
  assert.match(source, /data-generator-atelier/);
  assert.match(source, /params\.get\('codex'\) === 'generator'/);
});
