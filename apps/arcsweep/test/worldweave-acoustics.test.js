import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  WORLDWEAVE_ACOUSTIC_PROFILES,
  WORLDWEAVE_MOTIF_ID,
  WorldweaveAcoustics,
  resolveWorldweaveAcousticProfile,
  worldweaveMotifFrequencies,
} from '../src/worldweave-acoustics.js';

function fakeAudio() {
  const voices = [];
  class Param {
    constructor(value = 0) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class AudioNode {
    constructor() {
      this.gain = new Param(0);
      this.frequency = new Param(0);
      this.Q = new Param(0);
      this.connected = [];
      this.onended = null;
      this.started = [];
      this.stopped = [];
    }
    connect(node) { this.connected.push(node); return node; }
    disconnect() {}
    start(at) { this.started.push(at); }
    stop(at) { this.stopped.push(at); }
  }
  const context = {
    currentTime: 10,
    sampleRate: 8000,
    createGain() { return new AudioNode(); },
    createOscillator() {
      const node = new AudioNode();
      voices.push(node);
      return node;
    },
    createBufferSource() { return new AudioNode(); },
    createBiquadFilter() { return new AudioNode(); },
    createBuffer(_channels, frames) {
      const samples = new Float32Array(frames);
      return { getChannelData() { return samples; } };
    },
  };
  const soundscape = {
    armed: true,
    context,
    buses: { ambience: context.createGain(), tones: context.createGain() },
    world: { rootHz: 432 },
  };
  return { soundscape, context, voices };
}

function storage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('Eira, Falka and Starsong retain distinct acoustic identities and world aliases', () => {
  assert.equal(WORLDWEAVE_ACOUSTIC_PROFILES.length, 3);
  assert.equal(resolveWorldweaveAcousticProfile({ id: 'house-world-luna' })?.id, 'windmere');
  assert.equal(resolveWorldweaveAcousticProfile({ houseSourceKey: 'terra-aeterna', id: 'other' })?.id, 'third-city');
  assert.equal(resolveWorldweaveAcousticProfile({ id: 'starsong-friendship-is-magic' })?.id, 'starsong');
  assert.equal(resolveWorldweaveAcousticProfile({ id: 'equestria-starsong' })?.id, 'starsong');
  assert.equal(resolveWorldweaveAcousticProfile({ id: 'world-unknown' }), null);
  for (const profile of WORLDWEAVE_ACOUSTIC_PROFILES) {
    assert.equal(profile.textures.length, 2);
    assert.ok(profile.description.length > 20);
  }
});

test('one recognisable musical interval can be translated by each world root', () => {
  const a = worldweaveMotifFrequencies(432);
  const b = worldweaveMotifFrequencies(220);
  const c = worldweaveMotifFrequencies(528);
  assert.equal(a.length, 3);
  assert.ok(a[0] !== b[0] && a[0] !== c[0]);
  assert.ok(Math.abs(a[1] / a[0] - b[1] / b[0]) < 0.00001);
  assert.ok(Math.abs(b[2] / b[0] - c[2] / c[0]) < 0.00001);
  assert.throws(() => worldweaveMotifFrequencies(NaN));
});

test('atmospheres use the existing mixer, crossfade worlds and preserve muted return state', () => {
  const { soundscape } = fakeAudio();
  const store = storage();
  const acoustic = new WorldweaveAcoustics(soundscape, { storage: store });
  assert.equal(acoustic.snapshot().active, false);
  acoustic.start({ id: 'luna' });
  const first = acoustic.active;
  assert.equal(acoustic.snapshot().sceneId, 'windmere');
  assert.equal(first.output.connected[0], soundscape.buses.ambience);
  assert.equal(first.voices.length, 5);
  soundscape.world.rootHz = 220;
  acoustic.transition({ id: 'terra-aeterna' });
  assert.equal(acoustic.snapshot().sceneId, 'third-city');
  assert.ok(first.voices.every((voice) => voice.stopped.length === 1));
  acoustic.stop();
  assert.equal(acoustic.snapshot().active, false);
  const returned = new WorldweaveAcoustics(soundscape, { storage: store });
  assert.equal(returned.snapshot().rememberedSceneId, 'third-city');
  assert.equal(returned.snapshot().resumedAutomatically, false);
  assert.equal(returned.snapshot().active, false);
});

test('unrecognised world stops the sound; no audio starts without explicit arm', () => {
  const { soundscape } = fakeAudio();
  soundscape.armed = false;
  const acoustic = new WorldweaveAcoustics(soundscape, { storage: null });
  assert.throws(() => acoustic.start({ id: 'luna' }), /armed/);
  soundscape.armed = true;
  acoustic.start({ id: 'luna' });
  acoustic.transition({ id: 'unmapped' });
  assert.equal(acoustic.snapshot().active, false);
  assert.equal(acoustic.receipts[0].reason, 'world-without-profile');
});

test('shared doorway echo creates a non-canonical audition receipt', () => {
  const { soundscape, voices } = fakeAudio();
  const acoustic = new WorldweaveAcoustics(soundscape, { storage: null });
  const receipt = acoustic.playEcho({ id: 'luna' });
  assert.equal(receipt.reason, WORLDWEAVE_MOTIF_ID);
  assert.equal(receipt.canon_effect, false);
  assert.equal(receipt.action, 'motif-audition');
  assert.equal(voices.length, 3);
  assert.ok(voices.every((voice) => voice.started.length === 1 && voice.stopped.length === 1));
});

test('Sound Room controls share StorySoundscape and Feather Stop', async () => {
  const [main, engine] = await Promise.all([
    readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/story-soundscape.js', import.meta.url), 'utf8'),
  ]);
  assert.match(main, /worldweave-toggle/);
  assert.match(main, /worldweave-echo/);
  assert.match(main, /resolveWorldweaveAcousticProfile/);
  assert.match(engine, /new WorldweaveAcoustics\(this\)/);
  assert.match(engine, /this\.worldweave\.transition\(world\)/);
  assert.match(engine, /this\.worldweave\.stop\('feather-stop'\)/);
  assert.match(engine, /worldweave: this\.worldweave\.snapshot\(\)/);
});
