import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Magic Book sound-bank bridge is a global sidecar after SoundFont repair', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const repair = bootstrap.indexOf("'./soundfont-runtime-repair.js'");
  const bridge = bootstrap.indexOf("'./magic-book-sound-bank-bridge.js'");
  assert.ok(repair >= 0);
  assert.ok(bridge > repair);
  assert.match(bootstrap, /magic-book-sound-bank-bridge\.js/);
});

test('Magic Book sound-bank bridge accepts receipted commands and uses the existing StorySoundscape', async () => {
  const source = await readFile(new URL('../src/magic-book-sound-bank-bridge.js', import.meta.url), 'utf8');
  assert.match(source, /magic-book\.sound-bank-command\/v1/);
  assert.match(source, /StorySoundscape\.prototype/);
  assert.match(source, /playSoundfontNote/);
  assert.match(source, /selectedSoundfontPreset/);
  assert.match(source, /soundfontBanks/);
  assert.match(source, /oscillator-fallback/);
  assert.match(source, /runa\.enter-calm/);
  assert.match(source, /startHum/);
  assert.match(source, /arcsweep:magic-book-sound-receipt/);
});

test('cross-window Magic Book sound is same-origin by default with explicit allow-list support', async () => {
  const source = await readFile(new URL('../src/magic-book-sound-bank-bridge.js', import.meta.url), 'utf8');
  assert.match(source, /arcsweep\.magic-book\.allowed-origins\/v1/);
  assert.match(source, /eventAllowed/);
  assert.match(source, /globalThis\.location\?\.origin/);
});
