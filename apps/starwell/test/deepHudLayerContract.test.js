import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  DEEP_HUD_DATA_KEYS,
  DEEP_HUD_LAYER_OWNER,
  DEEP_HUD_LAYER_STATE,
  DEEP_HUD_PANEL_SELECTOR,
  DEEP_HUD_SCOPE_LAYER_SELECTOR,
} from '../src/lib/deepHudLayerContract.js';

async function readStarwellSource(path) {
  return readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');
}

test('DEEP HUD layer contract preserves the React-owned empty socket vocabulary', () => {
  assert.equal(DEEP_HUD_PANEL_SELECTOR, '.live-glyph-panel.deep-observer-panel');
  assert.equal(DEEP_HUD_SCOPE_LAYER_SELECTOR, ':scope > .deep-observer-hud-layer');
  assert.equal(DEEP_HUD_LAYER_OWNER.react, 'react');
  assert.equal(DEEP_HUD_LAYER_OWNER.fallback, 'passive-bounds-binder');
  assert.equal(DEEP_HUD_LAYER_STATE.empty, 'empty');
  assert.equal(DEEP_HUD_LAYER_STATE.active, 'active');
  assert.equal(DEEP_HUD_DATA_KEYS.fallback, 'deepHudLayerFallback');
});

test('React HUD entry uses the shared contract and only renders an empty inert socket', async () => {
  const source = await readStarwellSource('live-glyph.js');

  assert.match(source, /deepHudLayerContract\.js/);
  assert.match(source, /DEEP_HUD_LAYER_OWNER\.react/);
  assert.match(source, /DEEP_HUD_LAYER_STATE\.empty/);
  assert.match(source, /'data-deep-hud-layer'/);
  assert.match(source, /'aria-hidden': 'true'/);
  assert.doesNotMatch(source, /passive-bounds-binder/);
});

test('Passive bounds binder uses shared HUD contract for ownership and fallback state', async () => {
  const source = await readStarwellSource('deep-hud-bounds-bind.js');

  assert.match(source, /deepHudLayerContract\.js/);
  assert.match(source, /DEEP_HUD_LAYER_OWNER\.react/);
  assert.match(source, /DEEP_HUD_LAYER_OWNER\.fallback/);
  assert.match(source, /DEEP_HUD_DATA_KEYS\.fallbackReady/);
  assert.match(source, /DEEP_HUD_BOUNDS_EVENT/);
  assert.doesNotMatch(source, /const PANEL_SELECTOR =/);
  assert.doesNotMatch(source, /const HUD_LAYER_SELECTOR =/);
});

test('Passive HUD CSS keeps children non-interactive until explicit active state', async () => {
  const source = await readStarwellSource('deep-hud-bounds.css');

  assert.match(source, /\.deep-observer-hud-layer > \* \{\s*pointer-events: none;/s);
  assert.match(source, /\.deep-observer-hud-layer\[data-deep-hud-layer='active'\]:not\(\[aria-hidden='true'\]\) > \* \{\s*pointer-events: auto;/s);
});
