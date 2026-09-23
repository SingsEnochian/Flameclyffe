import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/magic-book-touch-safe.css', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');

test('touch-safe Codex is imported after responsive rules', () => {
  const responsive = entry.indexOf("'./magic-book-responsive.css'");
  const safe = entry.indexOf("'./magic-book-touch-safe.css'");
  assert.ok(responsive >= 0);
  assert.ok(safe > responsive);
});

test('touch-safe Codex removes background hit targets and decorative canvases', () => {
  assert.match(css, /body > \*:not\(#arcsweep-magic-book\)/);
  assert.match(css, /display: none !important/);
  assert.match(css, /z-index: 2147483647 !important/);
  assert.match(css, /\.magic-book-three/);
  assert.match(css, /\.universal-codex-fx/);
  assert.match(css, /pointer-events: none !important/);
});

test('touch-safe Codex restores ordinary interaction and document flow', () => {
  assert.match(css, /#arcsweep-magic-book button/);
  assert.match(css, /pointer-events: auto !important/);
  assert.match(css, /touch-action: manipulation !important/);
  assert.match(css, /overflow-y: auto !important/);
  assert.match(css, /transform: none !important/);
});
