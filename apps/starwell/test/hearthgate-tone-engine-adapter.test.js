import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Shared mock infrastructure
// ─────────────────────────────────────────────────────────────────────────────

function makeOscillator() {
  const osc = {
    type: 'sine',
    frequency: { value: 440, setValueAtTime() {} },
    connect(node) { return node; },
    start: () => { osc._started = true; },
    stop: () => { osc._stopped = true; },
    _started: false,
    _stopped: false,
  };
  return osc;
}

function makeGainNode(defaultValue = 1) {
  return {
    gain: {
      value: defaultValue,
      setValueAtTime() {},
      linearRampToValueAtTime() {},
    },
    connect(node) { return node; },
  };
}

function makeChannelMerger() {
  return { connect(node) { return node; } };
}

function makeAudioContext() {
  const ctx = {
    currentTime: 0,
    destination: {},
    _oscillators: [],
    _gains: [],
    createOscillator() {
      const osc = makeOscillator();
      ctx._oscillators.push(osc);
      return osc;
    },
    createGain() {
      const g = makeGainNode();
      ctx._gains.push(g);
      return g;
    },
    createChannelMerger() { return makeChannelMerger(); },
    close() { ctx._closed = true; },
    _closed: false,
  };
  return ctx;
}

function makeSharedContext(ctx) {
  const released = [];
  return {
    async ensure() { return ctx; },
    register(clientId) {
      const release = () => released.push(clientId);
      return release;
    },
    released,
  };
}

function makeVibrate() {
  const calls = [];
  return {
    fn: (pattern) => { calls.push(pattern); },
    calls,
  };
}

class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}
class BroadcastChannel {
  constructor(name) { this.name = name; }
  addEventListener() {}
  postMessage() {}
  close() {}
}

function runScript(path, window) {
  const context = vm.createContext({
    window,
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Number,
    String,
    Boolean,
    Promise,
    CustomEvent,
    BroadcastChannel,
    sessionStorage: window.sessionStorage ?? { getItem: () => null, setItem() {}, removeItem() {} },
    localStorage: window.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener: window.addEventListener?.bind(window) ?? (() => {}),
    dispatchEvent: window.dispatchEvent?.bind(window) ?? (() => true),
    setTimeout,
    clearTimeout,
    cancelAnimationFrame: () => {},
    global: window,
    globalThis: window,
  });
  vm.runInContext(read(path), context, { filename: path });
  return window;
}

function createBaseWindow() {
  const listeners = new Map();
  return {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Set,
    Map,
    Number,
    String,
    Boolean,
    Promise,
    setTimeout,
    clearTimeout,
    cancelAnimationFrame: () => {},
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((h) => h(event));
      return true;
    },
  };
}

function loadAdapter() {
  const window = createBaseWindow();
  runScript('assets/hearthgate-tone-engine-adapter.js', window);
  return window;
}

// A valid Hearthgate preflight result (mirrors what preflightToneSession returns)
function makePreflight(overrides = {}) {
  return {
    schema: 'hearthgate.tone-preflight/v1',
    allowed: true,
    reasons: [],
    warnings: [],
    limits: { durationSeconds: 60, volume: 0.15, maxGainDb: -20 },
    stopWords: ['stop', 'feather', 'icarus'],
    boundary: 'session',
    ...overrides,
  };
}

// A minimal Hearthgate TonePatch
function makeTonePatch(overrides = {}) {
  return {
    id: 'test-patch',
    name: 'Test Patch',
    description: 'Used in unit tests',
    frequencyHz: 200,
    overtoneHz: 400,
    hapticPattern: [],
    intensity: 0.12,
    routingMode: 'standard',
    binauralIntegrity: 'none',
    maxSeconds: 60,
    maxVolume: 0.25,
    warnings: [],
    warningFlags: [],
    ...overrides,
  };
}

