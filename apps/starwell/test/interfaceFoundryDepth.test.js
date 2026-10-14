import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Interface Foundry loads the depth pass after the base theme layers', async () => {
  const html = await read('../public/interface-foundry/index.html');
  const base = html.indexOf('./interface-foundry.css');
  const overrides = html.indexOf('./interface-theme-overrides.css');
  const depth = html.indexOf('./interface-foundry-depth.css');
  const runtime = html.indexOf('./interface-foundry-depth.js');
  assert.ok(base >= 0);
  assert.ok(overrides > base);
  assert.ok(depth > overrides);
  assert.ok(runtime > 0);
});

test('depth runtime exposes bounded material levels and synthetic fixtures', async () => {
  const js = await read('../public/interface-foundry/interface-foundry-depth.js');
  for (const level of ['quiet', 'raised', 'sculpted']) assert.match(js, new RegExp(`id: '${level}'`));
  assert.match(js, /Atlas Scout/);
  assert.match(js, /Demo Cartographer/);
  assert.match(js, /data-fixture/);
  assert.match(js, /Nothing leaves this preview/);
  assert.match(js, /prefersReducedMotion/);
});

test('depth CSS creates elevation without perpetual HUD animation', async () => {
  const css = await read('../public/interface-foundry/interface-foundry-depth.css');
  assert.match(css, /--if-depth-shadow-high/);
  assert.match(css, /translateZ\(16px\)/);
  assert.match(css, /jcink-material-proof/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
  assert.doesNotMatch(css, /@keyframes\s+(?:scanline|pulse|orbit|glitch|warp)/i);
});

test('JCINK proof is explicitly synthetic and has no external write authority', async () => {
  const js = await read('../public/interface-foundry/interface-foundry-depth.js');
  assert.match(js, /Synthetic fixture/);
  assert.match(js, /no external write/);
  assert.match(js, /event\.preventDefault\(\)/);
});
