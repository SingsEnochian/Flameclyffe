import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const endpoint = await readFile(new URL('../../../api/v1/house/runtime-heartbeat.js', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../../../.github/workflows/arcsweep-runtime-heartbeat.yml', import.meta.url), 'utf8');

test('runtime heartbeat supplies explicit House turn identity to the real Flame route', () => {
  assert.match(endpoint, /\/api\/v1\/flames\/atlas\/chat/);
  assert.match(endpoint, /commons_thread_id:\s*threadId/);
  assert.match(endpoint, /commons_turn_id:\s*turnId/);
  assert.match(endpoint, /request_id:\s*turnId/);
  assert.match(endpoint, /world_id:\s*'terra-prime'/);
});

test('runtime heartbeat refuses success without durable readback-verified receipt evidence', () => {
  assert.match(endpoint, /receipt\?\.persisted !== true/);
  assert.match(endpoint, /receipt\?\.readback_verified !== true/);
  assert.match(endpoint, /receipt\.thread_id !== threadId/);
  assert.match(endpoint, /receipt\.turn_id !== turnId/);
  assert.match(endpoint, /receipt\.voice_id !== 'atlas'/);
  assert.match(endpoint, /model_prose_returned:\s*false/);
});

test('trusted workflow waits for the exact production SHA and requires the receipt proof', () => {
  assert.match(workflow, /\/api\/v1\/house\/runtime-heartbeat/);
  assert.match(workflow, /production_sha === process\.env\.GITHUB_SHA/);
  assert.match(workflow, /receipt\?\.persisted === true/);
  assert.match(workflow, /receipt\?\.readback_verified === true/);
  assert.match(workflow, /receipt\?\.voice_id === 'atlas'/);
  assert.match(workflow, /\[heartbeat-smoke\]/);
});
