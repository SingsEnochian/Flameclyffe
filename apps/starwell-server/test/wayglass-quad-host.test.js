'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

test('Quad reads authorized source metadata and rejects forged House callers',async()=>{
  const keys=['ARCSWEEP_RUNTIME_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','HOUSE_SESSION_SECRET'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const token='wayglass-quad-integration-'+'c'.repeat(48);
  process.env.ARCSWEEP_RUNTIME_TOKEN=token;
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
  delete process.env.HOUSE_SESSION_SECRET;
  const queries=[];
  const fetchImpl=async(url,options)=>{
    const parsed=new URL(url),table=parsed.pathname.split('/').at(-1);
    queries.push({table,url,headers:options.headers});
    assert.equal(parsed.hostname,'example.supabase.co');
    assert.match(parsed.search,/select=/);
    assert.match(parsed.search,/limit=1/);
    const count=table==='deep_observer_events'?14:table==='wayglass_route_receipts'?1:0;
    const ts=table==='deep_observer_events'?'occurred_at':'created_at';
    const rows=count?[{[ts]:'2026-11-06T23:00:00.000Z'}]:[];
    return new Response(JSON.stringify(rows),{status:200,headers:{
      'Content-Type':'application/json','content-range':count?'0-0/'+count:'*/0'}});
  };
  const app=express();
  app.use(express.json());
  app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl}));
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');
    const url='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass/quad/run';
    const post=(body,headers={})=>fetch(url,{method:'POST',headers:{
      'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    const refused=await post({cycles:2});
    assert.equal(refused.status,401);
    const spoofed=await post({cycles:2},{'x-owner-authorized':'true','x-forwarded-user':'steward'});
    assert.equal(spoofed.status,401);
    assert.equal(queries.length,0);
    const credentials={Authorization:'Bearer '+token};
    const response=await post({cycles:2,continuity:{
      participant_ref:'wayglass',world_ref:'wayglass:universe',
      unresolved_wonder_questions:['What if?'],revoked_refs:[]}},credentials);
    assert.equal(response.status,200);
    const payload=await response.json();
    assert.equal(payload.schema,'wayglass.quad-host-response/v1');
    assert.equal(payload.checkpoint.entries.length,64);
    assert.equal(payload.checkpoint.gestalt.evidence.length,6);
    assert.equal(payload.checkpoint.gestalt.evidence.find(x=>x.id==='deep_observer_events').count,14);
    assert.equal(payload.checkpoint.gestalt.gaps.length,4);
    assert.equal(payload.checkpoint.gestalt.autoplays_audio,false);
    assert.equal(payload.checkpoint.gestalt.writes_canon,false);
    assert.equal(queries.length,6);
    assert.doesNotMatch(JSON.stringify(payload),/test-service-key/);
    const feather=await post({feather:true},credentials);
    assert.equal(feather.status,409);
    const corrupt=await post({previous:{schema:'wayglass.quad-checkpoint/v1',hash:'bad'}},credentials);
    assert.equal(corrupt.status,409);
  }finally{
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    for(const [key,value] of Object.entries(old))
      if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
