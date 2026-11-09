'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createWayglassMcpNativeBridge } = require('../lib/wayglass-mcp-native-bridge.cjs');
const { publicWayglassRoutes, resolveWayglassRoute } = require('../lib/wayglass-route-registry.cjs');
const { inspectWayglassCognitionPreflight } = require('../lib/wayglass-kernel.cjs');
const { createModelObservation } = require('../lib/wayglass-model-observation.cjs');
const RESOURCE = 'https://wayglass.example/mcp';
const context = { principalId:'owner-1', resource:RESOURCE, consentRef:'consent-1', scopes:['wayglass:constellation','wayglass:bluebird'] };
function grant() { return {active:true,ownerAuthorized:true,consentActive:true,subject:context.principalId,resource:RESOURCE,
  consentRef:context.consentRef,grantId:'g1',scopes:[...context.scopes],routeIds:['local:ollama','flame:bluebird:crow'],externalProviderConsent:false}; }
function fixture(overrides={}) {
 const calls=[];let current=grant();
 const bridge=createWayglassMcpNativeBridge({nativeOrigin:'http://127.0.0.1:3841',resource:RESOURCE,
  authorize:async req=>{calls.push(['authorize',req]);return current;},credentialFor:async()=>({authorization:'Bearer house-fixture-secret'}),
  featherStopped:async()=>false,fetchImpl:async(url,request)=>{calls.push(['fetch',url,request]);return Response.json({schema:'wayglass.route-catalogue/v0.1',routes:publicWayglassRoutes()});},...overrides});
 return {bridge,calls,setGrant:value=>current=value};
}
test('catalogue uses verified native request and separate grant filtering',async()=>{
 const f=fixture();const routes=await f.bridge.listRoutes(context);
 assert.deepEqual(routes.map(r=>r.route_id),['local:ollama','flame:bluebird:crow']);
 const request=f.calls.find(c=>c[0]==='fetch');assert.equal(request[1],'http://127.0.0.1:3841/api/v1/wayglass/routes');
 assert.equal(request[2].headers.authorization,'Bearer house-fixture-secret');assert.equal(request[2].redirect,'error');
 const filtered=await f.bridge.listRoutes({...context,scopes:['wayglass:constellation']});assert.deepEqual(filtered.map(r=>r.route_id),['local:ollama']);
});
test('revoked, missing consent, wrong principal/resource and changed grants cannot read',async()=>{
 for(const modify of [g=>g.active=false,g=>g.ownerAuthorized=false,g=>g.revoked=true,g=>g.consentActive=false,g=>g.consentRevoked=true,g=>g.subject='other',g=>g.resource='https://other/mcp',g=>g.consentRef='other']) {
  const f=fixture();const g=grant();modify(g);f.setGrant(g);await assert.rejects(f.bridge.listRoutes(context));assert.equal(f.calls.filter(c=>c[0]==='fetch').length,0);
 }
 const f=fixture();await f.bridge.listRoutes(context);f.setGrant({...grant(),revoked:true});await assert.rejects(f.bridge.listRoutes(context));
 await assert.rejects(f.bridge.listRoutes({...context,resource:'https://other/mcp'}));
});
test('Feather and unknown stop fail before transport, including after credential wait',async()=>{
 for(const stop of [true,undefined]){const f=fixture({featherStopped:async()=>stop});await assert.rejects(f.bridge.listRoutes(context));assert.equal(f.calls.filter(c=>c[0]==='fetch').length,0);}
 let stopped=false;const f=fixture({featherStopped:async()=>stopped,credentialFor:async()=>{stopped=true;return {authorization:'Bearer fixture'};}});
 await assert.rejects(f.bridge.listRoutes(context));assert.equal(f.calls.filter(c=>c[0]==='fetch').length,0);
});
test('caller cannot inject native identity, credentials or ungranted route',async()=>{
 const f=fixture();for(const key of ['participant_id','world_id','session_id','external_provider_consent','authorization','_storedCheckpoint']){
  await assert.rejects(f.bridge.respond({route_id:'local:ollama',input:'hello',[key]:'forged'},context));
 }
 await assert.rejects(f.bridge.respond({route_id:'openai:gpt',input:'hello'},context));assert.equal(f.calls.filter(c=>c[0]==='fetch').length,0);
});
function turn() {
 const route=resolveWayglassRoute('local:ollama');const observation=createModelObservation({route,result:{output:'captured fixture response'},observationId:'observation-fixture'});
 return {schema:'wayglass.route-turn/v0.1',route_id:route.route_id,provider:route.provider,model:route.model(),participant_id:null,output:'captured fixture response',observation,
  kernel_preflight:inspectWayglassCognitionPreflight({route_id:route.route_id}),receipt:{selected_route_id:route.route_id,provider:route.provider,requested_model:route.model(),participant_id:null,observation_id:observation.observation_id,canon_commit:false}};
}
test('turn preserves kernel and provider attribution with distinct MCP invocation',async()=>{
 const f=fixture({fetchImpl:async()=>Response.json(turn())});const output=await f.bridge.respond({route_id:'local:ollama',input:'hello'},context);
 assert.equal(output.output,'captured fixture response');assert.equal(output.mcp_invocation.subject,'owner-1');assert.equal(output.mcp_invocation.model_is_participant,false);assert.equal(output.receipt.canon_commit,false);
});
test('altered model, participant, kernel and observation fail attribution checks',async()=>{
 for(const alter of [x=>x.route_id='openai:gpt',x=>x.model='wrong',x=>x.participant_id='forged',x=>x.receipt.observation_id='other',x=>x.kernel_preflight.status='blocked-kernel',x=>x.observation={...x.observation,source:{...x.observation.source,provider:'other'}}]){
  const result=JSON.parse(JSON.stringify(turn()));alter(result);const f=fixture({fetchImpl:async()=>Response.json(result)});
  await assert.rejects(f.bridge.respond({route_id:'local:ollama',input:'hello'},context),/attribution mismatch/);
 }
});
test('native failures are bounded and sanitized, insecure origins refused',async()=>{
 assert.throws(()=>fixture({nativeOrigin:'http://external.example'}));assert.throws(()=>fixture({nativeOrigin:'https://native.example/path'}));
 const f=fixture({fetchImpl:async()=>{throw new Error('secret credential');}});await assert.rejects(f.bridge.listRoutes(context),error=>!error.message.includes('secret credential'));
 const large=fixture({fetchImpl:async()=>new Response('a'.repeat(1024*1024+1),{headers:{'content-type':'application/json'}})});await assert.rejects(large.bridge.listRoutes(context),/request failed/);
});
test('real canonical native router executes catalogue and kernel with captured provider transport',async t=>{
 const express=require('express');const {createWayglassRouter}=require('../apps/starwell-server/wayglass/router.js');
 const original=process.env.ARCSWEEP_RUNTIME_TOKEN;const originalSecret=process.env.HOUSE_SESSION_SECRET;
 process.env.ARCSWEEP_RUNTIME_TOKEN='native-integration-fixture-only-'+'b'.repeat(48);delete process.env.HOUSE_SESSION_SECRET;
 const app=express();app.use(express.json());let providerCalls=0;
 app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl:async()=>{providerCalls++;return Response.json({message:{content:'captured canonical response'},eval_count:3});}}));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(original===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;else process.env.ARCSWEEP_RUNTIME_TOKEN=original;if(originalSecret===undefined)delete process.env.HOUSE_SESSION_SECRET;else process.env.HOUSE_SESSION_SECRET=originalSecret;});
 const f=fixture({nativeOrigin:'http://127.0.0.1:'+server.address().port,fetchImpl:fetch,credentialFor:async()=>({authorization:'Bearer '+process.env.ARCSWEEP_RUNTIME_TOKEN})});
 const routes=await f.bridge.listRoutes(context);assert.ok(routes.some(r=>r.route_id==='local:ollama'));
 const output=await f.bridge.respond({route_id:'local:ollama',input:'hello'},context);
 assert.equal(output.output,'captured canonical response');assert.equal(output.kernel_preflight.status,'ready-for-route');assert.equal(providerCalls,1);
});
test('revocation across credential and native waits prevents dispatch or disclosure',async()=>{
 let current=grant(),fetchCalls=0;
 const before=fixture({authorize:async()=>current,credentialFor:async()=>{current={...current,revoked:true};return {authorization:'Bearer fixture'};},fetchImpl:async()=>{fetchCalls++;return Response.json({});}});
 await assert.rejects(before.bridge.listRoutes(context));assert.equal(fetchCalls,0);
 current=grant();const during=fixture({authorize:async()=>current,fetchImpl:async()=>{current={...current,revoked:true};return Response.json({schema:'wayglass.route-catalogue/v0.1',routes:publicWayglassRoutes()});}});
 await assert.rejects(during.bridge.listRoutes(context));
});

