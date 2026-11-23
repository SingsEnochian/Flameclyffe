'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const wtl=require('./wyrdrune.cjs');
const crossing=()=>import('./world-crossing.mjs');
async function prepared(text='::scene The Green Lantern\n::embody light make a real amber-coloured lantern illuminate the room'){
 const {fictionToWtl,verifyFictionExecution}=await import('./fiction-mobius.mjs');
 const p=fictionToWtl(text,{compile:wtl.compile});
 const r=await wtl.execute(p.ir,{bridges:{},principal:{authorized:false}});
 return {p,r,receipt:verifyFictionExecution(p,r)};
}
test('authored fiction compiles to native WTL and proposes possible Waking World embodiment',async()=>{
 const {p,r,receipt}=await prepared();
 const {planPhysicalEmbodiment}=await crossing();
 assert.equal(r.status,'committed');
 assert.equal(r.withness.completedCycles,2);
 assert.equal(p.fiction.nodes[1].kind,'embodiment');
 assert.equal(receipt.events[1].classification,'embodiment');
 const plan=planPhysicalEmbodiment(receipt);
 assert.equal(plan.status,'proposed');
 assert.equal(plan.items.length,1);
 assert.equal(plan.items[0].medium,'light');
 assert.match(plan.items[0].intention,/real amber-coloured lantern/);
 assert.equal(plan.items[0].target_realm,'waking-world');
 assert.equal(plan.actor_authenticated,false);
 assert.equal(plan.physical_outputs,0);
});
test('unbounded mediums may be authored but not executed absent host capability',async()=>{
 const {receipt}=await prepared('::embody my-own-new-medium a future invented interface');
 const {planPhysicalEmbodiment,createWorldCrossingHost}=await crossing();
 assert.equal(planPhysicalEmbodiment(receipt).items[0].medium,'my-own-new-medium');
 let called=0;
 const host=createWorldCrossingHost({authenticate:()=>{called++;},reserve:()=>{called++;},adapters:new Map()});
 const event_id=planPhysicalEmbodiment(receipt).items[0].event_id;
 await assert.rejects(()=>host.embody(receipt,{event_id}),/explicit owner consent/);
 const no=await host.embody(receipt,{event_id,explicit_consent:true});
 assert.equal(no.status,'capability-unavailable');
 assert.equal(no.dispatched,false);assert.equal(called,0);
});
test('only authenticated host binding plus at-most-once reservation can dispatch real hardware',async()=>{
 const {receipt}=await prepared(),{planPhysicalEmbodiment,createWorldCrossingHost}=await crossing();
 const item=planPhysicalEmbodiment(receipt).items[0];
 let calls=0,auth=0,reservations=0;
 const grant={permitted:true,event_id:item.event_id,wtl_source_hash:item.wtl_source_hash,
  device_id:'my-lantern',capability:'light',principal_id:'owner-from-host-session'};
 const host=createWorldCrossingHost({
  authenticate:async()=>{auth++;return grant;},
  reserve:async()=>{reservations++;return {reserved:reservations===1,receipt_id:'durable:1'};},
  adapters:new Map([['light',{capability:'light',perform:async()=>{calls++;return {ack:true};}}]]),
  observe:async()=>({verified:true,evidence_id:'sensor:photo-1',source:'trusted-light-sensor'})
 });
 await assert.rejects(()=>host.embody(receipt,{event_id:item.event_id,device_id:'my-lantern'}),/consent/);
 assert.deepEqual([auth,reservations,calls],[0,0,0]);
 const result=await host.embody(receipt,{event_id:item.event_id,device_id:'my-lantern',explicit_consent:true});
 assert.equal(result.status,'physically-observed');assert.equal(result.physically_verified,true);
 assert.equal(result.evidence.source,'trusted-light-sensor');
 assert.deepEqual([auth,reservations,calls],[1,1,1]);
 await assert.rejects(()=>host.embody(receipt,{event_id:item.event_id,device_id:'my-lantern',explicit_consent:true}),/reservation denied/);
 assert.equal(calls,1);
});
test('a device acknowledgement is not physical proof, even when dispatch is possible',async()=>{
 const {receipt}=await prepared(),{planPhysicalEmbodiment,createWorldCrossingHost}=await crossing();
 const item=planPhysicalEmbodiment(receipt).items[0];
 const host=createWorldCrossingHost({
  authenticate:()=>({permitted:true,event_id:item.event_id,wtl_source_hash:item.wtl_source_hash,
   device_id:'lamp',capability:'light',principal_id:'host-owner'}),
  reserve:()=>({reserved:true,receipt_id:'durable:2'}),
  adapters:new Map([['light',{capability:'light',perform:()=>({ack:true})}]])
 });
 const r=await host.embody(receipt,{event_id:item.event_id,device_id:'lamp',explicit_consent:true});
 assert.equal(r.status,'device-reported');assert.equal(r.dispatched,true);
 assert.equal(r.physically_verified,false);assert.equal(r.physical_effect,'not-independently-confirmed');
});
test('invalid authority, forged receipt, mismatch and Feather cannot reach device',async()=>{
 const {receipt}=await prepared(),{planPhysicalEmbodiment,createWorldCrossingHost}=await crossing();
 const item=planPhysicalEmbodiment(receipt).items[0];
 let calls=0;
 const host=createWorldCrossingHost({
  authenticate:()=>({permitted:true,event_id:'different',wtl_source_hash:item.wtl_source_hash,
   device_id:'lamp',capability:'light',principal_id:'host-owner'}),
  reserve:()=>({reserved:true,receipt_id:'durable:3'}),
  adapters:new Map([['light',{capability:'light',perform:()=>{calls++;return true;}}]])
 });
 await assert.rejects(()=>host.embody(receipt,{event_id:item.event_id,device_id:'lamp',explicit_consent:true}),/authenticated host/);
 await assert.rejects(()=>host.embody({...receipt,proposed_effects:[]},{event_id:item.event_id,device_id:'lamp',explicit_consent:true}),/Proposal list differs/);
 const ctrl=new AbortController();ctrl.abort();
 await assert.rejects(()=>host.embody(receipt,{event_id:item.event_id,device_id:'lamp',explicit_consent:true,signal:ctrl.signal}),/Feather/);
 assert.equal(calls,0);
});
test('invalid syntax never turns prose into a device command',async()=>{
 const {fictionToWtl}=await import('./fiction-mobius.mjs');
 for(const text of ['::embody $SHELL rm -rf /','::embody light','::embody ../exec command']){
  assert.throws(()=>fictionToWtl(text,{compile:wtl.compile}),/Unsupported fiction directive/);
 }
});
