'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {once}=require('node:events');
const {createWayglassRouter}=require('../wayglass/router');

test('Nursery explanations use the House-owned, non-running-by-default colony',async t=>{
 const before=process.env.ARCSWEEP_RUNTIME_TOKEN;
 process.env.ARCSWEEP_RUNTIME_TOKEN='nursery-test-owner';
 t.after(()=>{if(before===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;else process.env.ARCSWEEP_RUNTIME_TOKEN=before;});
 const app=express();app.use(express.json());app.use('/ship',createWayglassRouter());
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base='http://127.0.0.1:'+server.address().port+'/ship/cell-garden/nursery';
 const request=(path,body,authorized=true)=>fetch(base+path,{
   method:body===undefined?'GET':'POST',
   headers:{...(authorized?{authorization:'Bearer nursery-test-owner'}:{}),'content-type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 assert.equal((await request('',undefined,false)).status,401);
 assert.equal((await request('/step',{expected_generation:0,owner_confirmed:true},false)).status,401);
 const first=await request('');assert.equal(first.status,200);
 let state=await first.json();
 assert.equal(state.generation,0);
 assert.equal(state.groundedUtterances.length,0);
 assert.equal(state.authority,'house-scoped-local-simulation');
 assert.equal(state.cold_return_verified,false);
 assert.equal((await request('/step',{expected_generation:0})).status,403);
 assert.equal((await request('/step',{expected_generation:5,owner_confirmed:true})).status,409);
 for(let i=0;i<4;i++){
   const response=await request('/step',{expected_generation:state.generation,owner_confirmed:true});
   assert.equal(response.status,200);
   state=(await response.json()).culture;
 }
 assert.equal(state.generation,4);
 assert.ok(state.groundedUtterances.length>=2);
 assert.ok(state.groundedUtterances.every(x=>x.source_receipt.kind==='tissue-signal-accepted'));
 const frozen=await request('/feather',{});assert.equal(frozen.status,200);
 state=await frozen.json();assert.equal(state.paused,true);
 assert.equal((await request('/step',{expected_generation:4,owner_confirmed:true})).status,409);
 assert.equal((await request('/resume',{})).status,403);
 const resumed=await request('/resume',{owner_confirmed:true});
 assert.equal(resumed.status,200);
 assert.equal((await resumed.json()).paused,false);
});
