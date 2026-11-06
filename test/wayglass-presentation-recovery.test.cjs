'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createPresentationStore } = require('../lib/wayglass-presentation-store.cjs');
const { createPresentationDelivery } = require('../lib/wayglass-presentation-delivery.cjs');
const { makeWayglassPresentationIngress } = require('../lib/wayglass-mcp-presentation.cjs');
const payload = { presentation_id: 'recovery-1', source_ref: 'github:PR-563', intent: 'review',
  phases: ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'].map((name,i)=>({index:i+1,name})) };
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'wayglass-receipts-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const store = createPresentationStore({directory});
  const queue = [];
  const principal = {active:true,ownerAuthorized:true,subject:'owner',grantId:'grant-1',scopes:['wayglass:present'],verifyCurrentGrant:async()=>true};
  const present = makeWayglassPresentationIngress({store,reviewBridge:async r=>queue.push(r)});
  return { directory,store,queue,principal,present };
}
test('cold return reloads exact receipt and rechecks current grant before delivery',async t=>{
  const f=await fixture(t); const receipt=await f.present({principal:f.principal,payload});
  const cold=createPresentationStore({directory:f.directory}); const events=[];
  const delivery=createPresentationDelivery({resource: 'https://wayglass.example/mcp',store:cold,authorize:async req=>{events.push(req);return true;},deliver:async req=>events.push(req)});
  const result=await delivery(f.queue[0]);
  assert.equal(events[0].action,'deliver'); assert.equal(events[0].grantId,'grant-1');
  assert.deepEqual(events[1].payload,payload); assert.equal(result.receipt_id,receipt.receipt_id);assert.equal(result.wayglass_reply,null);
  const duplicate=await f.present({principal:f.principal,payload});assert.equal(duplicate.duplicate,true);assert.equal(f.queue.length,1);
});
test('revoked, unknown and unavailable authorization never dispatch retained receipts',async t=>{
  const f=await fixture(t);await f.present({principal:f.principal,payload});
  for(const authorize of [async()=>false,async()=>undefined,async()=>{throw new Error('offline');}]) {
    let calls=0;const delivery=createPresentationDelivery({resource: 'https://wayglass.example/mcp',store:f.store,authorize,deliver:async()=>calls++});
    await assert.rejects(delivery(f.queue[0]));assert.equal(calls,0);
  }
  assert.equal((await f.store.get(f.queue[0].key)).status,'queued_for_review');
});
test('concurrent submissions publish one complete immutable receipt',async t=>{
  const f=await fixture(t);const results=await Promise.all(Array.from({length:16},()=>f.present({principal:f.principal,payload})));
  assert.equal(new Set(results.map(r=>r.receipt_id)).size,1); assert.equal(f.queue.length,1);
  assert.equal(results.filter(r=>!r.duplicate).length,1);
  assert.deepEqual((await fs.readdir(f.directory)),[f.queue[0].key+'.json']);
});
test('tampering, wrong receipt and altered source fail before authorization',async t=>{
 const f=await fixture(t);await f.present({principal:f.principal,payload});const original=await f.store.get(f.queue[0].key);
 for(const record of [{...original,digest:'bad'},{...original,principal_id:'other'},{...original,source_ref:'other'}]) {
   let calls=0;const delivery=createPresentationDelivery({resource: 'https://wayglass.example/mcp',store:{get:async()=>record},authorize:async()=>{calls++;return true;},deliver:async()=>calls++});
   await assert.rejects(delivery(f.queue[0]));assert.equal(calls,0);
 }
 const delivery=createPresentationDelivery({resource: 'https://wayglass.example/mcp',store:f.store,authorize:async()=>true,deliver:async()=>{throw new Error('down');}});
 await assert.rejects(delivery({...f.queue[0],receipt_id:'wrong'}));await assert.rejects(delivery(f.queue[0]),/down/);
 assert.deepEqual(await f.store.get(f.queue[0].key),original);
});
test('private store rejects traversal, relative directories and conflicting record keys',async t=>{
 const f=await fixture(t);assert.throws(()=>createPresentationStore({directory:'relative'}));
 await assert.rejects(f.store.get('../escape'));await assert.rejects(f.store.putIfAbsent('a'.repeat(64),{key:'b'.repeat(64)}));
});
