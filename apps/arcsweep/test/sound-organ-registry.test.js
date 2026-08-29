import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { SOUND_ORGANS } from '../src/sound-organ-registry.js';

const REQUIRED = ['sound-room', 'runa', 'tone-lab', 'sound-banks', 'haptics'];

test('sound organ registry carries every first-class sound instrument', () => {
  assert.deepEqual(SOUND_ORGANS.map((organ) => organ.id), REQUIRED);
  assert.equal(new Set(SOUND_ORGANS.map((organ) => organ.id)).size, REQUIRED.length);
});

test('every sound organ preserves a real source owner', async () => {
  for (const organ of SOUND_ORGANS) {
    assert.ok(organ.sourcePath, `${organ.id} has no sourcePath`);
    assert.ok(organ.implementation, `${organ.id} has no implementation label`);
    await access(new URL(`../../../${organ.sourcePath}`, import.meta.url));
  }
});

test('native sound organs deliberately focus the existing Theme soundscape', () => {
  const native = SOUND_ORGANS.filter((organ) => organ.kind === 'native-focus');
  assert.ok(native.length >= 4);
  native.forEach((organ) => {
    assert.equal(organ.roomId, 'theme');
    assert.ok(organ.focusSelector);
    assert.equal(organ.deployedPath, 'apps/arcsweep/index.html');
  });
});

test('Tone Lab preserves the existing somatic World-Tone Gate', () => {
  const tone = SOUND_ORGANS.find((organ) => organ.id === 'tone-lab');
  assert.match(tone.pagesHref, /world-tone-approval\/$/);
  assert.equal(tone.sourcePath, 'apps/starwell/world-tone-approval/index.html');
});

test('SoundFont runtime repair emits the AudioWorklet as a Vite URL asset', async () => {
  const source = await readFile(new URL('../src/soundfont-runtime-repair.js', import.meta.url), 'utf8');
  assert.match(source, /spessasynth_processor\.min\.js\?url/);
  assert.match(source, /audioWorklet\.addModule\(SPESSASYNTH_WORKLET_ASSET_URL\)/);
  assert.match(source, /StorySoundscape\.prototype\.ensureSoundfontSynth/);
});

test('sound organ navigation is registry-driven and never clones StorySoundscape', async () => {
  const source = await readFile(new URL('../src/sound-organ-navigation.js', import.meta.url), 'utf8');
  assert.match(source, /SOUND_ORGANS/);
  assert.match(source, /dataset\.soundOrgan/);
  assert.doesNotMatch(source, /new StorySoundscape/);
});