// SCFE snapshot with body-no
const SCFE_BODY_NO = {
  schema_version: 'scfe.field_snapshot.v0.2',
  snapshot_id: 'test-body-no',
  created_at: '2026-07-19T00:00:00Z',
  target_timestamp: '2026-07-19T00:00:00Z',
  mode: 'hearthfire',
  somatic: {
    body_no: 'not today',
    capacity_label: 'body_no',
    interface_safety_mode: 'paused',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test('adapter script loads and installs HearthgateToneEngineAdapter on window', () => {
  const window = loadAdapter();
  assert.equal(typeof window.HearthgateToneEngineAdapter, 'function');
  const adapter = new window.HearthgateToneEngineAdapter();
  assert.equal(adapter.running, false);
  assert.equal(adapter.lastStop, null);
  assert.equal(adapter.preflightValid, false);
});

test('failed preflight: applyPreflight rejects denied result, play creates zero nodes', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  // Denied preflight
  assert.throws(
    () => adapter.applyPreflight({ allowed: false, reasons: ['profile-blocked'] }, 'test-patch'),
    { code: 'preflight-not-allowed' }
  );

  // No preflight applied — play should throw before touching AudioContext
  const patch = makeTonePatch();
  await assert.rejects(
    () => adapter.play(patch, { consent: true }),
    { code: 'no-preflight' }
  );

  assert.equal(ctx._oscillators.length, 0, 'zero oscillators when preflight absent');
});

test('absent preflight blocks play and creates zero nodes', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();
  const patch = makeTonePatch();

  await assert.rejects(
    () => adapter.play(patch, { consent: true }),
    { code: 'no-preflight' }
  );

  assert.equal(ctx._oscillators.length, 0);
  assert.equal(adapter.running, false);
});

test('mismatched patchId: preflight for one patch cannot play a different patch', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  adapter.applyPreflight(makePreflight(), 'patch-alpha');

  const differentPatch = makeTonePatch({ id: 'patch-beta' });

  await assert.rejects(
    () => adapter.play(differentPatch, { consent: true }),
    { code: 'preflight-patch-mismatch' }
  );

  assert.equal(ctx._oscillators.length, 0);
});

test('explicit consent is required — no consent flag blocks play before node creation', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();
  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);

  await assert.rejects(
    () => adapter.play(patch, {}),
    { code: 'explicit-consent-required' }
  );

  assert.equal(ctx._oscillators.length, 0);
  assert.equal(adapter.running, false);
});

test('SCFE body-no prevents materialisation: play throws, zero nodes created', async () => {
  const window = loadAdapter();
  runScript('assets/starwell-audio-patch-contract.js', window);
  runScript('assets/starwell-concurrent-field-audio.js', window);
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();
  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);

  window.StarwellConcurrentFieldAudio.setSnapshot(SCFE_BODY_NO, 'test');

  await assert.rejects(
    () => adapter.play(patch, { consent: true }),
    { code: 'scfe-body-no' }
  );

  assert.equal(ctx._oscillators.length, 0, 'body-no: zero oscillators created');
  assert.equal(adapter.running, false);
});

test('SCFE body-no halts an active session via onFieldSnapshot', async () => {
  const window = loadAdapter();
  runScript('assets/starwell-audio-patch-contract.js', window);
  runScript('assets/starwell-concurrent-field-audio.js', window);
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);

  // Arrange a gentle (allowed) field state first
  const gentleSnapshot = {
    schema_version: 'scfe.field_snapshot.v0.2',
    snapshot_id: 'gentle',
    created_at: '2026-07-19T00:00:00Z',
    target_timestamp: '2026-07-19T00:00:00Z',
    mode: 'hearthfire',
    somatic: {
      body_no: null,
      capacity_label: 'gentle',
      interface_safety_mode: 'active',
    },
  };
  window.StarwellConcurrentFieldAudio.setSnapshot(gentleSnapshot, 'test');

  const adapter = new Adapter();
  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true });

  assert.equal(adapter.running, true);

  // Now a body-no snapshot arrives mid-session
  adapter.onFieldSnapshot(SCFE_BODY_NO);

  assert.equal(adapter.running, false);
  assert.equal(adapter.lastStop?.reason, 'scfe-body-no');
});

test('binaural routing requires visible acknowledgement flag', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  const patch = makeTonePatch({
    routingMode: 'binaural',
    frequencyHz: 54,
    overtoneHz: 57.4,
    binauralIntegrity: 'protected',
  });
  adapter.applyPreflight(makePreflight(), patch.id);

  // Without acknowledgement
  await assert.rejects(
    () => adapter.play(patch, { consent: true }),
    { code: 'binaural-warning-acknowledgement-required' }
  );

  assert.equal(ctx._oscillators.length, 0);

  // With acknowledgement
  const result = await adapter.play(patch, { consent: true, acknowledgedBinaural: true });
  assert.equal(adapter.running, true);
  assert.ok(result.durationSeconds > 0);
  assert.ok(ctx._oscillators.length === 2, 'two oscillators for binaural-pair');
});

