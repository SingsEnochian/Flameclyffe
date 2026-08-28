import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const endpoint = await readFile(new URL('../../../api/v1/house/aemeth-smoke.js', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../../../.github/workflows/vercel-production-authenticated-smoke.yml', import.meta.url), 'utf8');

test('Aemeth production smoke exercises OA without using Rowan witness content', () => {
  assert.match(endpoint, /\/api\/v1\/flames\/oxalpha\/status/);
  assert.match(endpoint, /\/api\/v1\/flames\/oxalpha\/chat/);
  assert.match(endpoint, /arcsweep\.aemeth-participant-packet\/v1/);
  assert.match(endpoint, /synthetic smoke fixture; no Rowan-authored witness content/);
  assert.match(endpoint, /qualiaInferenceAllowed:\s*false/);
  assert.match(endpoint, /modelMayCommitCanon:\s*false/);
});

test('Aemeth production smoke proves OA persistence, readback, and braid replay', () => {
  assert.match(endpoint, /voice_id:\s*'oxalpha'/);
  assert.match(endpoint, /entry\.voice_id === 'oxalpha'/);
  assert.match(endpoint, /oa_reloaded:\s*true/);
  assert.match(endpoint, /readBraidReplay/);
  assert.match(endpoint, /model_prose_returned:\s*false/);
});

test('trusted production workflow runs both the House and Aemeth OA probes', () => {
  assert.match(workflow, /\/api\/v1\/house\/smoke/);
  assert.match(workflow, /\/api\/v1\/house\/aemeth-smoke/);
  assert.match(workflow, /aemeth_oa/);
});
