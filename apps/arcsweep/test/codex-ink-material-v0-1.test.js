import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { codexInstrument } from '../src/codex/codex-instrument-cabinet.js';
import { liquidInkSample } from '../src/universal-codex-artefact-motion-model.js';

test('Ink is a live bounded Codex prototype with a quiet-state event', () => {
  const ink = codexInstrument('ink');
  assert.equal(ink?.implementation, 'prototype');
  assert.equal(ink?.kind, 'material-field');
  assert.deepEqual(ink?.exposes, ['state', 'transformation']);
  assert.ok(ink?.inputs.includes('glyph-stroke'));
  assert.ok(ink?.inputs.includes('pressure'));
  assert.ok(ink?.inputs.includes('velocity'));
  assert.ok(ink?.emits.includes('codex:ink-settled'));
  assert.match(ink?.quietState || '', /dry|no flow/i);
});

test('Ink remains finite and pressure-sensitive', () => {
  const light = liquidInkSample({ x: 0.42, y: 0.61, pressure: 0.12, velocity: 120, seed: 'ink-v0.1' });
  const heavy = liquidInkSample({ x: 0.42, y: 0.61, pressure: 0.88, velocity: 120, seed: 'ink-v0.1' });
  assert.ok(heavy.radius > light.radius);
  assert.ok(heavy.opacity > light.opacity);
  assert.ok(heavy.lifeMs > light.lifeMs);
  assert.ok(heavy.lifeMs < 2000);
});

test('Artefact ink appears only during active Glyph Surface drawing, never pointer hover', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /\[data-magic-glyph-canvas\]/);
  assert.match(source, /pointerDown\s*&&\s*glyphSurface/);
  assert.doesNotMatch(source, /pointerDown\s*\|\|\s*event\.pointerType\s*===\s*['"]pen['"]\s*\|\|\s*velocity\s*>\s*42/);
  assert.match(source, /starwell:glyph-stroke-committed/);
});

test('Glyph receipt does not create a second generic ink effect after the physical stroke', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /String\(detail\.kind\s*\|\|\s*['"]['"]\)\.toLowerCase\(\)\s*===\s*['"]glyph-stroke['"]/);
  assert.match(source, /return;/);
});

test('Ink drains to quiet and emits codex:ink-settled instead of running forever', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /codex:ink-settled/);
  assert.match(source, /if \(inkActive && ink\.length === 0\) emitInkSettled\(['"]settled['"]\)/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
