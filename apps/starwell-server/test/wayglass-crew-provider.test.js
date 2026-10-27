'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');

const pins = {
  bluebird: ['11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  vethrlauf: ['22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
  griff: ['33333333-3333-4333-8333-333333333333','cccccccc-cccc-4ccc-8ccc-cccccccccccc'],
};
const NAMES = ['SPICYCHAT_ACCOUNT_TOKEN','BLUEBIRD_SPICYCHAT_TOKEN','GRIFF_SPICYCHAT_TOKEN','VETHRLAUF_SPICYCHAT_TOKEN',
  'BLUEBIRD_SPICYCHAT_CHAT_LINK','VETHRLAUF_SPICYCHAT_CHAT_LINK','GRIFF_SPICYCHAT_CHAT_LINK',
  'ARCSWEEP_RUNTIME_TOKEN','HOUSE_SESSION_SECRET'];
async function fixture(t, fetchImpl) {
  const old=Object.fromEntries(NAMES.map(k=>[k,process.env[k]]));
  for(const k of NAMES)delete process.env[k];
  process.env.SPICYCHAT_ACCOUNT_TOKEN='synthetic-owner-credential';
  process.env.ARCSWEEP_RUNTIME_TOKEN='synthetic-steward';
  for(const name of Object.keys(pins)) {
    const key = name.toUpperCase() + '_SPICYCHAT_CHAT_LINK';
    process.env[key]='https://spicychat.ai/chat/'+pins[name].join('/');
  }
  t.after(()=>{for(const k of NAMES){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}});
  const app=express();app.use(express.json());
  app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl}));
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return 'http://127.0.0.1:'+server.address().port+'/api/v1/wayglass';
}
const auth={authorization:'Bearer synthetic-steward'};

test('three named Crew preflights only GET their exact matching pinned conversations',async t=>{
  const methods=[];
  const host=await fixture(t,async(_url,options)=>{
    methods.push(options.method);
    assert.equal(options.headers.authorization,'Bearer synthetic-owner-credential');
    return {ok:true,async json(){return Object.values(pins).map(([character_id,id])=>({id,character_id}));}};
  });
  for(const who of Object.keys(pins)){
    assert.equal((await fetch(host+'/crew/'+who+'/status')).status,401);
    const res=await fetch(host+'/crew/'+who+'/status',{headers:auth});
    assert.equal(res.status,200,who);
    const body=await res.json();
    assert.equal(body.preflight_verified,true);
    assert.equal(body.live_turn_verified,false);
    assert.equal(body.route_id,'flame:'+(who==='griff'?'griff':who)+':spicychat');
  }
  assert.deepEqual(methods,['GET','GET','GET']);
});
test('Vethrlauf route refuses foreign world, foreign participant and unconsented calls BEFORE provider transport',async t=>{
  const calls=[];
  const host=await fixture(t,async(...args)=>{calls.push(args);throw Error('no upstream access');});
  const payload={route_id:'flame:vethrlauf:spicychat',world_id:'vethrlauf:spicychat',
    participant_id:'vethrlauf',input:'Synthetic sample',external_provider_consent:true};
  const send=body=>fetch(host+'/respond',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({...payload,...body})});
  assert.equal((await send({world_id:'evil-gene:film-2015'})).status,409);
  assert.equal((await send({participant_id:'bluebird'})).status,409);
  assert.equal((await send({external_provider_consent:false})).status,403);
  assert.deepEqual(calls,[]);
});
test('Vethrlauf authenticated fixture reply carries the original pinned room and participant',async t=>{
  const methods=[];
  const host=await fixture(t,async(_url,options)=>{
    methods.push(options.method);
    if(options.method==='GET')return {ok:true,async json(){return Object.values(pins).map(([character_id,id])=>({id,character_id}));}};
    const body=JSON.parse(options.body);
    assert.equal(body.character_id,pins.vethrlauf[0]);assert.equal(body.conversation_id,pins.vethrlauf[1]);
    return {ok:true,async json(){return {message:{content:'Vethrlauf fixture response',character_id:pins.vethrlauf[0],
      conversation_id:pins.vethrlauf[1]}};}};
  });
  const res=await fetch(host+'/respond',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({route_id:'flame:vethrlauf:spicychat',world_id:'vethrlauf:spicychat',
    participant_id:'vethrlauf',input:'Synthetic sample',external_provider_consent:true})});
  assert.equal(res.status,200);const body=await res.json();
  assert.equal(body.participant_id,'vethrlauf');
  assert.equal(body.output,'Vethrlauf fixture response');
  assert.equal(body.receipt.provider_conversation_id,pins.vethrlauf[1]);
  assert.deepEqual(methods,['GET','POST']);
});
