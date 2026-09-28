import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('STARWELL main page loads the Atlas Hall interface bridge', async () => {
  const html = await read('../index.html');
  assert.match(html, /%BASE_URL%interface-foundry\/atlas-hall-bridge\.js/);
});

test('Atlas Hall bridge reuses the shared Epra projection contracts', async () => {
  const source = await read('../public/interface-foundry/atlas-hall-bridge.js');
  assert.match(source, /ATLAS_LAYERS/);
  assert.match(source, /EPRA_ATLAS_SAMPLE/);
  assert.match(source, /epra-atlas-components\.js/);
  assert.match(source, /\.atlas-seed-panel/);
  assert.match(source, /starwell\.atlas-hall-interface-bridge\/v1/);
});

test('Atlas Hall bridge preserves canon and authority boundaries', async () => {
  const source = await read('../public/interface-foundry/atlas-hall-bridge.js');
  assert.match(source, /canonical_truth_owned_elsewhere:\s*true/);
  assert.match(source, /execution_authority:\s*false/);
  assert.doesNotMatch(source, /\bsupabase\b/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\.from\(['"]starwell_/);
  assert.doesNotMatch(source, /\b(?:POST|PUT|PATCH|DELETE)\b/);
});

test('Atlas Hall bridge exposes interactive map, layers, inspector, and cinematic route controls', async () => {
  const source = await read('../public/interface-foundry/atlas-hall-bridge.js');
  for (const token of ['ahi-layer-list', 'ahi-map', 'ahi-inspector', 'Fly route', 'Scrub Atlas cinematic flight path']) {
    assert.match(source, new RegExp(token));
  }
});