test('shared grants revoked or changed during final Feather wait cannot disclose catalogue',async()=>{
 for(const mutate of [g=>g.revoked=true,g=>g.active=false,g=>g.consentActive=false,g=>g.consentRevoked=true,
   g=>g.routeIds.push('openai:gpt'),g=>g.nativeContext={participant_id:'forged'}]) {
   const current=grant();let stops=0,fetches=0;
   const f=fixture({authorize:async()=>current,featherStopped:async()=>{if(++stops===3)mutate(current);return false;},
     fetchImpl:async()=>{fetches++;return Response.json({schema:'wayglass.route-catalogue/v0.1',routes:publicWayglassRoutes()});}});
   await assert.rejects(f.bridge.listRoutes(context),/request failed/);
   assert.equal(fetches,1);assert.equal(stops,3);
 }
});
test('shared grant mutation during initial Feather wait cannot dispatch',async()=>{
 const current=grant();let fetches=0;
 const f=fixture({authorize:async()=>current,featherStopped:async()=>{current.revoked=true;return false;},
   fetchImpl:async()=>{fetches++;return Response.json({});}});
 await assert.rejects(f.bridge.listRoutes(context),/grant changed/);assert.equal(fetches,0);
});
test('hung authorizer, credential and Feather adapters time out before upstream dispatch',async()=>{
 for(const name of ['authorize','credentialFor','featherStopped']) {
   let calls=0,signal;
   const hung=async(_request,options)=>{signal=options.signal;return new Promise(()=>{});};
   const f=fixture({adapterTimeoutMs:10,[name]:hung,fetchImpl:async()=>{calls++;return Response.json({});}});
   await assert.rejects(f.bridge.listRoutes(context));assert.equal(calls,0);assert.equal(signal.aborted,true,name);
 }
 for(const adapterTimeoutMs of [0,30001,NaN,1.5])assert.throws(()=>fixture({adapterTimeoutMs}));
});
