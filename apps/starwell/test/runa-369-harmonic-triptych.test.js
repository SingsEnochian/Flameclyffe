import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

function loadTriptych() {
  const window = {
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
  };
  const context = vm.createContext({
    window,
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
  });

  vm.runInContext(read('assets/starwell-audio-patch-contract.js'), context, {
    filename: 'assets/starwell-audio-patch-contract.js',
  });
  vm.runInContext(read('assets/runa-369-harmonic-triptych.js'), context, {
    filename: 'assets/runa-369-harmonic-triptych.js',
  });

  return window;
}

test('Runa 3-6-9 presets preserve the named centre carriers and beat differences', () => {
  const window = loadTriptych();
  const Contract = window.StarwellAudioPatchContract;
  const triptych = window.Runa369HarmonicTriptych;

  const expected = [
    ['seed', 333, 3, 331.5, 334.5],
    ['coupling', 666, 6, 663, 669],
    ['transition', 999, 9, 994.5, 1003.5],
  ];

  expected.forEach(([key, carrierHz, beatHz, leftHz, rightHz]) => {
    const patch = triptych.presets[key];
    const stem = patch.stems[0];
    assert.equal(patch.metadata.carrierHz, carrierHz);
    assert.equal(patch.metadata.beatHz, beatHz);
    assert.equal(stem.leftFrequency, leftHz);
    assert.equal(stem.rightFrequency, rightHz);
    assert.equal((stem.leftFrequency + stem.rightFrequency) / 2, carrierHz);
    assert.equal(stem.beatFrequency, beatHz);
    assert.equal(stem.protected, true);
    assert.equal(stem.send, 'dry');
    assert.equal(Contract.exactLoopReport(patch).exact, true);
  });
});

test('Triptych keeps measurement, symbolic correspondence, and pending outputs distinct', () => {
  const { Runa369HarmonicTriptych: triptych } = loadTriptych();

  Object.values(triptych.presets).forEach((patch) => {
    assert.equal(patch.claimLabel, 'symbolic-correspondence');
    assert.equal(patch.metadata.provenance.sourceType, 'user-supplied-graphic');
    assert.equal(patch.metadata.provenance.evidenceRegister, 'symbolic-correspondence');
    assert.equal(patch.metadata.correspondences.evidenceRegister, 'symbolic-correspondence');
    assert.equal(patch.metadata.geometry.outputStatus, 'specified-not-implemented');
    assert.equal(patch.metadata.haptic.outputStatus, 'specified-not-implemented');
    assert.ok(patch.declarations.some((entry) => entry.status === 'established-engineering'));
    assert.ok(patch.declarations.some((entry) => entry.status === 'active-research'));
    assert.ok(patch.declarations.some((entry) => entry.status === 'symbolic-correspondence'));
  });
});

test('Coupled lab boot explicitly loads the Runa triptych sidecar', () => {
  const entry = read('apps/starwell/src/wardenclyffe-mobius-main.js');
  assert.match(entry, /runa-369-harmonic-triptych\.js/);
  assert.match(entry, /Runa369HarmonicTriptych/);
});
