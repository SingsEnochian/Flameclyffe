import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

function createWindow() {
  const listeners = new Map();
  const session = new Map();
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
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, String(value)),
      removeItem: (key) => session.delete(key),
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((handler) => handler(event));
      return true;
    },
  };
}

function runScript(path, window) {
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
    sessionStorage: window.sessionStorage,
    localStorage: window.localStorage,
    setTimeout,
    clearTimeout,
  });
  vm.runInContext(read(path), context, { filename: path });
  return window;
}

function loadContract(window = createWindow()) {
  runScript('assets/starwell-audio-patch-contract.js', window);
  runScript('assets/starwell-groundwire-audio-contract.js', window);
  runScript('assets/starwell-audio-output-calibration.js', window);
  return window;
}

const SCFE_BODY_NO = {
  schema_version: 'scfe.field_snapshot.v0.2',
  snapshot_id: 'test-body-no',
  created_at: '2026-07-15T00:00:00Z',
  target_timestamp: '2026-07-15T00:00:00Z',
  mode: 'hearthfire',
  context: { project: 'Flameclyffe' },
  ephemeris: { calculation_status: 'manual_input_only' },
  ephemeris_comparison: {},
  barbault: {
    cyclic_index: 412,
    compression_level: 'high_compression',
    phase_label: 'compression',
    configurations: [{ configuration_type: 'basket_cradle_candidate' }],
  },
  deep: { P: 0.82, C: 0.74, R: 0.89, E: 0.43, M: 0.77, A: 0.05, dp_dt: 0.1 },
  sacred_geometry: {
    primary_form: 'cradle_vessel',
    render_payload: { density: 'high', motion: 'slow_breathing' },
  },
  somatic: {
    activation: 'high',
    fatigue: 'high',
    tinnitus: 'sensitive',
    body_yes: null,
    body_no: 'not today',
    capacity_label: 'body_no',
    interface_safety_mode: 'paused',
  },
  terra_aeterna: { world_mood: 'threshold' },
  agency: { plain_pass: 'Stop here.' },
  agency_switchboard: { active_channel: 'nope_lever' },
  evidence_labels: {
    barbault_index: 'mathematical_index',
    deep: 'theoretical_field_model',
    sacred_geometry: 'theoretical_form_mapping',
    somatic: 'self_report',
    frequency: 'evidence_informed_not_medical',
    terra_aeterna: 'narrative_application',
    agency: 'user_chosen_action',
  },
};

test('all coupled audio and Groundwire scripts parse as JavaScript', () => {
  [
    'assets/starwell-audio-patch-contract.js',
    'assets/starwell-groundwire-audio-contract.js',
    'assets/starwell-audio-output-calibration.js',
    'assets/starwell-shared-audio-context.js',
    'assets/starwell-concurrent-field-audio.js',
    'assets/starwell-groundwire-field-adapter.js',
    'assets/starwell-groundwire-panel.js',
    'assets/groundwire.js',
    'assets/wardenclyffe-mobius-coupler.js',
    'assets/wardenclyffe-groundwire-live.js',
    'assets/starwell-audio-output-witness.js',
  ].forEach((path) => assert.doesNotThrow(() => new Function(read(path)), path));
});

test('Dream-Signal 3.4 closes exactly at the ten-second quantum', () => {
  const window = loadContract();
  const api = window.StarwellAudioPatchContract;
  const patch = api.presets.dreamSignal34;
  const report = api.exactLoopReport(patch);
  const beats = patch.stems
    .filter((stem) => stem.kind === 'binaural-pair')
    .map((stem) => Number(stem.beatFrequency.toFixed(1)));

  assert.equal(report.quantumSeconds, 10);
  assert.equal(report.exact, true);
  assert.equal(report.openFrequencies.length, 0);
  assert.equal(beats.length, 3);
  beats.forEach((beat) => assert.equal(beat, 3.4));
});

