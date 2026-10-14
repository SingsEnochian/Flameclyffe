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

test('dark board keeps shared semantic selectors and a bounded elevation grammar', async () => {
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
  for (const token of ['--board-teal', '--board-gold', '--board-e1', '--board-e2', '--board-e3', '--board-well']) {
    assert.match(css, new RegExp(token));
  }
  assert.match(css, /perspective:\s*1600px/);
  assert.match(css, /translateZ\(/);
  assert.match(css, /prefers-reduced-motion/);
});

test('dark board has no perpetual HUD animation contract', async () => {
  const css = await read('../src/arcsweep-dark-board.css');
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
  assert.doesNotMatch(css, /@keyframes\s+(?:scanline|glitch|pulse|orbit|warp)/i);
});

test('JCINK adapter shares the dark-board material grammar without perpetual overlays', async () => {
  const css = await read('../../starwell/public/interface-foundry/jcink-dark-board-adapter.css');
  assert.match(css, /--jc-teal/);
  assert.match(css, /--jc-gold/);
  assert.match(css, /\.psionic-topic-row/);
  assert.match(css, /\.epran-profile-hud/);
  assert.match(css, /\.ep-post-wrap/);
  assert.match(css, /\.hud-nav-link/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.scanline-layer[\s\S]*display:none\s*!important/);
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
});

test('Interface Foundry loads depth styling before its projection overrides', async () => {
  const html = await read('../../starwell/public/interface-foundry/index.html');
  const foundry = html.indexOf('./interface-foundry.css');
  const projection = html.indexOf('./interface-theme-overrides.css');
  assert.ok(foundry >= 0);
  assert.ok(projection > foundry);
});

test('Astra handoff preserves JCINK adapter and semantic-boundary rules', async () => {
  const handoff = await read('../docs/ASTRA_6_DARK_BOARD_HANDOFF.md');
  assert.match(handoff, /GLANCE -> INSPECT -> OPEN \/ ACT/);
  assert.match(handoff, /JCINK adapters/);
  assert.match(handoff, /No important information may exist only as colour, glow, animation, or decoration/);
  assert.match(handoff, /projection state separate from identity\/canon\/authority/);
  assert.match(handoff, /live preview link/i);
});
