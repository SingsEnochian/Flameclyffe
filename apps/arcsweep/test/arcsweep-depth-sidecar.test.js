import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('ArcSweep loads depth CSS after the dark board while keeping depth JS off critical HTML boot', async () => {
  const html = await read('../index.html');
  const darkBoard = html.indexOf('./src/arcsweep-dark-board.css');
  const depthCss = html.indexOf('./src/arcsweep-depth-sidecar.css');
  assert.ok(darkBoard >= 0);
  assert.ok(depthCss > darkBoard);
  assert.doesNotMatch(html, /<script[^>]+arcsweep-depth-sidecar\.js/);
});

test('ArcSweep depth sidecar is registered once globally and once in the Vite loader graph', async () => {
  const bootstrap = await read('../src/sidecar-bootstrap.js');
  const specifier = './arcsweep-depth-sidecar.js';
  const occurrences = bootstrap.split(`'${specifier}'`).length - 1;
  assert.equal(occurrences, 2);
  const globalBlock = bootstrap.slice(bootstrap.indexOf('const GLOBAL_SIDECARS'), bootstrap.indexOf('const CODEX_BOOT_SIDECARS'));
  assert.match(globalBlock, /arcsweep-depth-sidecar\.js/);
});

test('ArcSweep depth sidecar is pointer-bounded and reduced-motion aware', async () => {
  const js = await read('../src/arcsweep-depth-sidecar.js');
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /pointer: fine/);
  assert.match(js, /MAX_TILT_X = 0\.55/);
  assert.match(js, /MAX_TILT_Y = 0\.8/);
  assert.doesNotMatch(js, /requestAnimationFrame/);
  assert.doesNotMatch(js, /setInterval/);
});

test('ArcSweep depth styling excludes floating and nested work surfaces', async () => {
  const css = await read('../src/arcsweep-depth-sidecar.css');
  assert.match(css, /#houseglass/);
  assert.match(css, /\.modal-backdrop/);
  assert.match(css, /\.panel \.commons-entry/);
  assert.match(css, /pointer:coarse/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /,\s*@media/);
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
});