test('protected binaural carriers declare a warning when sent to Möbius', () => {
  const window = loadContract();
  const api = window.StarwellAudioPatchContract;
  const patch = api.clone(api.presets.dreamSignal34);
  patch.stems[0].send = 'both';
  const result = api.validatePatch(patch);

  assert.equal(result.valid, true);
  assert.match(result.warnings.join(' '), /protected binaural carriers will bypass Möbius send/i);
});

test('SCFE body-no reaches the audio materializer as a hard veto', () => {
  const window = loadContract();
  runScript('assets/starwell-concurrent-field-audio.js', window);

  window.StarwellConcurrentFieldAudio.setSnapshot(SCFE_BODY_NO, 'test');
  const summary = window.StarwellConcurrentFieldAudio.summarize();
  const patch = window.StarwellConcurrentFieldAudio.materialize(
    window.StarwellAudioPatchContract.presets.dreamSignal34
  );

  assert.equal(summary.somatic.bodySays, 'no');
  assert.equal(summary.somatic.audioMode, 'mute');
  assert.equal(summary.geometry.primary, 'cradle_vessel');
  assert.equal(summary.barbault.compression, 0.82);
  assert.equal(patch.runtime.somaticVeto, true);
  assert.equal(patch.masterGain, 0.0001);
  assert.ok(patch.stems.every((stem) => stem.gain === 0));
});

test('gentle SCFE state keeps a nonzero audible running floor without double attenuation', () => {
  const window = loadContract();
  const api = window.StarwellAudioPatchContract;
  const field = {
    id: 'gentle-field',
    source: 'test',
    deep: { P: 0.68, C: 0.72, R: 0.78, E: 0.34, M: 0.67, A: 0.52, stability: 0.69 },
    barbault: { compressionScalar: 0.58, phase: 'threshold' },
    geometry: { primary: 'cradle_vessel', density: 0.58, symmetry: 0.82 },
    somatic: { capacity: 0.48, activation: 0.55, fatigue: 0.86, bodySays: 'yes', audioMode: 'soft' },
  };
  const patch = api.materializePatch(api.presets.dreamSignal34, field);

  assert.equal(patch.runtime.somaticVeto, false);
  assert.ok(patch.masterGain >= patch.outputCalibration.minimumRunningMaster);
  assert.ok(patch.stems.filter((stem) => stem.enabled).some((stem) => stem.gain >= 0.025));
  assert.equal(patch.runtime.outputCalibration.previousDoubleAttenuationRemoved, true);
});

test('Groundwire constrains capacity and never maps location into pitch', () => {
  const window = loadContract();
  const api = window.StarwellAudioPatchContract;
  const field = {
    id: 'groundwire-field',
    source: 'test',
    deep: { P: 0.6, C: 0.7, R: 0.8, E: 0.3, M: 0.6, A: 0.78, stability: 0.7 },
    somatic: { capacity: 1, activation: 0.2, fatigue: 0.2, bodySays: 'yes', audioMode: 'normal' },
    groundwire: {
      version: '0.2.0',
      location: { status: 'verified', latitude: 29.9, longitude: -81.3, accuracyM: 12 },
      network: { status: 'observed', effectiveType: '4g', downlinkMbps: 12, rttMs: 40, saveData: false },
      hardware: { status: 'observed', hardwareConcurrency: 2, deviceMemoryGb: 2 },
      microphone: { status: 'active', rms: 0.03, peak: 0.12, streamAvailable: true },
      battery: { status: 'observed', charging: false, levelPercent: 4 },
    },
  };
  const patch = api.materializePatch(api.presets.experimentalBlank, field);

  assert.ok(patch.runtime.groundwire.batteryScale < 1);
  assert.ok(patch.runtime.groundwire.deviceScale < 1);
  assert.ok(patch.runtime.groundwire.microphoneInfluence > 0);
  assert.equal(patch.runtime.groundwire.locationAnchor, true);
  assert.equal(patch.runtime.groundwire.locationToneMapping, false);
  assert.ok(patch.metadata.groundwire.location.verified);
});
