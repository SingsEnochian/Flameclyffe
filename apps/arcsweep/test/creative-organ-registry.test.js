import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CREATIVE_ORGANS } from '../src/creative-organ-registry.js';

const REQUIRED = ['glyph-lab', 'brush-foundry', 'living-glyph', 'font-foundry', 'continuity-gate'];

test('creative organ registry carries every recovered first-class instrument', () => {
  assert.deepEqual(CREATIVE_ORGANS.map((organ) => organ.id), REQUIRED);
  assert.equal(new Set(CREATIVE_ORGANS.map((organ) => organ.id)).size, REQUIRED.length);
});

test('Glyph Lab and Brush Foundry deliberately share the Glyph Studio implementation', () => {
  const glyph = CREATIVE_ORGANS.find((organ) => organ.id === 'glyph-lab');
  const brush = CREATIVE_ORGANS.find((organ) => organ.id === 'brush-foundry');
  assert.match(glyph.pagesHref, /glyph-studio\/$/);
  assert.match(brush.pagesHref, /glyph-studio\/\?panel=brush$/);
  assert.equal(glyph.deployedPath, brush.deployedPath);
});

test('Living Glyph and Font Foundry reuse existing implementation owners', async () => {
  const livingMain = await readFile(new URL('../../starwell/src/living-glyph-main.jsx', import.meta.url), 'utf8');
  const fontMain = await readFile(new URL('../../starwell/src/font-foundry-main.jsx', import.meta.url), 'utf8');
  assert.match(livingMain, /LiveGlyphViewer/);
  assert.match(fontMain, /FontForgeDock/);
});

test('creative organ navigation is registry-driven', async () => {
  const source = await readFile(new URL('../src/creative-organ-navigation.js', import.meta.url), 'utf8');
  assert.match(source, /CREATIVE_ORGANS/);
  assert.match(source, /data-creative-organ/);
  assert.match(source, /Primary Arcsweep rooms/);
});
