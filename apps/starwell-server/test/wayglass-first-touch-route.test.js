'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

test('FAEpank First Touch HTTP crosses authentic steward gate into native Wyrdrune and Return',async()=>{
  const previous=process.env.ARCSWEEP_RUNTIME_TOKEN;
  const token='first-touch-sandbox-'+ 'e'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN=token;
  const app=express();
  app.use(express.json());
  app.use('/api/v1/wayglass',createWayglassRouter());
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');
    const url='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass/wyrdrune/';
    const send=(body={},headers={},surface='first-touch')=>fetch(url+surface,{method:'POST',
      headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    const refused=await send({mode:'repair',touch:.65});
    assert.equal(refused.status,401);
    const forged=await send({mode:'repair',touch:.65},{'x-owner-authorized':'true'});
    assert.equal(forged.status,401);
    const approved={authorization:'Bearer '+token};
    const accepted=await send({mode:'repair',touch:.65},approved);
    assert.equal(accepted.status,200);
    assert.equal(accepted.headers.get('cache-control'),'no-store');
    const voyage=await accepted.json();
    assert.equal(voyage.status,'connected-sandbox-preview');
    assert.equal(voyage.demonstration.real_telemetry,false);
    assert.equal(voyage.demonstration.live_ai_called,false);
    assert.equal(voyage.return_verification.verdict,'accepted');
    assert.equal(voyage.visualisation_proposal.kind,'fold:witness');
    assert.equal(voyage.runtime.participant_count,1);
    assert.equal(voyage.model_invoked,false);
    assert.equal(voyage.production_mutation,false);
    assert.equal(voyage.persisted,false);
    const growth=await send({mode:'expand',touch:.3},approved);
    assert.equal(growth.status,200);
    const expanded=await growth.json();
    assert.equal(expanded.coevolution.proposed_configuration.intelligence.concurrency,5);
    assert.equal(expanded.demonstration.mode,'expand');
    const invalid=await send({mode:'real-world',touch:.5},approved);
    assert.equal(invalid.status,400);
    const excessive=await send({mode:'repair',touch:1e300},approved);
    assert.equal(excessive.status,400);

    const current=await send({mode:'repair',crossingConsent:true},approved,'first-voyage');
    const legacy=await send({mode:'repair',fictionConsent:true},approved,'first-voyage');
    assert.equal(current.status,200);
    assert.equal(legacy.status,200);
    const latest=await current.json(), earlier=await legacy.json();
    assert.equal(latest.schema,'wayglass.first-voyage-response/v0.1');
    assert.equal(latest.receipt.status,earlier.receipt.status);
    const ambiguous=await send({mode:'repair',crossingConsent:false,fictionConsent:true},approved,'first-voyage');
    assert.equal(ambiguous.status,400);
  }finally{
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    if(previous===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN=previous;
  }
});
