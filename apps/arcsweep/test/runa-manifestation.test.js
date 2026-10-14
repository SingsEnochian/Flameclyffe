import test from 'node:test';
import assert from 'node:assert/strict';

import { createRunaManifestationAdapter } from '../src/os/runa-manifestation.js';
import { StorySoundscape } from '../src/story-soundscape.js';

function fakeStory() {
  return {
    context: null,
    world: { worldId: 'terra-aeterna', worldName: 'Terra Aeterna', rootHz: 220, waveform: 'sine' },
    humActive: false,
    heartfieldActive: false,
    tones: [],
    armCalls: [],
    async arm(world = {}) {
      this.context = {};
      this.armCalls.push(world);
      this.world = {
        ...this.world,
        worldId: world.id || this.world.worldId,
        worldName: world.name || this.world.worldName,
        rootHz: Number(world.root_hz) || this.world.rootHz,
        waveform: world.soundscape?.waveform || this.world.waveform,
      };
      return this;
    },
    startHum() { this.humActive = true; },
    stopHum() { this.humActive = false; },
    stopHeartfield() { this.heartfieldActive = false; },
    stopBluebirdWeightedHome() {},
    playWorldTone(frequency, duration) { this.tones.push({ frequency, duration }); },
    snapshot() {
      return {
        world: { ...this.world },
        humActive: this.humActive,
        heartfield: { active: this.heartfieldActive },
      };
    },
  };
}

function fakeGateway() {
  return {
    ensured: 0,
    starts: [],
    tests: [],
    feathers: 0,
    loopHeld: false,
    async ensure() { this.ensured += 1; },
    setMaster(value) { this.master = value; },
    setMonoSafe(value) { this.monoSafe = value; },
    setPhaseInverted(value) { this.phase = value; },
    setReturnSide(value) { this.returnSide = value; },
    setDuration(value) { this.duration = value; },
    async startLoop(mode) { this.loopHeld = true; this.starts.push(mode); },
    async runTest(mode) { this.tests.push(mode); },
    feather() { this.loopHeld = false; this.feathers += 1; },
    getState() { return { loopHeld: this.loopHeld, masterLevel: this.master ?? 0.12 }; },
  };
}

test('World Hum manifests through the existing StorySoundscape instance', async () => {
  const story = fakeStory();
  const receipts = [];
  const adapter = createRunaManifestationAdapter({
    storyProvider: () => story,
    onReceipt: (receipt) => receipts.push(receipt),
  });

  const started = await adapter.startWorldHum({ world_id: 'terra-aeterna' });
  assert.equal(story.humActive, true);
  assert.equal(story.armCalls.length, 1);
  assert.equal(started.engine, 'StorySoundscape');
  assert.equal(started.root_hz, 220);
  assert.equal(receipts.at(-1).kind, 'world-hum-start');

  adapter.stopWorldHum('test');
  assert.equal(story.humActive, false);
  assert.equal(receipts.at(-1).kind, 'world-hum-stop');
});

function mountedStory() {
  const story = new StorySoundscape();
  // Exercise real world resolution and arm/stop methods without audio hardware.
  story.context = { state: 'running', currentTime: 10 };
  story.startHum = function () { this.humActive = true; };
  story.restartHum = () => {};
  story.playWorldTone = function (frequency) { this.lastFrequency = frequency; };
  return story;
}

test('World Hum and Glyph Voice preserve the real live custom profile, including omitted context', async () => {
  for (const id of ['custom-world', 'house-world-taveren-vaen']) {
    const story = mountedStory();
    story.setWorld({ id, name: 'Live world' });
    story.setRoot(287);
    story.setWaveform('square');
    story.setOvertones(5);
    const profile = { ...story.world };
    const soundfontMap = story.soundfontMap;
    const adapter = createRunaManifestationAdapter({ storyProvider: () => story });
    const receipt = await adapter.startWorldHum({ world_id: id, world_name: 'Live world', world: { id, soundscape: { rootHz: 100, waveform: 'triangle', overtones: 1 } } });
    assert.deepEqual(story.world, profile);
    assert.equal(receipt.root_hz, 287);
    assert.equal(receipt.waveform, 'square');
    await adapter.setGlyphSonification({ world_id: id });
    assert.deepEqual(story.world, profile);
    await adapter.startWorldHum();
    assert.deepEqual(story.world, profile);
    assert.equal(story.soundfontMap, soundfontMap);
    const stroke = adapter.observeGlyphStroke({ stroke_id: 'custom-root-stroke' });
    assert.equal(stroke.root_hz, 287);
    assert.equal(story.lastFrequency, stroke.frequency_hz);
  }
});

test('explicit tuning overrides merge with the live profile; world switches use their own profile', async () => {
  const story = mountedStory();
  story.setWorld({ id: 'custom-world', name: 'Custom', soundscape: { rootHz: 287, waveform: 'square', overtones: 5 } });
  const adapter = createRunaManifestationAdapter({ storyProvider: () => story });
  await adapter.startWorldHum({ root_hz: 300 });
  assert.deepEqual(story.world, { worldId: 'custom-world', worldName: 'Custom', rootHz: 300, waveform: 'square', overtones: 5 });
  await adapter.setGlyphSonification({ waveform: 'sine', overtones: 2 });
  assert.equal(story.world.rootHz, 300);
  assert.equal(story.world.waveform, 'sine');
  assert.equal(story.world.overtones, 2);
  await adapter.startWorldHum({ world_id: 'house-world-luna', world_name: 'Luna' });
  assert.equal(story.world.rootHz, 432);
  assert.equal(story.world.waveform, 'triangle');
  await adapter.startWorldHum({ world_id: 'other-custom', world: { id: 'other-custom', name: 'Other', soundscape: { rootHz: 315, waveform: 'sawtooth', overtones: 4 } } });
  assert.deepEqual(story.world, { worldId: 'other-custom', worldName: 'Other', rootHz: 315, waveform: 'sawtooth', overtones: 4 });
  await adapter.startWorldHum({ world_id: 'third-custom', root_hz: 444, world: { id: 'third-custom', soundscape: { rootHz: 315 } } });
  assert.equal(story.world.rootHz, 444);
});

