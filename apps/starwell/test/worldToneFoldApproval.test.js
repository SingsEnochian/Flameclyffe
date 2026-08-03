import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WorldToneApprovalSession,
  analyseWorldJacobian,
  buildAudioHapticPlan,
  foldFrequencyIntoAuditionBand,
  mapWorldFoldFrequencies,
  singularValues,
  updateFoldLatch,
} from '../src/world-tone-fold-approval.js';

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

test('generic singular-value audit computes the declared Jacobian fold index', () => {
  const values = singularValues([
    [4, 0, 0],
    [0, 2, 0],
    [0, 0, 0.5],
  ]);
  assert.deepEqual(values, [4, 2, 0.5]);

  const audit = analyseWorldJacobian([
    [4, 0, 0],
    [0, 2, 0],
    [0, 0, 0.5],
  ]);
  close(audit.fold_index, 0.875, 1e-10);
  close(audit.condition_number, 8);
  assert.equal(audit.rank_deficient, false);
});

test('rectangular Jacobians use the smaller Gram matrix rather than structural zero padding', () => {
  const audit = analyseWorldJacobian([
    [3, 0, 0],
    [0, 1, 0],
  ]);
  assert.deepEqual(audit.singular_values, [3, 1]);
  close(audit.fold_index, 2 / 3, 1e-10);
  close(audit.condition_number, 3);
});

test('zero Jacobian is classified as complete local collapse', () => {
  const audit = analyseWorldJacobian([
    [0, 0],
    [0, 0],
  ]);
  close(audit.fold_index, 1);
  assert.equal(audit.condition_number, Number.POSITIVE_INFINITY);
  assert.equal(audit.rank_deficient, true);
});

test('fold latch uses separate entry and release thresholds', () => {
  assert.equal(updateFoldLatch(0.81, false), false);
  assert.equal(updateFoldLatch(0.82, false), true);
  assert.equal(updateFoldLatch(0.70, true), true);
  assert.equal(updateFoldLatch(0.67, true), false);
});

test('direct and inverse tones remain reciprocal around the world root', () => {
  const pair = mapWorldFoldFrequencies(220, 1, { enterThreshold: 0.82, excursion: 5 });
  close(pair.direct_hz * pair.inverse_hz, 220 ** 2, 1e-6);
  assert.equal(pair.direct_class, 'ultrasonic');
  assert.equal(pair.inverse_class, 'infrasonic');
});

test('audio-haptic plan octave-folds source branches into a bounded audition band', () => {
  const plan = buildAudioHapticPlan(candidate, 1);
  assert.equal(plan.fidelity, 'bone-conduction-audio-haptic-proxy');
  assert.equal(plan.pulses.length, 7);
  assert.equal(plan.pulses.every((pulse) => pulse.frequency_hz >= 90 && pulse.frequency_hz <= 360), true);
  close(foldFrequencyIntoAuditionBand(880), 220);
});

test('approval requires explicit Shokz confirmation, audition, and felt identification', async () => {
  const storage = new MemoryStorage();
  const context = new FakeAudioContext();
  const session = new WorldToneApprovalSession({
    audioContextFactory: () => context,
    storage,
    now: () => new Date('2026-08-03T18:24:00Z'),
  });

  await session.loadCandidate(candidate);
  await assert.rejects(
    () => session.audition({ foldIndex: 1, shokzConfirmed: false }),
    /Shokz connection confirmation/,
  );
  await assert.rejects(
    () => session.decide({ decision: 'approved', shokzConfirmed: true, feltAndIdentified: true }),
    /has not been auditioned/,
  );

  const audition = await session.audition({ foldIndex: 1, shokzConfirmed: true });
  assert.equal(audition.output_device_detected, false);
  assert.equal(audition.device_confirmation, 'user-confirmed');
  assert.equal(context.resumed, true);
  assert.equal(context.oscillators.length, 7);

  await assert.rejects(
    () => session.decide({ decision: 'approved', shokzConfirmed: true, feltAndIdentified: false }),
    /felt-and-identified confirmation/,
  );

  const receipt = await session.decide({
    decision: 'approved',
    shokzConfirmed: true,
    feltAndIdentified: true,
    note: 'Root and mirrored fold pair are distinct and comfortable.',
  });
  assert.equal(receipt.signer, 'rowan');
  assert.equal(receipt.decision, 'approved');
  assert.match(receipt.receipt_hash, /^[0-9a-f]{64}$/);
  assert.equal(session.readReceipts().length, 1);

  await session.stop();
  assert.equal(context.closed, true);
});
