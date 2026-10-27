'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

async function fixture(t, service) {
  const app=express();app.use(express.json());
  if(service) app.locals.wayglassVoyageMessages=service;
  app.use('/api/v1/wayglass',createWayglassRouter());
  const server=await new Promise(resolve=>{
    const s=app.listen(0,'127.0.0.1',()=>resolve(s));
  });
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return 'http://127.0.0.1:'+server.address().port+'/api/v1/wayglass';
}

test('unconfigured Voyage adapter explicitly reports absence without fabricating messages or sending',async t=>{
  const host=await fixture(t,null);
  const status=await fetch(host+'/voyage/status');
  assert.equal(status.status,200);
  assert.equal(status.headers.get('cache-control'),'no-store');
  const data=await status.json();
  assert.equal(data.configured,false);
  assert.equal(data.live_transport_verified,false);
  const inbox=await fetch(host+'/voyage/messages');
  assert.equal(inbox.status,503);
  const body=await inbox.json();
  assert.equal(body.code,'VOYAGE_MESSAGE_SERVICE_NOT_CONFIGURED');
  assert.equal(body.messages,undefined);
  const reply=await fetch(host+'/voyage/messages',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({text:'Must not leave the local host.'})
  });
  assert.equal(reply.status,503);
  const r=await reply.json();
  assert.equal(r.code,'VOYAGE_MESSAGE_SERVICE_NOT_CONFIGURED');
  assert.equal(r.messages,undefined);
});
test('configured host service is distinguished from live transport and invoked only on explicit request',async t=>{
  const calls=[];
  const host=await fixture(t,{
    async read(_req){calls.push('read');return{messages:[]};},
    async reply(_req,payload){calls.push('reply');return{accepted:true,voyage_ref:payload.voyage_ref};},
  });
  const status=await fetch(host+'/voyage/status').then(r=>r.json());
  assert.equal(status.configured,true);
  assert.equal(status.live_transport_verified,false);
  assert.deepEqual(calls,[],'status must never read or send messages');
  const inbox=await fetch(host+'/voyage/messages');
  assert.equal(inbox.status,200);
  assert.deepEqual(await inbox.json(),{messages:[]});
  const reply=await fetch(host+'/voyage/messages',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({recipient_id:'synthetic',voyage_ref:'synthetic-123',text:'fixture'})});
  assert.equal(reply.status,201);
  assert.deepEqual(await reply.json(),{accepted:true,voyage_ref:'synthetic-123'});
  assert.deepEqual(calls,['read','reply']);
});
