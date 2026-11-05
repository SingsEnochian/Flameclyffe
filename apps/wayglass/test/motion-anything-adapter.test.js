import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../src/', import.meta.url);
const main = readFileSync(new URL('main.js', root), 'utf8');
const adapter = readFileSync(new URL('motion-anything-adapter.js', root), 'utf8');
const css = readFileSync(new URL('styles.css', root), 'utf8');
test('motion adapter is mounted after shell navigation exists', () => {
  assert.match(main, /import \{ installWayglassMotion \}/);
  assert.ok(main.indexOf('root.before(surfaceNav)') < main.indexOf('installWayglassMotion({ root: document })'));
});
test('motion adapter supports disabling and teardown', () => {
  assert.match(adapter, /prefers-reduced-motion: reduce/);
  assert.match(adapter, /onPreferenceChange/);
  assert.match(adapter, /removeEventListener\('pointermove'/);
  assert.match(adapter, /aria-pressed/);
});
test('motion styles include reduced-motion and off switches', () => {
  assert.match(css, /data-wg-motion="off"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@keyframes wg-arrive/);
});

test('system reduced-motion preference cannot be overridden by toggle', () => {
  assert.match(adapter, /enabled = !enabled && !reduced\?\.matches/);
  assert.match(adapter, /if \(event\.matches\) \{ enabled = false; clearMagnets\(\); label\(\); \}/);
});
test('disabling motion and teardown clear stale magnetic offsets', () => {
  assert.match(adapter, /function clearMagnets\(\)/);
  assert.match(adapter, /querySelectorAll\('\.glass-chip, \.send-jewel'\)/);
  assert.match(adapter, /if \(!enabled\) clearMagnets\(\)/);
  assert.match(adapter, /clearMagnets\(\);\s*toggle\.remove\(\)/);
});
