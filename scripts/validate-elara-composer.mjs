import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TextEncoder } from 'node:util';

const corePath = process.argv[2] || new URL('../assets/elara-composer-core.js', import.meta.url);
const exportPath = process.argv[3] || new URL('../assets/elara-composer-export.js', import.meta.url);
const coreSource = fs.readFileSync(corePath, 'utf8');
const exportSource = fs.readFileSync(exportPath, 'utf8');
const window = {
  setInterval() { return 0; },
  clearInterval() {},
  setTimeout() { return 0; },
  addEventListener() {},
  dispatchEvent() {},
  mobiusAudioBus: null
};
const document = {
  querySelector() { return null; },
  createElement() { return {}; },
  body: { appendChild() {} }
};
const sandbox = {
  window,
  document,
  console,
  Date,
  Math,
  JSON,
  TextEncoder,
  Blob: class Blob {},
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
};
vm.createContext(sandbox);
new vm.Script(coreSource, { filename: String(corePath) }).runInContext(sandbox);
new vm.Script(exportSource, { filename: String(exportPath) }).runInContext(sandbox);

const core = window.ElaraComposerCore;
const exporter = window.ElaraComposerExport;
assert.ok(core, 'ElaraComposerCore should be exposed on window');
assert.ok(exporter, 'ElaraComposerExport should be exposed on window');
assert.equal(core.version, '0.1.0');
assert.equal(exporter.version, '0.2.0');
assert.equal(core.years[2025].multiplier, 1);
assert.equal(core.years[2026].multiplier, 1.15);
assert.equal(core.years[2027].multiplier, 1.3225);
assert.deepEqual(Object.keys(core.keys).sort(), ['c-major', 'e-minor']);
assert.equal(core.movements.length, 4);
assert.equal(core.movements[0].percussion, false, 'Movement I must remain percussion-free');
assert.equal(core.movements[1].percussion, false, 'Movement II must remain percussion-free');
assert.equal(core.movements[2].percussion, true, 'Movement III is the first lawful percussion entrance');

const base = {
  key: 'e-minor',
  language: 'kelyran',
  movement: 'abyss-foundation',
  temporal: '2025',
  mode: 'audition',
  infraMode: 'off',
  infraGain: 0.035,
  masterGain: 0.16,
  seed: 'validation-seed'
};
const movementOne = core.buildInterpretation(base);
assert.equal(movementOne.events.filter((event) => event.kind === 'pulse').length, 0);
assert.ok(movementOne.events.some((event) => event.kind === 'temporal'));
assert.ok(movementOne.events.filter((event) => event.kind === 'temporal').every((event) => event.infraFrequency > 0 && event.infraFrequency < 20));

const solar2027 = core.buildInterpretation({ ...base, key: 'c-major', language: 'english', movement: 'solar-surge', temporal: '2027' });
assert.ok(solar2027.events.some((event) => event.kind === 'pulse'));
assert.equal(solar2027.years[0].multiplier, 1.3225);
assert.equal(solar2027.key.id, 'c-major');

const repeat = core.buildInterpretation(base);
assert.deepEqual(
  movementOne.events.map((event) => [event.kind, event.start, event.frequency ?? null]),
  repeat.events.map((event) => [event.kind, event.start, event.frequency ?? null]),
  'same seed and settings must produce the same score'
);

const triple = core.buildInterpretation({ ...base, movement: 'all', language: 'bilingual', temporal: 'triple' });
assert.deepEqual(Array.from(triple.years, (year) => year.year), [2025, 2026, 2027]);
assert.deepEqual(Array.from(triple.movements), ['abyss-foundation', 'silver-horizon', 'solar-surge', 'full-spiral-return']);
assert.ok(triple.duration > movementOne.duration);

const midi = exporter.encodeMidi(solar2027);
assert.equal(Buffer.from(midi.subarray(0, 4)).toString('ascii'), 'MThd');
assert.equal(Buffer.from(midi.subarray(14, 18)).toString('ascii'), 'MTrk');
const midiTrackCount = (midi[10] << 8) | midi[11];
assert.ok(midiTrackCount >= 2, 'MIDI should contain metadata and at least one musical track');
assert.ok(Buffer.from(midi).includes(Buffer.from('2027')));
assert.ok(Buffer.from(midi).includes(Buffer.from('The Solar Surge')));
assert.ok(Buffer.from(midi).includes(Buffer.from('Earth listens.')));

const fakeAudioBuffer = {
  sampleRate: 32000,
  length: 4,
  numberOfChannels: 2,
  getChannelData(channel) {
    return channel === 0
      ? new Float32Array([0, 0.25, -0.25, 1])
      : new Float32Array([0, -0.5, 0.5, -1]);
  }
};
const wav = exporter.encodeWav(fakeAudioBuffer);
assert.equal(Buffer.from(wav.subarray(0, 4)).toString('ascii'), 'RIFF');
assert.equal(Buffer.from(wav.subarray(8, 12)).toString('ascii'), 'WAVE');
assert.equal(Buffer.from(wav.subarray(36, 40)).toString('ascii'), 'data');
assert.equal(wav.length, 44 + fakeAudioBuffer.length * fakeAudioBuffer.numberOfChannels * 2);
assert.equal(exporter.scoreDurationWithinWavLimit(movementOne), true);
assert.equal(exporter.scoreDurationWithinWavLimit({ duration: exporter.maximumWavSeconds + 0.01 }), false);

console.log('Elara Composer and export validation passed.');
console.log(JSON.stringify({
  coreVersion: core.version,
  exportVersion: exporter.version,
  keys: Object.keys(core.keys),
  movements: core.movements.length,
  years: Array.from(triple.years, (year) => year.year),
  tripleDurationSeconds: triple.duration,
  midiBytes: midi.length,
  wavFixtureBytes: wav.length,
  maximumWavSeconds: exporter.maximumWavSeconds
}, null, 2));
