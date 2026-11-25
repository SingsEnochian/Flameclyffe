'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const path = require('node:path');
const express = require('express');
const createWayglassRouter = require('../wayglass/router');

const source = require('node:fs').readFileSync(
  path.join(__dirname, '../../../lib/wyrdrune/wayglass-vessel-plan.wtl'),
  'utf8',
);
const context = {
  system_count: 8,
  assembled_systems: 8,
  system_ids: [
    'authority-kernel','wyrdrune-language','eightfold-mobius','sensory-body',
    'observer-science','constellation-agency','return-universe','cloud-host-install',
  ],
};

test('native Wyrdrune workbench requires an authenticated House Steward session', async () => {
  const old = Object.fromEntries(['ARCSWEEP_RUNTIME_TOKEN','SUPABASE_URL','SUPABASE_PROJECT_URL','VITE_SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY'].map(key => [key, process.env[key]]));
  for (const key of Object.keys(old)) if (key !== 'ARCSWEEP_RUNTIME_TOKEN') delete process.env[key];
  const token = 'wayglass-workbench-private-test-' + 'a'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter.createWayglassRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/wyrdrune/workbench`;
    const send = (body, headers = {}) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    assert.equal((await send({ source, mode: 'compile' })).status, 401);
    assert.equal((await send({ source, mode: 'compile' }, { 'x-owner-authorized': 'true' })).status, 401);
    const signed = await send({ source, mode: 'compile' }, { authorization: 'Bearer ' + token });
    assert.equal(signed.status, 200);
    const compiled = await signed.json();
    assert.equal(compiled.schema, 'wayglass.wyrdrune-workbench/v1');
    assert.equal(compiled.ir.units.length, 2);
    assert.equal(compiled.dispatch, 'none');
    assert.deepEqual(compiled.external_effects, []);

    const sky=await import('../../../lib/wyrdrune/skyrunor.mjs');
    const glyphs='ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ';
    const translate=(body,headers={})=>fetch(url.replace('/workbench','/translate'),{
      method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)
    });
    const auth={authorization:'Bearer '+token};
    assert.equal((await translate({format:'skyrunor',input:glyphs})).status,401);
    assert.equal((await translate({format:'skyrunor',input:glyphs},{'x-owner-authorized':'true'})).status,401);
    const translated=await translate({format:'skyrunor',input:glyphs},auth);
    assert.equal(translated.status,200);
    const semantic=await translated.json();
    assert.equal(semantic.executed,false);assert.equal(semantic.physically_verified,false);
    assert.equal(semantic.requires_explicit_execution,true);assert.equal(semantic.dispatch,'none');
    assert.deepEqual(semantic.external_effects,[]);
    assert.equal(semantic.source,sky.astToWtl(sky.glyphsToAst(glyphs)));
    assert.equal((await translate({format:'skyrunor',input:glyphs,mode:'execute'},auth)).status,400);
    assert.equal((await translate({format:'declaration',input:'Measured eyes: green'},auth)).status,400);
    assert.equal((await translate({format:'wtl',input:source},auth)).status,200);
    const change=await import('../../../lib/wyrdrune/skyrunor-change.mjs');
    const proposal=await (await translate({format:'change',input:change.EXAMPLE_CHANGE},auth)).json();
    assert.equal(proposal.execution_supported,false);assert.equal(proposal.executed,false);
    assert.equal(proposal.consent_verified,false);
    const declarationCompile=await (await send({source:semantic.source,mode:'compile'},auth)).json();
    assert.equal(declarationCompile.semantic.ast.basis,'owner-declared');
    assert.equal(declarationCompile.execution,undefined);
    assert.equal(declarationCompile.semantic.source_hash,declarationCompile.source_hash);
    const declarationRun=await (await send({source:semantic.source,mode:'execute',context},auth)).json();
    assert.equal(declarationRun.execution.status,'committed');
    assert.deepEqual(declarationRun.execution.output,['My eyes are hazel green','Held']);
    assert.equal(declarationRun.execution.continuity.carry.declaration_basis,'owner-declared');
    assert.equal(declarationRun.semantic.physically_verified,false);
    assert.equal(compiled.semantic.schema,'wyrdrune.skyrunor-program/v0.1');

    const run = await send({ source, mode: 'execute', context }, { authorization: 'Bearer ' + token });
    assert.equal(run.status, 200);
    const result = await run.json();
    assert.equal(result.execution.status, 'committed');
    assert.equal(result.execution.withness.completedCycles, 2);
    assert.equal(result.execution.continuity.carry.vessel_fraction, 1);
    assert.deepEqual(result.execution.output.map(item => item.kind), [
      'wayglass.boot-plan/v1', 'wayglass.vessel-checkpoint/v1',
      'wayglass.launch-plan/v1', 'wayglass.vessel-return-anchor/v1',
    ]);
    assert.equal(result.world_mutation, false);
    assert.equal(result.dispatch, 'none');

    const strict = await send({ source, mode: 'execute', context, require_durable_receipt: true },
      { authorization: 'Bearer ' + token });
    assert.equal(strict.status, 503);
    const durability = await strict.json();
    assert.equal(durability.schema, 'wayglass.wyrdrune-durability-error/v1');
    assert.equal(durability.execution_status, 'committed');
    assert.equal(durability.persistence.status, 'unavailable');
    assert.deepEqual(durability.external_effects, []);
    assert.equal(durability.world_mutation, false);
    assert.equal((await send({ source, mode: 'compile', require_durable_receipt: true },
      { authorization: 'Bearer ' + token })).status, 400);

    const partial = await send({
      source, mode: 'execute',
      context: { ...context, assembled_systems: 6, system_ids: context.system_ids.slice(0, 6) },
    }, { authorization: 'Bearer ' + token });
    assert.equal(partial.status, 200);
    const held = await partial.json();
    assert.equal(held.execution.status, 'rolled-back');
    assert.equal(held.execution.verdict.phase, 'verify');
    assert.equal(held.execution.output.length, 0);

    const bridgeEscape = `mobius {
      perceive { let one = 1; }
      compress { let two = one + one; }
      release { let three = two + one; }
      verify { emit three; }
      integrate { emit three; }
      choose { emit bridge("network","fetch",three); }
      return { emit "return"; }
      transcend { emit "next"; }
    }`;
    const denied = await send({ source: bridgeEscape, mode: 'execute', context }, { authorization: 'Bearer ' + token });
    assert.equal(denied.status, 400);
    assert.match((await denied.json()).error, /Bridge capability unavailable/);

    const malformed = await send({ source: 'not a Wyrdrune programme', mode: 'compile' }, { authorization: 'Bearer ' + token });
    assert.equal(malformed.status, 400);
    const tooLong = await send({ source: 'x'.repeat(50001), mode: 'compile' }, { authorization: 'Bearer ' + token });
    assert.equal(tooLong.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
