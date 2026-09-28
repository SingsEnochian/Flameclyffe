import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('ArcSweep loads the dark board theme after existing base styles', async () => {
  const html = await read('../index.html');
  const worlds = html.indexOf('./src/worlds.css');
  const mobile = html.indexOf('./src/mobile-navigation.css');
  const darkBoard = html.indexOf('./src/arcsweep-dark-board.css');
  assert.ok(worlds >= 0);
  assert.ok(mobile >= 0);
  assert.ok(darkBoard > worlds);
  assert.ok(darkBoard > mobile);
});

test('dark board keeps shared semantic selectors instead of creating a second app shell', async () => {
  const css = await read('../src/arcsweep-dark-board.css');
  for (const token of [
    '.app-shell',
    '.sidebar',
    '.nav-button',
    '.panel',
    '.item-card',
    '.applet-card',
    '.commons-entry',
  ]) assert.match(css, new RegExp(token.replace('.', '\\.')));
  assert.match(css, /--board-teal/);
  assert.match(css, /--board-gold/);
  assert.match(css, /prefers-reduced-motion/);
});

test('dark board has no perpetual HUD animation contract', async () => {
  const css = await read('../src/arcsweep-dark-board.css');
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
  assert.doesNotMatch(css, /@keyframes\s+(?:scanline|glitch|pulse|orbit|warp)/i);
  assert.doesNotMatch(css, /filter:\s*drop-shadow\([^)]*#[0-9a-f]{3,8}/i);
});

test('Astra handoff preserves JCINK adapter and semantic-boundary rules', async () => {
  const handoff = await read('../docs/ASTRA_6_DARK_BOARD_HANDOFF.md');
  assert.match(handoff, /GLANCE -> INSPECT -> OPEN \/ ACT/);
  assert.match(handoff, /JCINK adapters/);
  assert.match(handoff, /No important information may exist only as colour, glow, animation, or decoration/);
  assert.match(handoff, /projection state separate from identity\/canon\/authority/);
  assert.match(handoff, /live preview link/i);
});
