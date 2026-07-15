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

test('all coupled audio scripts parse as JavaScript', () => {
  [
    'assets/starwell-audio-patch-contract.js',
    'assets/starwell-shared-audio-context.js',
    'assets/starwell-concurrent-field-audio.js',
    'assets/wardenclyffe-mobius-coupler.js',
  ].forEach((path) => assert.doesNotThrow(() => new Function(read(path)), path));
});

test('Dream-Signal 3.4 closes exactly at the ten-second quantum', () => {
  const window = runScript('assets/starwell-audio-patch-contract.js', createWindow());
  const api = window.StarwellAudioPatchContract;
  const patch = api.presets.dreamSignal34;
  const report = api.exactLoopReport(patch);

  assert.equal(report.quantumSeconds, 10);
  assert.equal(report.exact, true);
  assert.deepEqual(report.openFrequencies, []);
  assert.deepEqual(
    patch.stems.filter((stem) => stem.kind === 'binaural-pair').map((stem) => Number(stem.beatFrequency.toFixed(1))),
    [3.4, 3.4, 3.4]
  );
});

test('protected binaural carriers declare a warning when sent to Möbius', () => {
  const window = runScript('assets/starwell-audio-patch-contract.js', createWindow());
  const api = window.StarwellAudioPatchContract;
  const patch = api.clone(api.presets.dreamSignal34);
  patch.stems[0].send = 'both';
  const result = api.validatePatch(patch);

  assert.equal(result.valid, true);
  assert.match(result.warnings.join(' '), /protected binaural carriers will bypass Möbius send/i);
});

test('SCFE body-no reaches the audio materializer as a hard veto', () => {
  const window = createWindow();
  runScript('assets/starwell-audio-patch-contract.js', window);
  runScript('assets/starwell-concurrent-field-audio.js', window);

  const scfe = {
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

  window.StarwellConcurrentFieldAudio.setSnapshot(scfe, 'test');
  const summary = window.StarwellConcurrentFieldAudio.summarize();
  const patch = window.StarwellConcurrentFieldAudio.materialize(
    window.StarwellAudioPatchContract.presets.dreamSignal34
  );

  assert.equal(summary.somatic.bodySays, 'no');
  assert.equal(summary.somatic.audioMode, 'mute');
  assert.equal(summary.geometry.primary, 'cradle_vessel');
  assert.equal(summary.barbault.compression, 0.82);
  assert.equal(patch.runtime.somaticVeto, true);
  assert.ok(patch.stems.every((stem) => stem.gain === 0));
});
