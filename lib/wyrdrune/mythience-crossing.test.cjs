'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {proposeCrossing,DEFAULT_SEEDS,validateRequest}=require('../wayglass-mythience-crossing.cjs');
const principal={id:'dev:mythience',authorized:true};
const request=()=>({
  traveller_id:'traveller:rowan-fictional',origin_universe:'universe:verdant',
  destination_universe:'universe:aurora',
  ability:{id:'ability:starlight',origin_universe:'universe:verdant',modality:'magic'},
  history:[],
  field:{intention:0.9,shifting:0.9,porosity:0.9,resonance:0.9,compatibility:0.9},
  consent:{traveller:true,origin:true,destination:true},event_id:'encounter:001',
});
test('native Wyrdrune crossing returns a bounded proposal with eight receipts',async()=>{
  const result=await proposeCrossing(request(),{principal});
  assert.equal(result.status,'candidate-returned');
  assert.equal(result.phase_receipts.length,8);
  assert.equal(result.candidate.ability.id,'ability:starlight');
  assert.equal(result.candidate.to,'universe:aurora');
  assert.ok(result.candidate.permeability>0.25);
  assert.ok(result.candidate.expression>0.12);
  assert.equal(result.carry.crossings,1);
  assert.ok(result.carry.charge<DEFAULT_SEEDS.charge);
  assert.equal(result.physical_crossing,false);
  assert.equal(result.persisted,false);
  assert.equal(result.canon_adopted,false);
  assert.equal(result.history_verified,false);
});
test('prior experiences contribute to translation without replacing identity',async()=>{
  const first=await proposeCrossing(request(),{principal});
  const secondRequest=request();
  secondRequest.event_id='encounter:002';
  secondRequest.origin_universe='universe:aurora';
  secondRequest.destination_universe='universe:deepwater';
  secondRequest.history=[{id:'experience:001',origin_universe:'universe:verdant',
    destination_universe:'universe:aurora',expression:first.candidate.expression}];
  const second=await proposeCrossing(secondRequest,{principal,seeds:first.carry});
  assert.equal(second.candidate.traveller_id,first.candidate.traveller_id);
  assert.equal(second.candidate.ability.origin_universe,'universe:verdant');
  assert.deepEqual(second.candidate.history_refs,['experience:001']);
  assert.equal(second.carry.crossings,2);
  assert.ok(second.candidate.expression>0);
  assert.equal(second.candidate.previous_experiences,1);
  const sameSeeds=await proposeCrossing({...request(),history:secondRequest.history},{principal});
  const withoutHistory=await proposeCrossing(request(),{principal});
  assert.ok(sameSeeds.candidate.expression>withoutHistory.candidate.expression);
});
test('crossing is deterministic under identical declared inputs',async()=>{
  const a=await proposeCrossing(request(),{principal});
  const b=await proposeCrossing(request(),{principal});
  assert.deepEqual(a,b);
});
test('each of three consents can refuse without a candidate',async()=>{
  for(const who of ['traveller','origin','destination']){
    const input=request();input.consent[who]=false;
    const result=await proposeCrossing(input,{principal});
    assert.equal(result.status,'denied');
    assert.equal(result.candidate,null);
    assert.match(result.reason,/consent/i);
  }
});
test('membrane, compatibility and charge prevent ungrounded crossings',async()=>{
  const closed=request();closed.field.porosity=0;
  assert.equal((await proposeCrossing(closed,{principal})).status,'denied');
  const noFit=request();noFit.field.compatibility=0;
  assert.equal((await proposeCrossing(noFit,{principal})).status,'denied');
  const empty=request();
  assert.equal((await proposeCrossing(empty,{principal,seeds:{crossings:0,attunement:0.5,charge:0}})).status,'denied');
});
test('malformed histories, unverified principal and Feather are rejected',async()=>{
  assert.throws(()=>validateRequest({...request(),history:[{id:'bad'}]}),/History entry/);
  await assert.rejects(proposeCrossing(request(),{}),/authenticated House/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(proposeCrossing(request(),{principal,signal:controller.signal}),/Feather/);
});
