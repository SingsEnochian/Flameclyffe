import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Universal Codex ships the dark reader palette after responsive/touch CSS', () => {
  const entry = readFileSync(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const dark = readFileSync(new URL('../src/magic-book-dark.css', import.meta.url), 'utf8');
  const touchIndex = entry.indexOf("./magic-book-touch-safe.css");
  const darkIndex = entry.indexOf("./magic-book-dark.css");

  assert.ok(touchIndex >= 0);
  assert.ok(darkIndex > touchIndex);
  assert.match(dark, /--magic-book-paper:\s*#111a17/);
  assert.match(dark, /--magic-book-ink:\s*#e7e1d4/);
  assert.match(dark, /color-scheme:\s*dark/);
  assert.match(dark, /data-first-living-page-root/);
});
