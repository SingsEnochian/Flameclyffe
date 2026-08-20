import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const pagePath = 'starwell/kelyran-galdr.html';
const instrumentPath = 'assets/kelyran-galdr-instrument.js';
const viteConfigPath = 'apps/starwell/vite.config.js';

test('Kelyran Galdr instrument is published by the STARWELL build', async () => {
  const config = await readFile(viteConfigPath, 'utf8');
  assert.match(config, /starwell\/kelyran-galdr\.html/);
});

test('Kelyran Galdr page wires the instrument and Möbius renderer', async () => {
  const page = await readFile(pagePath, 'utf8');
  assert.match(page, /kelyran-galdr-instrument\.js/);
  assert.match(page, /mobius-audio-bus\.js/);
  assert.match(page, /KelyranGaldrInstrument/);
  assert.match(page, /3 · 6 · 9/);
  assert.match(page, /Live Receipt/);
});

test('Kelyran Galdr instrument parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', instrumentPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('v1.8 trajectory notation and capture contracts remain present', async () => {
  const source = await readFile(instrumentPath, 'utf8');
  assert.match(source, /kelyran\.galdr-score\/v0\.2/);
  assert.match(source, /hearthgate\.math-spine\/v1\.8/);
  assert.match(source, /temporal369/);
  assert.match(source, /observationCoherence/);
  assert.match(source, /stateAddress/);
  assert.match(source, /stratum/);
  assert.match(source, /compactNotation/);
  assert.match(source, /notationEvent/);
  assert.match(source, /start369/);
  assert.match(source, /startMic/);
});
