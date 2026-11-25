'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWayglassProgramStore, sourceHash } = require('../wayglass/program-store');

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  async text() { return JSON.stringify(body); },
});

test('program store lists only the Wayglass owner library through the server secret', async () => {
  const calls = [];
  const store = createWayglassProgramStore({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SECRET_KEY: 'server-secret' },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(200, [{ slug: 'vessel', title: 'Vessel' }]);
    },
  });
  const programs = await store.listPrograms();
  assert.equal(programs[0].slug, 'vessel');
  assert.match(calls[0].url, /wayglass_programs/);
  assert.match(calls[0].url, /owner_key/);
  assert.equal(calls[0].options.headers.apikey, 'server-secret');
  assert.equal(calls[0].options.headers.authorization, 'Bearer server-secret');
});

test('program save hashes source and uses the atomic revision RPC', async () => {
  const source = 'mobius { perceive { let x = 1; } compress { let y = x; } release { let z = y; } verify { emit z; } integrate { emit z; } choose { emit z; } return { emit z; } transcend { emit z; } }';
  let body;
  let url;
  const store = createWayglassProgramStore({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-secret' },
    fetchImpl: async (requestUrl, options) => {
      url = requestUrl;
      body = JSON.parse(options.body);
      return jsonResponse(200, { program: { slug: body.p_slug, source_hash: body.p_source_hash }, revision: { version: 1 } });
    },
  });
  const result = await store.saveProgram({
    slug: 'vessel-plan', title: 'Vessel Plan', source, changeNote: 'Initial save',
    metadata: { native: true },
  });
  assert.match(url, /rpc\/wayglass_save_program$/);
  assert.equal(body.p_owner_key, 'rowan');
  assert.equal(body.p_source_hash, sourceHash(source));
  assert.equal(result.program.source_hash, sourceHash(source));
  assert.equal(body.p_metadata.native, true);
});

test('program runs persist source-bound execution receipts and context', async () => {
  let body;
  const store = createWayglassProgramStore({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_KEY: 'service-secret' },
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse(201, [{ run_id: 'run-1', status: body.status }]);
    },
  });
  const result = await store.saveRun({
    programId: 'program-1',
    source: 'source',
    status: 'committed',
    executionReceipt: { output: [1, 2, 3] },
    context: { systems: 8 },
  });
  assert.equal(result.run_id, 'run-1');
  assert.equal(body.owner_key, 'rowan');
  assert.equal(body.source_hash, sourceHash('source'));
  assert.equal(body.execution_receipt.output.length, 3);
  assert.equal(body.context.systems, 8);
});

test('program storage refuses missing server credentials and malformed source', async () => {
  const missing = createWayglassProgramStore({ env: {}, fetchImpl: async () => jsonResponse(200, []) });
  await assert.rejects(missing.listPrograms(), /server-side Supabase secret/);
  const ready = createWayglassProgramStore({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SECRET_KEY: 'secret' },
    fetchImpl: async () => jsonResponse(200, {}),
  });
  await assert.rejects(ready.saveProgram({ slug: 'Bad Slug', title: 'Bad', source: 'x' }), /Programme slug/);
});
