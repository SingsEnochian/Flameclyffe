import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const motion = readFileSync(new URL('../src/futuristic-motion.css', import.meta.url), 'utf8');
test('Wayglass host loads one shared motion stylesheet for every registered surface', () => {
  assert.match(source, /import '\.\/futuristic-motion\.css';/);
  assert.match(source, /mountWayglassSurface\(surfaceId, root\)/);
  assert.match(motion, /#app > \.wg-surface/);
});
test('motion respects system reduced-motion preference and retains keyboard focus', () => {
  assert.match(motion, /prefers-reduced-motion: no-preference/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /animation: none !important/);
  assert.match(motion, /:focus-within/);
});
test('animations never pretend to indicate verification or backend activity', () => {
  assert.doesNotMatch(motion, /\[data-status|\[data-verification|\[data-receipt/i);
});
