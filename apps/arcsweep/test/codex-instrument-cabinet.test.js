import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_INSTRUMENT_CABINET_SCHEMA,
  CODEX_INSTRUMENTS,
  codexInstrument,
  codexInstrumentCabinetSnapshot,
  listCodexInstruments,
  validateCodexInstrumentCabinet,
} from '../src/codex/codex-instrument-cabinet.js';
import { codexMotionProfile } from '../src/codex/codex-motion-law.js';

test('instrument cabinet contains the first eight semantic artefacts with unique ids', () => {
  assert.deepEqual(CODEX_INSTRUMENTS.map((instrument) => instrument.id), [
    'leaf',
    'ink',
    'astrolabe',
    'orrery',
    'celestial-sphere',
    'projection-glass',
    'glyph-surface',
    'presence',
  ]);
  assert.equal(new Set(CODEX_INSTRUMENTS.map((instrument) => instrument.id)).size, CODEX_INSTRUMENTS.length);
});

test('every cabinet artefact exposes meaning, terminates motion, and has a quiet state', () => {
  for (const instrument of CODEX_INSTRUMENTS) {
    assert.ok(instrument.exposes.length > 0, `${instrument.id} must not be decorative-only`);
    assert.equal(codexMotionProfile(instrument.motionProfile).iterations, 1, `${instrument.id} motion must terminate`);
    assert.ok(instrument.quietState.length > 0, `${instrument.id} needs a quiet state`);
  }
  assert.deepEqual(validateCodexInstrumentCabinet(), { valid: true, violations: [] });
});

test('cabinet snapshot distinguishes repository-supported work from prototypes and proposals', () => {
  const snapshot = codexInstrumentCabinetSnapshot();
  assert.equal(snapshot.schema, CODEX_INSTRUMENT_CABINET_SCHEMA);
  assert.equal(snapshot.count, 8);
  assert.equal(snapshot.counts.implemented, 2);
  assert.equal(snapshot.counts.prototype, 3);
  assert.equal(snapshot.counts.proposed, 3);
  assert.match(snapshot.principle, /state, relation, transformation, or computation/);
});

test('instrument lookup and semantic filtering make the cabinet usable as runtime data', () => {
  assert.equal(codexInstrument('glyph-surface')?.implementation, 'implemented');
  assert.equal(codexInstrument('ink')?.implementation, 'prototype');
  assert.equal(codexInstrument('missing'), null);

  const computational = listCodexInstruments({ exposes: 'computation' }).map((instrument) => instrument.id);
  assert.deepEqual(computational, ['astrolabe', 'orrery', 'celestial-sphere', 'glyph-surface']);

  const prototypes = listCodexInstruments({ implementation: 'prototype' }).map((instrument) => instrument.id);
  assert.deepEqual(prototypes, ['ink', 'projection-glass', 'presence']);
});

test('cabinet sidecar mounts through the existing physical Codex boot path without replacing the book', async () => {
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/codex-instrument-cabinet-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/codex-instrument-cabinet.css', import.meta.url), 'utf8');

  assert.match(entry, /codex-instrument-cabinet-sidecar\.js/);
  assert.match(sidecar, /data-codex-instrument-cabinet-open/);
  assert.match(sidecar, /codexInstrumentCabinetSnapshot/);
  assert.match(sidecar, /arcsweep:codex-instrument-cabinet-opened/);
  assert.match(css, /data-implementation="implemented"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
