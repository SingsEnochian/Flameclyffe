import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IPadSomaticHapticSession,
  SOMATIC_DEVICE_PROFILES,
  buildSomaticCompressionReleasePlan,
  detectIPadSomaticCapabilities,
  foldFrequencyIntoDeviceBand,
} from '../src/ipad-somatic-haptics.js';

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}

const candidate = {
  world_id: 'terra-aeterna',
  world_name: 'Terra Aeterna / Hearthweave',
  profile_version: '0.2',
  tone_layer_id: 'hearthlight-root',
  root_hz: 220,
  enter_threshold: 0.82,
  release_threshold: 0.68,
  excursion: 5,
  source_ref: 'test-profile',
  approval_state: 'pending',
};

class FakeParam {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, at) { this.value = value; this.events.push(['set', value, at]); }
  linearRampToValueAtTime(value, at) { this.value = value; this.events.push(['ramp', value, at]); }
}

class FakeNode {
  constructor(kind) {
    this.kind = kind;
    this.connections = [];
    this.started = false;
    this.stopped = false;
    this.disconnected = false;
  }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 1;
    this.destination = new FakeNode('destination');
    this.gains = [];
    this.oscillators = [];
    this.resumed = false;
    this.closed = false;
  }
  createGain() {
    const node = new FakeNode('gain');
    node.gain = new FakeParam();
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new FakeNode('oscillator');
    node.frequency = new FakeParam();
    this.oscillators.push(node);
    return node;
  }
  async resume() { this.resumed = true; }
  async close() { this.closed = true; }
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test('iPad capability receipt never claims an internal haptic actuator', () => {
  const capabilities = detectIPadSomaticCapabilities({
    navigatorObject: {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
      platform: 'iPad',
      maxTouchPoints: 5,
      standalone: true,
    },
    target: {},
    matchMediaFunction: () => ({ matches: true }),
  });

  assert.equal(capabilities.ipad, true);
  assert.equal(capabilities.standalone, true);
  assert.equal(capabilities.internal_haptic_actuator, false);
  assert.equal(capabilities.external_audio_transport, true);
});

test('frequency folding preserves octave identity inside each somatic device band', () => {
  close(foldFrequencyIntoDeviceBand(20_480, { minimumHz: 35, maximumHz: 120 }), 80);
  close(foldFrequencyIntoDeviceBand(17.5, { minimumHz: 35, maximumHz: 120 }), 35);
  close(foldFrequencyIntoDeviceBand(720, { minimumHz: 90, maximumHz: 360 }), 360);
});

test('somatic plan enforces compression of the preceding release', () => {
  const plan = buildSomaticCompressionReleasePlan(candidate, 1, {
    deviceProfileId: 'body-transducer',
    cycles: 4,
    baseGain: 0.02,
  });

  assert.equal(plan.recurrence.rendered_cycles, 4);
  assert.equal(plan.events.length, 9);
  assert.equal(plan.events[1].role, 'compression');
  assert.equal(plan.events[2].role, 'release');
  assert.equal(plan.events[3].seed_from_release_event, 'release-1');
  close(plan.events[3].start_gain, plan.events[2].end_gain);
  close(plan.events[5].start_gain, plan.events[4].end_gain);
  assert.equal(plan.events.every((event) => (
    event.frequency_hz >= SOMATIC_DEVICE_PROFILES['body-transducer'].minimum_hz
      && event.frequency_hz <= SOMATIC_DEVICE_PROFILES['body-transducer'].maximum_hz
  )), true);
  assert.equal(plan.events.every((event) => event.peak_gain <= 0.06), true);
  assert.equal(plan.source_pair.direct_class, 'ultrasonic');
  assert.equal(plan.source_pair.inverse_class, 'infrasonic');
});

test('body transducer path fails closed without output, placement, clearance, and start-low confirmations', async () => {
  const session = new IPadSomaticHapticSession({
    audioContextFactory: () => new FakeAudioContext(),
    storage: new MemoryStorage(),
  });
  await session.loadCandidate(candidate);

  await assert.rejects(
    () => session.audition({ foldIndex: 1, deviceProfileId: 'body-transducer' }),
    /external-output confirmation/,
  );
  await assert.rejects(
    () => session.audition({
      foldIndex: 1,
      deviceProfileId: 'body-transducer',
      outputConfirmed: true,
      startLowConfirmed: true,
    }),
    /body placement/,
  );
  await assert.rejects(
    () => session.audition({
      foldIndex: 1,
      deviceProfileId: 'body-transducer',
      outputConfirmed: true,
      startLowConfirmed: true,
      placement: 'sternum',
    }),
    /placement clearance/,
  );
});

test('audio somatic path schedules the full recurrence and issues an approval receipt', async () => {
  const storage = new MemoryStorage();
  const context = new FakeAudioContext();
  const now = new Date('2026-08-03T19:29:00Z');
  const session = new IPadSomaticHapticSession({
    audioContextFactory: () => context,
    storage,
    now: () => now,
  });

  await session.loadCandidate(candidate);
  const audition = await session.audition({
    foldIndex: 1,
    deviceProfileId: 'body-transducer',
    cycles: 3,
    baseGain: 0.02,
    outputConfirmed: true,
    placement: 'sternum',
    placementClearanceConfirmed: true,
    startLowConfirmed: true,
  });

  assert.equal(audition.internal_haptic_actuator, false);
  assert.equal(audition.output_device_detected, false);
  assert.equal(audition.output_confirmation, 'user-confirmed');
  assert.equal(context.resumed, true);
  assert.equal(context.oscillators.length, 7);

  const complete = await session.markAuditionComplete();
  assert.equal(complete.status, 'completed');
  assert.match(complete.receipt_hash, /^[0-9a-f]{64}$/);

  await assert.rejects(
    () => session.decide({
      decision: 'approved',
      outputConfirmed: true,
      feltAndIdentified: true,
      comfortable: false,
    }),
    /comfort confirmation/,
  );

  const receipt = await session.decide({
    decision: 'approved',
    outputConfirmed: true,
    feltAndIdentified: true,
    comfortable: true,
    note: 'Compression and release remained distinct and comfortable.',
  });
  assert.equal(receipt.signer, 'rowan');
  assert.equal(receipt.decision, 'approved');
  assert.match(receipt.receipt_hash, /^[0-9a-f]{64}$/);
  assert.equal(session.readReceipts().length, 1);
});

test('native controller bridge receives play and Feather Stop commands', async () => {
  const messages = [];
  const session = new IPadSomaticHapticSession({
    nativeBridge: { postMessage: (message) => messages.push(message) },
    storage: new MemoryStorage(),
  });
  await session.loadCandidate(candidate);
  await session.audition({
    foldIndex: 0.9,
    deviceProfileId: 'native-controller-bridge',
    cycles: 2,
    baseGain: 0.2,
    outputConfirmed: true,
    startLowConfirmed: true,
  });
  assert.equal(messages[0].action, 'play');
  assert.equal(messages[0].plan.recurrence.rendered_cycles, 2);
  await session.stop('test-stop');
  assert.equal(messages.at(-1).action, 'stop');
  assert.equal(messages.at(-1).reason, 'test-stop');
});
