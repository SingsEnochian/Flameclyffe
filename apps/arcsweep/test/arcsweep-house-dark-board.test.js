import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('House Commons material projection loads after the shared ArcSweep board layers', async () => {
  const html = await read('../index.html');
  const dark = html.indexOf('./src/arcsweep-dark-board.css');
  const depth = html.indexOf('./src/arcsweep-depth-sidecar.css');
  const house = html.indexOf('./src/arcsweep-house-dark-board.css');
  assert.ok(dark >= 0);
  assert.ok(depth > dark);
  assert.ok(house > depth);
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, [
    './src/canonical-runtime-host.js',
    './src/startup-fetch-guard.js',
    './src/main-bootstrap.js',
  ]);
});

test('House Commons stays social while gaining material depth', async () => {
  const css = await read('../src/arcsweep-house-dark-board.css');
  for (const selector of [
    '.commons-log',
    '.commons-chat-entry',
    '.commons-chat-body',
    '.commons-native-composer',
    '.commons-native-editor',
  ]) assert.match(css, new RegExp(selector.replace('.', '\\.')));
  assert.match(css, /data-kind="voice"/);
  assert.match(css, /data-kind="steward"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
  assert.doesNotMatch(css, /scanline|glitch-overlay|hud-orbit-ring/i);
});
