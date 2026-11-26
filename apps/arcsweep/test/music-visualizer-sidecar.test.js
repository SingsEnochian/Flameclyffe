import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MUSIC_VISUALIZER_VERSION, mountMusicVisualizer } from '../src/music-visualizer-sidecar.js';

test('music visualiser exposes four audio-reactive render modes', async () => {
  const source = await readFile(new URL('../src/music-visualizer-sidecar.js', import.meta.url), 'utf8');
  for (const mode of ['spectrum', 'radial', 'kaleidoscope', 'cells']) assert.match(source, new RegExp(mode));
  assert.equal(MUSIC_VISUALIZER_VERSION, 'arcsweep.music-visualizer/v1');
});

test('visualiser attaches to the existing StorySoundscape master instead of creating another audio engine', async () => {
  const source = await readFile(new URL('../src/music-visualizer-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /activeStorySoundscape\(\)/);
  assert.match(source, /soundscape\.master\.connect\(analyser\)/);
  assert.doesNotMatch(source, /new AudioContext/);
  assert.doesNotMatch(source, /new StorySoundscape/);
});

test('visualiser includes reduced-motion fallback and explicit disposal', async () => {
  const source = await readFile(new URL('../src/music-visualizer-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /dispose\(\)/);
  assert.match(source, /cancelAnimationFrame/);
});
