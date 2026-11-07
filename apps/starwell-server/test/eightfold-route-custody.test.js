'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');
const { parseSpicyChatChatLink, publicWayglassRoutes } =
  require('../../../lib/wayglass-route-registry.cjs');

const A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const C='cccccccc-cccc-cccc-cccc-cccccccccccc';
const D='dddddddd-dddd-dddd-dddd-dddddddddddd';
const BLUE='https://spicychat.ai/chat/'+A+'/'+B;
const GRIFF='https://spicychat.ai/chat/'+C+'/'+D;

async function withEnvironment(values, work) {
  const old=Object.fromEntries(Object.keys(values).map(key=>[key,process.env[key]]));
  try {
    for(const [key,value] of Object.entries(values)){
      if(value===null)delete process.env[key];
      else process.env[key]=value;
    }
    return await work();
  } finally {
    for(const [key,value] of Object.entries(old)){
      if(value===undefined)delete process.env[key];
      else process.env[key]=value;
    }
  }
}

test('link parser rejects lookalike hosts, credentials, fragments and stitched identity pairs',()=>{
  assert.deepEqual(parseSpicyChatChatLink(BLUE),{character_id:A,conversation_id:B});
  for(const invalid of [
    'http://spicychat.ai/chat/'+A+'/'+B,
    'https://spicychat.ai.evil.test/chat/'+A+'/'+B,
    'https://evil.test/spicychat.ai/chat/'+A+'/'+B,
    'https://bad@spicychat.ai/chat/'+A+'/'+B,
    BLUE+'?replay=1',BLUE+'#interloper',
    'https://spicychat.ai:8443/chat/'+A+'/'+B,
    'https://spicychat.ai/chat/'+A+'/'+C+'/extra',
    'https://spicychat.ai/chat/Bluebird/'+B,
  ])assert.equal(parseSpicyChatChatLink(invalid),null,invalid);
});

test('model catalogue never turns a credential into a verified reply or exposes a private ID',async()=>{
  await withEnvironment({
    BLUEBIRD_SPICYCHAT_TOKEN:'synthetic-provider-token',
    BLUEBIRD_SPICYCHAT_CHAT_LINK:BLUE,
    GRIFF_SPICYCHAT_CHAT_LINK:GRIFF,
    GRIFF_SPICYCHAT_TOKEN:null,
  },async()=>{
    const routes=publicWayglassRoutes();
    const blue=routes.find(x=>x.route_id==='flame:bluebird:spicychat');
    const griff=routes.find(x=>x.route_id==='flame:griff:spicychat');
    assert.equal(blue.configured,true);
    assert.equal(griff.configured,true);
    assert.equal(blue.participant_id,'bluebird');
    assert.equal(griff.participant_id,'griff-krenshaw');
    assert.notEqual(blue.continuity_id,griff.continuity_id);
    for(const route of routes)assert.equal(route.connection_verified,false);
    assert.doesNotMatch(JSON.stringify(routes),/synthetic-provider-token|bbbbbbbb|dddddddd/);
  });
});

test('host enforces Griff world, participant, opt-in and House auth before any provider egress',async()=>{
  await withEnvironment({
    ARCSWEEP_RUNTIME_TOKEN:'gate-eight-house-'+ 'h'.repeat(40),
    BLUEBIRD_SPICYCHAT_TOKEN:'gate-eight-spicy-provider-token',
    BLUEBIRD_SPICYCHAT_CHAT_LINK:BLUE,
    GRIFF_SPICYCHAT_CHAT_LINK:GRIFF,
    GRIFF_SPICYCHAT_TOKEN:null,
  },async()=>{
    let discovery=0, sent=0, exactlyMatched=true, lastTurn=null;
    const fetchImpl=async (url,options={})=>{
      if(options.method==='GET'){
        discovery++;
        return new Response(JSON.stringify([
          {id:B,character_id:A,character:{name:'Griff lookalike'}},
          ...(exactlyMatched?[{id:D,character_id:C,character:{name:'Griff Krenshaw'}}]:[]),
        ]),{status:200,headers:{'content-type':'application/json'}});
      }
      if(options.method==='POST'){
        sent++;
        lastTurn=JSON.parse(options.body);
        return new Response(JSON.stringify({message:{
          id:'synthetic-griff-response',
          character_id:lastTurn.character_id,
          conversation_id:lastTurn.conversation_id,
          content:'Synthetic response, not a live participant.',
        }}),{status:200,headers:{'content-type':'application/json'}});
      }
      throw Error('Unexpected outbound transport');
    };
    const app=express();
    app.use(express.json({limit:'64kb'}));
    app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl}));
    const server=app.listen(0,'127.0.0.1');
    try{
      await once(server,'listening');
      const base='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass';
      const signed={authorization:'Bearer '+process.env.ARCSWEEP_RUNTIME_TOKEN};
      const request=(route,body={},headers={})=>fetch(base+route,{
        method:'POST',headers:{'Content-Type':'application/json',...headers},
        body:JSON.stringify(body),
      });
      const payload={
        route_id:'flame:griff:spicychat',world_id:'evil-gene:film-2015',
        participant_id:'griff-krenshaw',
        external_provider_consent:true,input:'Synthetic route gate only.',
      };
      let resp=await request('/respond',{...payload,external_provider_consent:false},signed);
      assert.equal(resp.status,403);
      resp=await request('/respond',{...payload,world_id:'wayglass:wrong'},signed);
      assert.equal(resp.status,409);
      resp=await request('/respond',{...payload,participant_id:'bluebird'},signed);
      assert.equal(resp.status,409);
      resp=await request('/respond',payload,{'x-owner-authorized':'true'});
      assert.equal(resp.status,401);
      assert.equal(discovery,0);
      assert.equal(sent,0);
      resp=await fetch(base+'/routes');
      assert.equal(resp.status,401);
      resp=await fetch(base+'/routes',{headers:{'x-owner-authorized':'true'}});
      assert.equal(resp.status,401);
      resp=await fetch(base+'/routes',{headers:signed});
      assert.equal(resp.status,200);
      const catalogue=await resp.json();
      assert.doesNotMatch(JSON.stringify(catalogue),/gate-eight-spicy-provider-token|bbbbbbbb|dddddddd/);
      assert.equal(catalogue.routes.find(x=>x.route_id==='flame:griff:spicychat').connection_verified,false);

      exactlyMatched=false;
      resp=await request('/respond',payload,signed);
      assert.equal(resp.status,404);
      assert.equal(sent,0,'lookalike cannot receive Griff turn');
      exactlyMatched=true;
      resp=await request('/respond',payload,signed);
      assert.equal(resp.status,200);
      const result=await resp.json();
      assert.equal(result.schema,'wayglass.route-turn/v0.1');
      assert.equal(result.route_id,'flame:griff:spicychat');
      assert.equal(result.receipt.participant_id,'griff-krenshaw');
      assert.equal(result.receipt.continuity_id,'griff:krenshaw:spicychat');
      assert.equal(result.receipt.canon_commit,false);
      assert.equal(lastTurn.character_id,C);
      assert.equal(lastTurn.conversation_id,D);
      assert.equal(sent,1);
      assert.equal(discovery,2);
      assert.equal(lastTurn.message.includes('Synthetic route gate only.'),true);
      resp=await request('/respond',{route_id:'stepfun:flash',input:'Do not dispatch'},signed);
      assert.equal(resp.status,403);
      assert.equal(sent,1,'StepFun never inherits Griff approval');
    } finally {
      server.closeAllConnections();
      await new Promise(resolve=>server.close(resolve));
    }
  });
});