test('Feather invokes real Bluebird shutdown, clearing its timer, voices and tactile proxy nodes', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const story = mountedStory();
  const stopped = [];
  const disconnected = [];
  const notes = [];
  story.bluebirdActive = true;
  story.bluebirdSomaticProxy = true;
  story.bluebirdTimer = setTimeout(() => assert.fail('bounded timer was not cancelled'), 480000);
  story.bluebirdOutput = { disconnect: () => disconnected.push('output') };
  story.soundfontSynth = { noteOff: (...note) => notes.push(note) };
  story.bluebirdNodes = ['voice', 'somatic-proxy'].map((id) => ({
    source: { stop: (when) => stopped.push({ id, when }) },
    extras: [{ disconnect: () => disconnected.push(id) }],
  }));
  const adapter = createRunaManifestationAdapter({ storyProvider: () => story });
  const receipt = adapter.feather();
  assert.equal(story.bluebirdActive, false);
  assert.equal(story.bluebirdTimer, null);
  assert.equal(story.bluebirdOutput, null);
  assert.deepEqual(story.bluebirdNodes, []);
  assert.deepEqual(stopped.map(({ id }) => id), ['voice', 'somatic-proxy']);
  assert.equal(notes.length, 3);
  assert.ok(receipt.stopped.includes('bluebird-weighted-home'));
  t.mock.timers.tick(480000);
  assert.deepEqual(disconnected, ['voice', 'somatic-proxy', 'output']);
});

test('Safe Gateway reuses the existing Möbius engine and preserves its 5.5 Hz offset plan', async () => {
  const story = fakeStory();
  const gateway = fakeGateway();
  const adapter = createRunaManifestationAdapter({
    storyProvider: () => story,
    mobiusProvider: async () => gateway,
  });

  const receipt = await adapter.startSafeGateway({ hold: true, master: 0.1 });
  assert.equal(gateway.ensured, 1);
  assert.deepEqual(gateway.starts, ['gateway-offset']);
  assert.equal(receipt.frequency_plan.left_hz, 369);
  assert.equal(receipt.frequency_plan.right_hz, 363.5);
  assert.equal(receipt.frequency_plan.binaural_difference_hz, 5.5);
  assert.equal(adapter.status().safe_gateway_active, true);

  adapter.stopSafeGateway('test');
  assert.equal(gateway.feathers, 1);
  assert.equal(adapter.status().safe_gateway_active, false);
});

test('armed Glyph Voice turns committed strokes into deterministic StorySoundscape tones and deduplicates receipts', async () => {
  const story = fakeStory();
  const vibrateCalls = [];
  const adapter = createRunaManifestationAdapter({
    storyProvider: () => story,
    navigatorProvider: () => ({ vibrate: (pattern) => { vibrateCalls.push(pattern); return true; } }),
  });

  await adapter.setGlyphSonification({ enabled: true, haptics: true, world_id: 'terra-aeterna' });
  const stroke = { schema: 'starwell.glyph-stroke-receipt/v1', stroke_id: 'stroke-1', glyph_id: 'glyph-1', brush_id: 'brush-1', point_count: 24 };
  const first = adapter.observeGlyphStroke(stroke, { source: 'test' });
  const duplicate = adapter.observeGlyphStroke(stroke, { source: 'test-duplicate' });

  assert.equal(first.kind, 'glyph-stroke');
  assert.equal(first.outputs.audio, true);
  assert.equal(first.outputs.native_haptic, true);
  assert.equal(story.tones.length, 1);
  assert.equal(vibrateCalls.length, 1);
  assert.equal(duplicate.duplicate, true);
  assert.equal(story.tones.length, 1);
});

test('Feather stops World Hum, Safe Gateway, legacy Heartfield output, vibration, and disarms Glyph Voice', async () => {
  const story = fakeStory();
  const gateway = fakeGateway();
  const vibrateCalls = [];
  story.heartfieldActive = true;
  const adapter = createRunaManifestationAdapter({
    storyProvider: () => story,
    mobiusProvider: async () => gateway,
    navigatorProvider: () => ({ vibrate: (pattern) => { vibrateCalls.push(pattern); return true; } }),
  });

  await adapter.startWorldHum();
  await adapter.startSafeGateway({ hold: true });
  await adapter.setGlyphSonification({ enabled: true, haptics: true });
  const receipt = adapter.feather('test-feather');

  assert.equal(receipt.kind, 'feather');
  assert.equal(story.humActive, false);
  assert.equal(story.heartfieldActive, false);
  assert.equal(gateway.feathers, 1);
  assert.equal(adapter.status().glyph_sonification_enabled, false);
  assert.equal(adapter.status().safe_gateway_active, false);
  assert.equal(vibrateCalls.at(-1), 0);
});
