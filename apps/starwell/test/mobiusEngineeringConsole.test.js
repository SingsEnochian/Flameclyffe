import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const consolePath = 'assets/mobius-engineering-console.js';
const observatoryPath = 'assets/mobius-live-observatory.js';

test('Mobius engineering console parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', consolePath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('live Observatory loads the engineering console independently of context availability', async () => {
  const source = await readFile(observatoryPath, 'utf8');
  assert.match(source, /mobius-engineering-console\.js/);
  assert.match(source, /Signal and context stay separate by design/);
  assert.match(source, /do not touch the audible signal unless an explicit mapper is active/);
});

test('engineering console exposes audio-engineering telemetry and four-plane system boundaries', async () => {
  const source = await readFile(consolePath, 'utf8');
  assert.match(source, /Stereo correlation/);
  assert.match(source, /Dynamics reduction/);
  assert.match(source, /Headroom/);
  assert.match(source, /Run 4-step preflight/);
  assert.match(source, /Signal plane/);
  assert.match(source, /Context plane/);
  assert.match(source, /Evidence plane/);
  assert.match(source, /Escape plane/);
  assert.match(source, /Feather Stop/);
  assert.match(source, /starwell\.mobius-engineering-receipt\/v0\.1/);
});

test('engineering instrumentation is a silent post-dynamics tap, not a second audible output', async () => {
  const source = await readFile(consolePath, 'utf8');
  assert.match(source, /bus\.nodes\.limiter\.connect\(s\)/);
  assert.match(source, /ml\.gain\.value=mr\.gain\.value=0/);
  assert.match(source, /ml\.connect\(x\.destination\)/);
  assert.match(source, /mr\.connect\(x\.destination\)/);
});