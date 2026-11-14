'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runFirstTouch } = require('../../lib/wayglass-first-touch-demo.cjs');
const principal = { id:'house:steward',authorized:true };
const at = new Date('2026-11-13T20:00:00.000Z');

test('first-touch Soothe executes actual Wyrdrune, tensor, Observer and Return as synthetic only', async () => {
 const r = await runFirstTouch({ principal, mode:'repair',touch:.7,now:at });
 assert.equal(r.status,'connected-sandbox-preview');
 assert.equal(r.demonstration.mode,'repair');
 assert.equal(r.demonstration.source,'synthetic-fixture');
 assert.equal(r.demonstration.real_telemetry,false);
 assert.equal(r.demonstration.live_ai_called,false);
 assert.equal(r.demonstration.preview_only,true);
 assert.equal(r.coevolution.status,'proposed-only');
 assert.equal(r.mythience.status,'candidate-returned');
 assert.equal(r.tensor.backend,'cpu-reference');
 assert.equal(r.observer.source_status.every(v=>v.status==='unavailable'),true);
 assert.equal(r.return_verification.verdict,'accepted');
 assert.equal(r.visualisation_proposal.autoplay,false);
 assert.equal(r.production_mutation,false);
 assert.equal(r.canon_commit,false);
 assert.equal(r.persisted,false);
});
test('first-touch Bloom follows Wyrdrune expansion profile and actually changes its proposal', async () => {
 const r = await runFirstTouch({ principal, mode:'expand',touch:.4,now:at });
 assert.equal(r.status,'connected-sandbox-preview');
 assert.deepEqual(r.coevolution.proposed_configuration,{
  infrastructure:{queue_capacity:28,timeout_ms:1150},
  intelligence:{concurrency:5,context_tokens:2176},
 });
 assert.equal(r.demonstration.mode,'expand');
 assert.equal(r.mythience.candidate.ability.id,'ability:responsive-light');
});
test('no unauthorised participant, non-finite touch or unknown mode passes the host bridge', async () => {
 await assert.rejects(runFirstTouch({principal:{id:'visitor',authorized:true},mode:'repair',touch:.5}),/authenticated/);
 await assert.rejects(runFirstTouch({principal:{id:'house:steward',authorized:false},mode:'repair',touch:.5}),/authenticated/);
 await assert.rejects(runFirstTouch({principal,mode:'repair',touch:Infinity}),/Touch intensity/);
 await assert.rejects(runFirstTouch({principal,mode:'repair',touch:-1}),/Touch intensity/);
 await assert.rejects(runFirstTouch({principal,mode:'unverified',touch:.5}),/mode/);
});
test('Feather prevents all work and returns no false integrated result', async () => {
 const r=await runFirstTouch({principal,mode:'repair',touch:.5,now:at,feather:()=>true});
 assert.equal(r.status,'feather-stopped');
 assert.equal(r.departure,null);
 assert.equal(r.demonstration.real_telemetry,false);
});
