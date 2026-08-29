import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('existing SoundFont rack still owns file load, preset select and playback controls', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const marker of ['soundfont-files', 'data-soundfont-preset', 'soundfont-tone', 'loadSoundfontFiles']) {
    assert.match(main, new RegExp(marker));
  }
});

test('StorySoundscape remains the sole SoundFont bank and haptic engine', async () => {
  const engine = await readFile(new URL('../src/story-soundscape.js', import.meta.url), 'utf8');
  assert.match(engine, /async loadSoundfontFiles\(files\)/);
  assert.match(engine, /SoundBankLoader\.fromArrayBuffer/);
  assert.match(engine, /soundBankManager\.addSoundBank/);
  assert.match(engine, /soundfontPresets = synth\.presetList/);
  assert.match(engine, /navigator\?\.vibrate/);
});

test('repair sidecar boots before navigation and long-running UI sidecars', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const repair = bootstrap.indexOf("'./soundfont-runtime-repair.js'");
  const soundNav = bootstrap.indexOf("'./sound-organ-navigation.js'");
  const runtime = bootstrap.indexOf("'./constellation-runtime-adapter.js'");
  assert.ok(repair >= 0 && soundNav > repair && runtime > soundNav);
});
