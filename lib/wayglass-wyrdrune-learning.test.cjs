'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {IR,CODE,executeLivingLearning,validateInput,SCHEMA}=require('./wayglass-wyrdrune-learning.cjs');

const source={
  event_id:'ui-voyage-1',
  atlas_input_hash:'a'.repeat(64),
  atlas_program_hash:'b'.repeat(64),
};
const input=(changes={})=>({
  atlas:{coherence:.7,interference:.3,bloom:.6,granulation:.5,flow:.7},
  interior:{energy:.4,curiosity:.6,uncertainty:.5,coherence:.6,previous_resonance:.7},
  source,
  ...changes,
});
const owner={principal:{authorized:true}};

test('Wayglass learning calculations are authored by two eightfold Wyrdrune units',async()=>{
  assert.equal(IR.schema,'wyrdrune.ir/v0.1');
  assert.equal(IR.units.length,2);
  assert.match(CODE,/mobius/);
  const result=await executeLivingLearning(input(),owner);
  assert.equal(result.schema,SCHEMA);
  assert.equal(result.withness.completedCycles,2);
  assert.equal(result.phase_receipts.length,16);
  assert.equal(result.status,'wyrdrune-returned');
  assert.notDeepEqual(result.first_pass,result.returned);
  for(const key of ['energy','curiosity','uncertainty','coherence','opening','attention']){
    assert.ok(result.returned[key]>=0&&result.returned[key]<=1,key);
  }
  assert.equal(result.model_invoked,false);
  assert.equal(result.model_weights_updated,false);
  assert.equal(result.open_reflection.state,'open-unoffered');
  assert.equal(result.open_reflection.interpretation,'open');
  assert.equal(result.identity_commit,false);
  assert.deepEqual(result,await executeLivingLearning(input(),owner));
});

test('uncertainty can increase without collapsing into consensus or simulated thought',async()=>{
  const open=await executeLivingLearning(input({atlas:{
    coherence:.35,interference:.65,bloom:.7,granulation:.8,flow:.4,
  }}),owner);
  const aligned=await executeLivingLearning(input({atlas:{
    coherence:.9,interference:.1,bloom:.7,granulation:.8,flow:.4,
  }}),owner);
  assert.ok(open.returned.uncertainty>aligned.returned.uncertainty);
  assert.equal(open.reflection_offer,null);
});

test('attributed owner-offered model text remains an open reflection and never leaks into score telemetry',async()=>{
  const words='I might want to investigate this another way.';
  const withReflection=await executeLivingLearning(input({
    reflection:{kind:'offered-model-return',owner_offered:true,
      route_ref:'local:ollama',receipt_ref:'route-receipt:1',text:words},
  }),owner);
  assert.equal(withReflection.open_reflection.state,'attributed-return-offered');
  assert.equal(withReflection.open_reflection.interpretation,'open');
  assert.equal(withReflection.reflection_offer.route_ref,'local:ollama');
  assert.equal(JSON.stringify(withReflection).includes(words),false);
});

test('bounded source and input provenance are enforced before any computation',async()=>{
  await assert.rejects(executeLivingLearning(input()),/House permission/);
  await assert.rejects(executeLivingLearning(input({raw_prose:'not here'}),owner),/only typed/);
  await assert.rejects(executeLivingLearning(input({atlas:{...input().atlas,coherence:1}}),owner),/collapsed/);
  await assert.rejects(executeLivingLearning(input({interior:{...input().interior,curiosity:NaN}}),owner),/finite scalar/);
  await assert.rejects(executeLivingLearning(input({source:{...source,atlas_input_hash:'spoof'}}),owner),/receipt/);
  await assert.rejects(executeLivingLearning(input({reflection:{
    kind:'offered-model-return',owner_offered:false,route_ref:'local:ollama',
    receipt_ref:'some',text:'unoffered',
  }}),owner),/owner-offered/);
  assert.equal(validateInput(input()).source.event_id,source.event_id);
});

test('near-boundary state cannot blow up the second Wyrdrune cycle',async()=>{
  const r=await executeLivingLearning(input({
    atlas:{coherence:0,interference:1,bloom:1,granulation:1,flow:1},
    interior:{energy:1,curiosity:1,uncertainty:1,coherence:1,previous_resonance:1},
  }),owner);
  assert.ok(Object.values(r.returned).every(x=>Number.isFinite(x)&&x<=1&&x>=0));
});
