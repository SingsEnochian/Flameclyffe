'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {proposeHybrid}=require('../wayglass-mythience-fusion.cjs');
const principal={id:'dev:mythience',authorized:true};
const request=()=>({
  traveller_id:'traveller:visitor',destination_universe:'universe:aurora',
  first:{id:'ability:starlight',origin_universe:'universe:verdant',modality:'magic',expression:0.8},
  second:{id:'ability:prism',origin_universe:'universe:deepwater',modality:'technology',expression:0.75},
  field:{intention:0.9,shifting:0.9,resonance:0.9,compatibility:0.9},
  consent:{traveller:true,first:true,second:true,destination:true},event_id:'encounter:fusion001',
});
test('two distinct provenance-bearing powers can yield a third Wyrdrune candidate',async()=>{
  const r=await proposeHybrid(request(),{principal});
  assert.equal(r.status,'candidate-returned');
  assert.equal(r.phase_receipts.length,8);
  assert.equal(r.candidate.parents.length,2);
  assert.equal(r.candidate.parents[0].origin_universe,'universe:verdant');
  assert.equal(r.candidate.parents[1].origin_universe,'universe:deepwater');
  assert.ok(r.candidate.synergy>0);
  assert.equal(r.candidate.canon_commit,false);
  assert.equal(r.physical_crossing,false);
  assert.equal(r.persisted,false);
});
test('each parent, traveller and destination can refuse hybridisation',async()=>{
  for(const who of ['traveller','first','second','destination']){
    const q=request();q.consent[who]=false;
    const r=await proposeHybrid(q,{principal});
    assert.equal(r.status,'denied');assert.equal(r.candidate,null);
  }
});
test('fusion is deterministic, reversible and cannot invent a parent',async()=>{
  assert.deepEqual(await proposeHybrid(request(),{principal}),await proposeHybrid(request(),{principal}));
  const q=request();q.second=q.first;
  await assert.rejects(proposeHybrid(q,{principal}),/distinct parent/);
  await assert.rejects(proposeHybrid(request(),{}),/Authenticated House/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(proposeHybrid(request(),{principal,signal:controller.signal}),/Feather/);
});
