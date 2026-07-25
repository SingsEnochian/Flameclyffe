import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = process.argv[2] || new URL('../assets/elara-composer-core.js', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const window = {
  setInterval() { return 0; },
  clearInterval() {},
  addEventListener() {},
  dispatchEvent() {},
  mobiusAudioBus: null
};
const document = {};
const sandbox = {
  window,
  document,
  console,
  Date,
  Math,
  JSON,
  Blob: class Blob {},
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
};
vm.createContext(sandbox);
new vm.Script(source, { filename: String(sourcePath) }).runInContext(sandbox);

const core = window.ElaraComposerCore;
assert.ok(core, 'ElaraComposerCore should be exposed on window');
assert.equal(core.version, '0.1.0');
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

console.log('Elara Composer validation passed.');
console.log(JSON.stringify({
  version: core.version,
  keys: Object.keys(core.keys),
  movements: core.movements.length,
  years: Array.from(triple.years, (year) => year.year),
  tripleDurationSeconds: triple.duration
}, null, 2));
