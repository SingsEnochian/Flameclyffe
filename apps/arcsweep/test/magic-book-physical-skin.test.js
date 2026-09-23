import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('physical book skin loads after dark/touch layers', () => {
  const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const touch = entry.indexOf("'./magic-book-touch-safe.css'");
  const dark = entry.indexOf("'./magic-book-dark.css'");
  const skin = entry.indexOf("'./magic-book-physical-skin.css'");
  assert.ok(touch >= 0);
  assert.ok(dark > touch);
  assert.ok(skin > dark);
});

test('iPad landscape restores a two-page spread without nested scrolling', () => {
  const css = readFileSync(new URL('../src/magic-book-physical-skin.css', import.meta.url), 'utf8');
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(css, /magic-book-spread::before/);
  assert.match(css, /pointer-events:\s*none/);
  assert.doesNotMatch(css, /overflow-y:\s*(auto|scroll)/);
});
