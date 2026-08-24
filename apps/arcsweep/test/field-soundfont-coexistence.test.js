import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('truth-controlled Field and SoundFont loading remain mounted together', async () => {
  const [main, soundscape] = await Promise.all([
    source('main.js'),
    source('story-soundscape.js'),
  ]);

  assert.match(main, /classifyFieldInstrument/);
  assert.match(main, /awaiting receipted Field cycle/);
  assert.match(main, /Run Field feedback cycle/);
  assert.match(main, /soundfontBanks\.map/);
  assert.match(main, /presetCount/);

  assert.match(soundscape, /SoundBankLoader\.fromArrayBuffer/);
  assert.match(soundscape, /addSoundBank\(buffer, id\)/);
  assert.ok(
    soundscape.indexOf('addSoundBank(buffer, id)') < soundscape.indexOf('await synth.isReady', soundscape.indexOf('addSoundBank(buffer, id)')),
    'the bank must be supplied before synth readiness is awaited',
  );
});

test('Arcsweep packages and serves the SpessaSynth AudioWorklet beside the built module', async () => {
  const [soundscape, vite] = await Promise.all([
    source('story-soundscape.js'),
    readFile(new URL('../vite.config.js', import.meta.url), 'utf8'),
  ]);

  assert.match(soundscape, /SPESSASYNTH_WORKLET_URL/);
  assert.match(vite, /arcsweep-spessasynth-worklet/);
  assert.match(vite, /spessasynth_lib\/dist\/spessasynth_processor\.min\.js/);
  assert.match(vite, /fileName: 'assets\/spessasynth_processor\.min\.js'/);
  assert.match(vite, /\/src\/spessasynth_processor\.min\.js/);
  assert.match(vite, /SOURCE_WORKLET_DECLARATION/);
  assert.match(vite, /BUILT_WORKLET_DECLARATION/);
  assert.match(vite, /import\.meta\.url\.slice/);
});
