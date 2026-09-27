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

test('Artefact ink is driven by actual Glyph Surface brush samples, never pointer hover', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /arcsweep:glyph-brush-sample/);
  assert.match(source, /arcsweep\.glyph-brush-sample\/v1/);
  assert.match(source, /glyphSampleClientPoint/);
  assert.match(source, /velocity_px_s/);
  assert.match(source, /detail\.pressure/);
  assert.doesNotMatch(source, /pointerDown\s*\|\|\s*event\.pointerType\s*===\s*['"]pen['"]\s*\|\|\s*velocity\s*>\s*42/);
});

test('Pointer tracking no longer deposits pigment by itself', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  const start = source.indexOf('function pointerMove(event)');
  const end = source.indexOf('function pointerDownEvent', start);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(source.slice(start, end), /addInkParticle/);
});

test('Glyph receipt does not create a second generic ink effect after the physical stroke', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /String\(detail\.kind\s*\|\|\s*['"]['"]\)\.toLowerCase\(\)\s*===\s*['"]glyph-stroke['"]/);
});

test('Ink drains to quiet only after the active stroke has ended', async () => {
  const source = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /codex:ink-settled/);
  assert.match(source, /inkActive && ink\.length === 0 && !activeInkStroke/);
  assert.match(source, /phase === ['"]end['"] \? null : strokeId/);
  assert.match(source, /prefers-reduced-motion/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
