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
  assert.doesNotMatch(engine, /fromArrayBuffer\(buffer\.slice/);
});

test('SoundFont status names the batch, selected preset, and audible audition', async () => {
  const { soundfontBankStatusText } = await import('../src/soundfont-status.js');
  assert.match(soundfontBankStatusText({ state: 'loading-bank', fileCount: 12, totalBytes: 469000000 }), /preparing 12 files/);
  assert.match(soundfontBankStatusText({ state: 'bank-file-loading', fileIndex: 2, fileCount: 12, fileName: 'BIG_SHOT.sf2', fileSize: 68838376 }), /BIG_SHOT\.sf2/);
  assert.match(soundfontBankStatusText({ state: 'bank-ready', bankCount: 12, presetCount: 233, selectedPreset: { name: 'Choir Aahs' } }), /233 presets · selected: Choir Aahs/);
  assert.match(soundfontBankStatusText({ state: 'audition-started', frequency: 432, selectedPreset: { name: 'Choir Aahs' } }), /playing Choir Aahs at 432\.00 Hz/);
});

test('repair sidecar boots before navigation and long-running UI sidecars', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const repair = bootstrap.indexOf("'./soundfont-runtime-repair.js'");
  const soundNav = bootstrap.indexOf("'./sound-organ-navigation.js'");
  const runtime = bootstrap.indexOf("'./constellation-runtime-adapter.js'");
  assert.ok(repair >= 0 && soundNav > repair && runtime > soundNav);
});
