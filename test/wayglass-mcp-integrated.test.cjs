'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('../apps/starwell-server/node_modules/express');
const {createWayglassRouter} = require('../apps/starwell-server/wayglass/router.js');
const {createWayglassCloudRuntime} = require('../lib/wayglass-cloud-runtime.cjs');
const RESOURCE='https://wayglass.example/mcp';
test('MCP HTTP to trusted auth to actual native router/kernel and captured provider; revocation and Feather hold',async t=>{
 const original=process.env.ARCSWEEP_RUNTIME_TOKEN,secret=process.env.HOUSE_SESSION_SECRET;
 process.env.ARCSWEEP_RUNTIME_TOKEN='cross-lane-synthetic-'+'f'.repeat(48);delete process.env.HOUSE_SESSION_SECRET;
 let calls=0,revoked=false,stopped=false;const app=express();app.use(express.json());
 app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl:async()=>{calls++;return Response.json({message:{content:'captured integrated response'},eval_count:3});}}));
 const native=app.listen(0,'127.0.0.1');await once(native,'listening');
 const grant={active:true,ownerAuthorized:true,consentActive:true,subject:'owner',resource:RESOURCE,consentRef:'consent-1',grantId:'grant-1',scopes:['wayglass:constellation'],routeIds:['local:ollama'],externalProviderConsent:false};
 const gateway=createWayglassCloudRuntime({resourceUrl:RESOURCE,authorizationServerUrl:'https://auth.example/',ownerSubject:'owner',
  introspect:async token=>token==='synthetic-token'?{active:!revoked,iss:'https://auth.example/',sub:'owner',aud:RESOURCE,exp:Date.now()/1000+60,scope:'wayglass:constellation',ownerAuthorized:true,consentActive:true,consentRef:'consent-1'}:null,
  nativeOrigin:'http://127.0.0.1:'+native.address().port,authorizeNative:async()=>({...grant,revoked}),
  credentialFor:async()=>({authorization:'Bearer '+process.env.ARCSWEEP_RUNTIME_TOKEN}),isStopped:async()=>stopped,sourceSha:'a'.repeat(40)});
 gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 t.after(async()=>{for(const server of [gateway,native]){server.closeAllConnections();await new Promise(r=>server.close(r));}if(original===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;else process.env.ARCSWEEP_RUNTIME_TOKEN=original;if(secret===undefined)delete process.env.HOUSE_SESSION_SECRET;else process.env.HOUSE_SESSION_SECRET=secret;});
 const origin='http://127.0.0.1:'+gateway.address().port;
 const call=async(name,args={})=>fetch(origin+'/mcp',{method:'POST',headers:{authorization:'Bearer synthetic-token','content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
 assert.equal((await fetch(origin+'/readyz')).status,503,'local adapters do not verify cloud readiness');
 const routes=await (await call('wayglass_routes')).json();assert.deepEqual(JSON.parse(routes.result.content[0].text).map(r=>r.route_id),['local:ollama']);
 const result=await (await call('wayglass_respond',{route_id:'local:ollama',input:'synthetic integration test'})).json();
 const turn=JSON.parse(result.result.content[0].text);assert.equal(turn.output,'captured integrated response');assert.equal(turn.kernel_preflight.status,'ready-for-route');assert.equal(turn.mcp_invocation.subject,'owner');assert.equal(turn.receipt.canon_commit,false);assert.equal(calls,1);
 const forged=await (await call('wayglass_respond',{route_id:'local:ollama',input:'hello',participant_id:'bluebird'})).json();assert.equal(forged.error.code,-32602);assert.equal(calls,1);
 revoked=true;assert.equal((await call('wayglass_routes')).status,401);assert.equal(calls,1);
 revoked=false;stopped=true;assert.equal((await call('wayglass_routes')).status,503);assert.equal(calls,1);
 assert.equal((await fetch(origin+'/healthz')).status,200);
});
