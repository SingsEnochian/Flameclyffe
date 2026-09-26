import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_PHYSICAL_LEAF_DRAG_SCHEMA,
  leafDirectionalVelocity,
  leafDragProgress,
  leafTurnTarget,
  physicalLeafDragSnapshot,
  shouldCommitLeafDrag,
} from '../src/codex/codex-physical-leaf-drag.js';

test('physical leaf resolves only an adjacent forward page', () => {
  assert.equal(leafTurnTarget({ active_page_id: 'threshold' }, 'forward').id, 'glyph-forge');
  assert.equal(leafTurnTarget({ active_page_id: 'glyph-forge' }, 'forward').id, 'receipts');
  assert.equal(leafTurnTarget({ active_page_id: 'receipts' }, 'forward'), null);
});

test('physical leaf drag progress follows a right-edge pull toward the spine', () => {
  assert.equal(leafDragProgress({ startX: 900, currentX: 900, width: 400 }), 0);
  assert.equal(leafDragProgress({ startX: 900, currentX: 748, width: 400 }), 0.38);
  assert.equal(leafDragProgress({ startX: 900, currentX: 300, width: 400 }), 1);
});

test('physical leaf accepts either deliberate travel or a directional flick', () => {
  assert.equal(shouldCommitLeafDrag({ progress: 0.4, velocity: 0.1, travelPx: 160 }), true);
  assert.equal(shouldCommitLeafDrag({ progress: 0.12, velocity: 0.72, travelPx: 48 }), true);
  assert.equal(shouldCommitLeafDrag({ progress: 0.2, velocity: 0.2, travelPx: 80 }), false);
  assert.equal(shouldCommitLeafDrag({ progress: 0.7, velocity: 1, travelPx: 4 }), false);
});

test('directional velocity is positive only when the forward leaf moves inward', () => {
  assert.equal(leafDirectionalVelocity({ previousX: 900, currentX: 845, previousAt: 0, currentAt: 100 }), 0.55);
  assert.equal(leafDirectionalVelocity({ previousX: 845, currentX: 900, previousAt: 0, currentAt: 100 }), -0.55);
});

test('physical leaf snapshots expose bounded state without mutating the binding', () => {
  const binding = { active_page_id: 'threshold' };
  const snapshot = physicalLeafDragSnapshot({ binding, progress: 0.42, pointerType: 'pen' });
  assert.equal(snapshot.schema, CODEX_PHYSICAL_LEAF_DRAG_SCHEMA);
  assert.equal(snapshot.from_page_id, 'threshold');
  assert.equal(snapshot.to_page_id, 'glyph-forge');
  assert.equal(snapshot.progress, 0.42);
  assert.equal(snapshot.pointer_type, 'pen');
  assert.deepEqual(binding, { active_page_id: 'threshold' });
});

test('drag sidecar uses pointer capture and coalesced events while canonical Book turn owns mutation', async () => {
  const source = await readFile(new URL('../src/magic-book-leaf-drag-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /pointerup/);
  assert.match(source, /pointercancel/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /getCoalescedEvents/);
  assert.match(source, /__arcsweepMagicBook/);
  assert.match(source, /bridge\.turn\?\.\(active\.target\.id\)/);
  assert.doesNotMatch(source, /createMagicBookReceipt/);
  assert.doesNotMatch(source, /turnMagicBookPage/);
});

test('physical leaf keeps reduced-motion and iPad-class pointer interaction semantics', async () => {
  const css = await readFile(new URL('../src/magic-book-leaf-drag.css', import.meta.url), 'utf8');
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /perspective\(1400px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const cabinet = entry.indexOf("'./codex-instrument-cabinet-sidecar.js'");
  const leaf = entry.indexOf("'./magic-book-leaf-drag-sidecar.js'");
  assert.ok(cabinet >= 0 && leaf > cabinet);
});
