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

test('durable receipt assertion fails closed on persistence, readback, identity, and runtime provenance', () => {
  assert.match(endpoint, /receipt\?\.persisted !== true \|\| receipt\?\.readback_verified !== true/);
  assert.match(endpoint, /receipt\.thread_id !== threadId \|\| receipt\.turn_id !== turnId \|\| receipt\.voice_id !== voiceId/);
  assert.match(endpoint, /receipt\.provider !== reply\.provider \|\| receipt\.model !== reply\.model/);
});

test('full production circulation binds explicit House turn identity to Atlas and OA', () => {
  assert.match(endpoint, /commons_thread_id:\s*threadId/);
  assert.match(endpoint, /commons_turn_id:\s*`\$\{threadId\}:atlas`/);
  assert.match(endpoint, /commons_turn_id:\s*`\$\{threadId\}:oxalpha`/);
  assert.match(endpoint, /runtime_receipts:/);
});

test('independent runtime-receipt proof uses a distinct configured cloud Flame and returns no model prose', () => {
  assert.match(endpoint, /smokeTarget === 'runtime-receipt'/);
  assert.match(endpoint, /const voiceId = 'boxfire'/);
  assert.match(endpoint, /\/api\/v1\/flames\/boxfire\/chat/);
  assert.match(endpoint, /schema: 'hearthgate\.runtime-receipt-production-proof\/v1'/);
  assert.match(endpoint, /production_write_scope: 'one verified model-reply runtime receipt; no Commons smoke writes'/);
});

test('trusted production workflow retains the integrated OA Aemeth proof', () => {
  assert.match(workflow, /\/api\/v1\/house\/smoke/);
  assert.match(workflow, /model_presence\?\.oxalpha/);
  assert.match(workflow, /aemeth\?\.oa_reloaded/);
  assert.match(workflow, /arcsweep\.aemeth-participant-packet\/v1/);
});