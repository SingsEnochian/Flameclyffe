'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const createWayglassRouter = require('../wayglass/router');

test('Wayglass programme library lists, saves and versions source through the authenticated host', async () => {
  const old = {
    runtime: process.env.ARCSWEEP_RUNTIME_TOKEN,
    url: process.env.SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY,
    fetch: global.fetch,
  };
  const token = 'wayglass-program-library-test-' + 'b'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'server-side-secret-only';
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/rpc/wayglass_save_program')) {
      const body = JSON.parse(options.body);
      return new Response(JSON.stringify({
        program: {
          program_id: 'program-1', owner_key: 'rowan', slug: body.p_slug,
          title: body.p_title, source: body.p_source, source_hash: body.p_source_hash, version: 2,
        },
        revision: {
          revision_id: 'revision-2', program_id: 'program-1', owner_key: 'rowan',
          version: 2, source_hash: body.p_source_hash, source: body.p_source,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('/wayglass_program_revisions')) {
      return new Response(JSON.stringify([{ revision_id: 'revision-2', version: 2 }]), { status: 200 });
    }
    if (String(url).includes('/wayglass_programs')) {
      return new Response(JSON.stringify([{
        program_id: 'program-1', owner_key: 'rowan', slug: 'wayglass-vessel-plan',
        title: 'Wayglass Vessel Plan', source: 'mobius {}', source_hash: 'a'.repeat(64), version: 1,
      }]), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'unexpected storage request' }), { status: 404 });
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter.createWayglassRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/wyrdrune/programs`;
    const send = (url, method = 'GET', body) => fetch(url, {
      method,
      headers: { authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const listed = await send(base);
    assert.equal(listed.status, 200);
    const catalogue = await listed.json();
    assert.equal(catalogue.schema, 'wayglass.program-library/v1');
    assert.equal(catalogue.programs[0].slug, 'wayglass-vessel-plan');

    const source = 'mobius { perceive { let x = 1; } compress { let y = x; } release { let z = y; } verify { emit z; } integrate { emit z; } choose { emit z; } return { emit z; } transcend { emit z; } }';
    const savedResponse = await send(base, 'POST', {
      slug: 'wayglass-vessel-plan', title: 'Wayglass Vessel Plan',
      description: 'Whole vessel', source, change_note: 'New source revision',
    });
    assert.equal(savedResponse.status, 201);
    const saved = await savedResponse.json();
    assert.equal(saved.program.version, 2);
    assert.equal(saved.revision.version, 2);
    assert.equal(saved.program.source_hash.length, 64);

    const history = await send(base + '/wayglass-vessel-plan/revisions');
    assert.equal(history.status, 200);
    const revisions = await history.json();
    assert.equal(revisions.revisions[0].version, 2);

    assert.ok(calls.every(call => call.options.headers.apikey === 'server-side-secret-only'));
    assert.ok(calls.every(call => call.options.headers.authorization === 'Bearer server-side-secret-only'));
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (old.runtime === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN; else process.env.ARCSWEEP_RUNTIME_TOKEN = old.runtime;
    if (old.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = old.url;
    if (old.secret === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = old.secret;
    global.fetch = old.fetch;
  }
});