test('standard patch creates two oscillators and registers a completion timer', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  const shared = makeSharedContext(ctx);
  window.StarwellSharedAudioContext = shared;
  const adapter = new Adapter();

  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight({ limits: { durationSeconds: 30, volume: 0.2, maxGainDb: -18 } }), patch.id);

  const result = await adapter.play(patch, { consent: true });

  assert.equal(adapter.running, true);
  assert.equal(ctx._oscillators.length, 2, 'anchor + upper oscillators');
  assert.equal(result.durationSeconds, 30);
  assert.ok(result.volume > 0 && result.volume <= 0.35);

  const snap = adapter.registrySnapshot;
  assert.equal(snap.oscillators, 2);
  assert.equal(snap.timers, 1, 'one registered completion timer');
});

test('global stopAll clears oscillators, timers, haptics, and animation frames', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const vib = makeVibrate();
  window.navigator = { vibrate: vib.fn };
  const adapter = new Adapter();

  const patch = makeTonePatch({ hapticPattern: [200, 100, 200] });
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true, hapticsEnabled: true });

  // Manually push a fake animation frame ID to prove it gets cleared
  adapter._registry.frames.add(99);

  adapter.stopAll('user-stop');

  const snap = adapter.registrySnapshot;
  assert.equal(snap.oscillators, 0, 'oscillators cleared');
  assert.equal(snap.timers, 0, 'timers cleared');
  assert.equal(snap.frames, 0, 'animation frames cleared');
  assert.equal(snap.hapticActive, false, 'haptic flag cleared');
  assert.ok(vib.calls.some((v) => v === 0), 'vibrate(0) called to stop haptics');
  assert.ok(ctx._oscillators.every((o) => o._stopped), 'all oscillators stopped');
});

test('repeated stopAll calls are safe and do not throw', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true });

  assert.doesNotThrow(() => adapter.stopAll('stop'));
  assert.doesNotThrow(() => adapter.stopAll('stop'));
  assert.doesNotThrow(() => adapter.stopAll('stop'));
  assert.doesNotThrow(() => adapter.stopAll('feather'));

  assert.equal(adapter.lastStop.reason, 'stop', 'first reason is preserved (idempotent)');
});

test('natural completion is distinct from user stop in lastStop reason', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true });

  // Simulate natural completion via registered timer callback
  adapter._registeredStop('natural-completion');

  assert.equal(adapter.running, false);
  assert.equal(adapter.lastStop.reason, 'natural-completion');

  // A separate adapter stopped by the user
  const adapter2 = new Adapter();
  adapter2.applyPreflight(makePreflight(), patch.id);
  const ctx2 = makeAudioContext();
  window.StarwellSharedAudioContext = makeSharedContext(ctx2);
  await adapter2.play(patch, { consent: true });
  adapter2.stopAll('user-stop');

  assert.equal(adapter2.lastStop.reason, 'user-stop');
});

test('Dream-Signal 3.4 Hz adapted through adapter uses 10-second loop quantum', () => {
  const window = loadAdapter();
  runScript('assets/starwell-audio-patch-contract.js', window);
  const { hearthgateTonePatchToAudioPatch } = window;
  const api = window.StarwellAudioPatchContract;

  // A binaural patch mimicking the Dream-Signal anchor pair: L=54 Hz, R=57.4 Hz (3.4 Hz beat)
  const hgPatch = makeTonePatch({
    id: 'dream-signal-anchor',
    frequencyHz: 54,
    overtoneHz: 57.4,
    routingMode: 'binaural',
    binauralIntegrity: 'protected',
    maxVolume: 0.08,
  });
  const limits = { durationSeconds: 600, volume: 0.08, maxGainDb: -22 };

  const audioPatch = hearthgateTonePatchToAudioPatch(hgPatch, limits);

  assert.equal(audioPatch.continuityMode, 'infinite-field');
  assert.equal(audioPatch.loopQuantumSeconds, 10);
  assert.equal(audioPatch.stems.length, 1);
  assert.equal(audioPatch.stems[0].kind, 'binaural-pair');
  assert.equal(audioPatch.stems[0].leftFrequency, 54);
  assert.equal(audioPatch.stems[0].rightFrequency, 57.4);

  const beatHz = audioPatch.stems[0].rightFrequency - audioPatch.stems[0].leftFrequency;
  const cyclesIn10s = beatHz * 10;
  assert.equal(Number.isInteger(Math.round(cyclesIn10s * 10) / 10), true);

  // Validate the adapted patch through the STARWELL contract
  const normalized = api.normalizePatch(audioPatch);
  assert.equal(normalized.loopQuantumSeconds, 10);
});

