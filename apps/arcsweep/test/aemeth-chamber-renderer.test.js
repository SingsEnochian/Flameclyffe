import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const renderer = await readFile(new URL('../src/aemeth-chamber-live.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/aemeth-chamber.css', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Aemeth Chamber v4 is a renderer over the existing record form rather than a second state owner', () => {
  assert.match(renderer, /aemeth-chamber-live\/v4/);
  assert.match(renderer, /#record-form\[data-room-id="aemeth-lens"\]/);
  assert.match(renderer, /new FormData\(form\)/);
  assert.match(renderer, /dispatchEvent\(new Event\('change'/);
  assert.doesNotMatch(renderer, /localStorage|saveState\(|state\.records/);
});

test('Aemeth Chamber exposes shewstone stage, observer axis, ritual phases, and source-versioned Seal Atlas', () => {
  assert.match(renderer, /data-aemeth-stage/);
  assert.match(renderer, /aemeth-shewstone/);
  assert.match(renderer, /eye → sphere → embedded sigillum → depth/);
  assert.match(renderer, /AEMETH_RITUAL_PHASES/);
  assert.match(renderer, /AEMETH_DIAGRAM_ATLAS/);
  assert.match(renderer, /Historical variants remain separate witnesses/);
});

test('clean witness, OA witness, and interpretation remain visibly separate chamber panels', () => {
  assert.match(renderer, /Clean Witness/);
  assert.match(renderer, /Model Witness/);
  assert.match(renderer, /Interpretation & Replay/);
  assert.match(renderer, /witnessRaw/);
  assert.match(renderer, /modelWitnessLog/);
  assert.match(renderer, /interpretation/);
});

test('digital shewstone seats a manuscript-backed Sigillum vector and leaves lettering visibly pending', () => {
  assert.match(renderer, /renderSigillumDeiAemethSvg/);
  assert.match(renderer, /SIGILLUM_DEI_AEMETH_WITNESS/);
  assert.match(renderer, /lettering pending/);
  assert.match(renderer, /data-aemeth-seal-plane/);
  assert.doesNotMatch(renderer, /<span>⊚<\/span>/);
});

test('Aemeth Chamber styles semantic vector layers without a raster dependency', () => {
  for (const selector of ['.aemeth-sigillum-svg', '.aemeth-sigil-layer', '.aemeth-seal-inactive']) {
    assert.match(css, new RegExp(selector.replaceAll('.', '\\.')));
  }
  assert.doesNotMatch(renderer, /<img[^>]+sigil|<image[^>]+href/i);
});

test('Aemeth Chamber has responsive instrument, atlas, witness, and soft-focus layout', () => {
  for (const selector of ['.aemeth-optic-field', '.aemeth-shewstone', '.aemeth-atlas', '.aemeth-field-grid', '.aemeth-soft-focus']) {
    assert.match(css, new RegExp(selector.replaceAll('.', '\\.')));
  }
  assert.match(css, /@media\(max-width:640px\)/);
});

test('desktop chamber gives the optical instrument priority over rails and atlas', () => {
  assert.match(css, /@media\(min-width:1051px\)/);
  assert.match(css, /grid-template-columns:minmax\(13rem,18rem\) minmax\(0,1fr\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1\.8fr\) minmax\(12rem,\.72fr\)/);
  assert.match(css, /\.aemeth-optic-field\{min-height:32rem\}/);
  assert.match(css, /\.aemeth-shewstone\{width:min\(27rem,82%\)\}/);
});

test('page atmosphere is continuous instead of fixed-viewport tiled', () => {
  assert.match(globalCss, /background-repeat: no-repeat/);
  assert.match(globalCss, /background-position: right top, left bottom, 0 0/);
  assert.doesNotMatch(globalCss, /background-attachment: fixed/);
});
