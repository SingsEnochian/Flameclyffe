import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Arcsweep shell is a shared stable asset mounted by the Vite house', async () => {
  const [vite, shellJs, shellCss] = await Promise.all([
    read('../vite.config.js'),
    read('../public/shell/arcsweep-shell.js'),
    read('../public/shell/arcsweep-shell.css'),
  ]);

  assert.match(vite, /inject-arcsweep-global-shell/);
  assert.match(vite, /shell\/arcsweep-shell\.css/);
  assert.match(vite, /shell\/arcsweep-shell\.js/);
  assert.match(vite, /deep-observer\/index\.html/);
  assert.match(vite, /hearthgate\/index\.html/);

  assert.match(shellJs, /HEARTHGATE · ARCSWEEP/);
  assert.match(shellJs, /Reception/);
  assert.match(shellJs, /Stonewood/);
  assert.match(shellJs, /data-room-jump/);
  assert.match(shellCss, /Faer wrapper law/);
  assert.match(shellCss, /arcsweep-home-panel/);
});

test('Arcsweep runtime CSS does not flatten sovereign room instruments', async () => {
  const runtimeCss = await read('../src/hearthgate-arcsweep.css');

  assert.match(runtimeCss, /runtime installation has no authority to/);
  assert.doesNotMatch(runtimeCss, /\.sigil-ring\s*,?\s*\.sigil-axis\s*\{[^}]*display\s*:\s*none/is);
  assert.doesNotMatch(runtimeCss, /\.sigil-field\s*\{[^}]*grid-template-columns/is);
  assert.doesNotMatch(runtimeCss, /\.terra-instrument-panel\s*\{[^}]*display\s*:\s*none/is);
});

test('STARWELL root delegates global frame ownership to Arcsweep', async () => {
  const rootHtml = await read('../index.html');

  assert.doesNotMatch(rootHtml, /class=['"]hearthgate-housebar/);
  assert.doesNotMatch(rootHtml, /framework-door-rack/);
  assert.doesNotMatch(rootHtml, /stonewood-themes\.js/);
  assert.match(rootHtml, /hearthgate-arcsweep\.js/);
});
