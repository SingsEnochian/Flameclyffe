import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('ArcSweep loads bounded depth assets after the dark board theme', async () => {
  const html = await read('../index.html');
  const darkBoard = html.indexOf('./src/arcsweep-dark-board.css');
  const depthCss = html.indexOf('./src/arcsweep-depth-sidecar.css');
  const bootstrap = html.indexOf('./src/main-bootstrap.js');
  const depthJs = html.indexOf('./src/arcsweep-depth-sidecar.js');
  assert.ok(darkBoard >= 0);
  assert.ok(depthCss > darkBoard);
  assert.ok(bootstrap >= 0);
  assert.ok(depthJs > bootstrap);
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
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
});
