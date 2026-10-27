'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

async function fixture(t,options={}){
  const requests=[];
  const app=express();app.use(express.json());
  const transport=async(url,args)=>{
    requests.push({url,options:args});
    return {ok:true,status:200,async json(){
      return {model:'synthetic-ollama',message:{content:'Fixture response: no inherited context'},eval_count:5};
    }};
  };
  app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl:transport,...options}));
  const server=await new Promise(resolve=>{
    const s=app.listen(0,'127.0.0.1',()=>resolve(s));
  });
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass/respond';
  const send=payload=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({route_id:'local:ollama',world_id:'wayglass:writing-room',
      input:'Can you reply to this fixture turn?',history:[],...payload})});
  return {send,requests};
}
test('ordinary world-scoped Writing Room route proceeds without unavailable inheritance adapters',async t=>{
  const {send,requests}=await fixture(t);
  const response=await send({});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.provider,'ollama');
  assert.equal(body.output,'Fixture response: no inherited context');
  assert.equal(body.receipt.inheritance_context_status,'not-applied');
  assert.equal(requests.length,1);
  const upstream=JSON.parse(requests[0].options.body);
  assert.equal(upstream.messages.some(m=>/inheritance dossier/.test(m.content)),false);
});
test('an explicit checkpoint refuses a turn without authoritatively configured inheritance adapter',async t=>{
  const {send,requests}=await fixture(t);
  const response=await send({checkpoint_storage_id:'invented-checkpoint',
    checkpoint_world_id:'wayglass:writing-room',checkpoint_participant_id:'synthetic'});
  assert.ok(response.status>=400);
  assert.equal(requests.length,0,'missing checkpoint must never yield a provider call');
});
test('misconfigured host adapter is not silently ignored',async t=>{
  const {send,requests}=await fixture(t,{inheritanceContext:{notResolve:true}});
  const response=await send({});
  assert.equal(response.status,503);
  const body=await response.json();
  assert.match(body.error,/adapter is invalid/);
  assert.equal(requests.length,0);
});
test('present host resolver explicitly controls inherited dossier, no fabricated source',async t=>{
  let resolverCalls=0;
  const {send,requests}=await fixture(t,{inheritanceContext:{
    async resolve(_req,payload){
      resolverCalls++;
      assert.equal(payload.world_id,'wayglass:writing-room');
      return {reference:'synthetic-resolver-receipt',dossier:{kind:'fictional-fixture',verified:false}};
    },
  }});
  const response=await send({});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.receipt.inheritance_context_status,'host-resolved');
  assert.equal(body.receipt.inheritance_context,'synthetic-resolver-receipt');
  assert.equal(resolverCalls,1);
  assert.equal(requests.length,1);
});