test('Infinite Field phase saved after stop and available for next session', async () => {
  const window = loadAdapter();
  const Adapter = window.HearthgateToneEngineAdapter;
  const ctx = makeAudioContext();
  ctx.currentTime = 7.3;
  window.StarwellSharedAudioContext = makeSharedContext(ctx);
  const adapter = new Adapter();

  const patch = makeTonePatch();
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true });

  assert.equal(adapter.phase, null, 'no phase before first stop');

  adapter.stopAll('feather');

  const phase = adapter.phase;
  assert.ok(phase, 'phase saved after stop');
  assert.ok(typeof phase.savedAt === 'string', 'savedAt is ISO string');
  assert.equal(phase.contextTimeSampled, 7.3, 'context time sampled at stop');
  assert.equal(phase.stoppedByUser, true, 'feather = stoppedByUser true');

  // Second session starts — phase is still accessible
  const ctx2 = makeAudioContext();
  ctx2.currentTime = 0;
  window.StarwellSharedAudioContext = makeSharedContext(ctx2);
  adapter.applyPreflight(makePreflight(), patch.id);
  await adapter.play(patch, { consent: true });

  assert.equal(adapter.running, true, 'second session runs');

  adapter.stopAll('natural-completion');
  const phase2 = adapter.phase;
  assert.equal(phase2.stoppedByUser, false, 'natural completion = stoppedByUser false');
});

test('tonePatchToAudioPatch: standard patch maps to two tone stems with Möbius enabled', () => {
  const window = loadAdapter();
  const { hearthgateTonePatchToAudioPatch } = window;
  const patch = makeTonePatch({ frequencyHz: 432, overtoneHz: 864 });
  const limits = { durationSeconds: 120, volume: 0.2, maxGainDb: -18 };

  const audio = hearthgateTonePatchToAudioPatch(patch, limits);

  assert.equal(audio.schema, 'starwell.audio-patch');
  assert.equal(audio.stems.length, 2);
  assert.equal(audio.stems[0].kind, 'tone');
  assert.equal(audio.stems[1].kind, 'tone');
  assert.equal(audio.stems[0].frequency, 432);
  assert.equal(audio.stems[1].frequency, 864);
  assert.ok(audio.mobius.enabled);
  assert.ok(audio.masterGain > 0 && audio.masterGain <= 0.35);
  assert.ok(audio.metadata.serverPreflight);
  assert.equal(audio.metadata.durationCeilingSeconds, 120);
});

test('gain ceiling: adapter never exceeds server-approved volume or maxVolume', () => {
  const window = loadAdapter();
  const { hearthgateTonePatchToAudioPatch } = window;

  // Server says 0.1, patch says 0.25
  const a = hearthgateTonePatchToAudioPatch(makeTonePatch({ maxVolume: 0.25 }), { durationSeconds: 60, volume: 0.1, maxGainDb: -20 });
  assert.ok(a.masterGain <= 0.1, 'server ceiling 0.1 wins over patch maxVolume 0.25');

  // Server says 0.3, patch says 0.08
  const b = hearthgateTonePatchToAudioPatch(makeTonePatch({ maxVolume: 0.08 }), { durationSeconds: 60, volume: 0.3, maxGainDb: -12 });
  assert.ok(b.masterGain <= 0.08, 'patch maxVolume 0.08 wins over server volume 0.3');

  // Neither exceeds 0.35 hard cap
  const c = hearthgateTonePatchToAudioPatch(makeTonePatch({ maxVolume: 0.99 }), { durationSeconds: 60, volume: 0.99, maxGainDb: 0 });
  assert.ok(c.masterGain <= 0.35, 'hard cap of 0.35 always enforced');
});
