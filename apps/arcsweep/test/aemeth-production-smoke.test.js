import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const endpoint = await readFile(new URL('../../../api/v1/house/smoke.js', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../../../.github/workflows/vercel-production-authenticated-smoke.yml', import.meta.url), 'utf8');

test('production smoke exercises OA with a synthetic Aemeth packet and no Rowan witness content', () => {
  assert.match(endpoint, /\/api\/v1\/flames\/oxalpha\/status/);
  assert.match(endpoint, /\/api\/v1\/flames\/oxalpha\/chat/);
  assert.match(endpoint, /arcsweep\.aemeth-participant-packet\/v1/);
  assert.match(endpoint, /synthetic smoke fixture; no Rowan-authored witness content/);
  assert.match(endpoint, /qualiaInferenceAllowed:\s*false/);
  assert.match(endpoint, /modelMayCommitCanon:\s*false/);
});

test('production smoke proves OA persistence, fresh readback, and braid replay', () => {
  assert.match(endpoint, /voice_id:\s*'oxalpha'/);
  assert.match(endpoint, /entry\.voice_id === 'oxalpha'/);
  assert.match(endpoint, /oa_reloaded:\s*true/);
  assert.match(endpoint, /readBraidReplay/);
  assert.match(endpoint, /model_prose_returned:\s*false/);
});

test('production smoke requires durable server-boundary runtime receipts for both real model turns', () => {
  assert.match(endpoint, /commons_thread_id:\s*threadId/);
  assert.match(endpoint, /commons_turn_id:\s*`\$\{threadId\}:atlas`/);
  assert.match(endpoint, /commons_turn_id:\s*`\$\{threadId\}:oxalpha`/);
  assert.match(endpoint, /atlasRuntimeReceipt\?\.persisted !== true/);
  assert.match(endpoint, /atlasRuntimeReceipt\?\.readback_verified !== true/);
  assert.match(endpoint, /oaRuntimeReceipt\?\.persisted !== true/);
  assert.match(endpoint, /oaRuntimeReceipt\?\.readback_verified !== true/);
  assert.match(endpoint, /runtime_receipts:/);
});

test('trusted production workflow fails unless the integrated OA Aemeth proof is present', () => {
  assert.match(workflow, /\/api\/v1\/house\/smoke/);
  assert.match(workflow, /model_presence\?\.oxalpha/);
  assert.match(workflow, /aemeth\?\.oa_reloaded/);
  assert.match(workflow, /arcsweep\.aemeth-participant-packet\/v1/);
});