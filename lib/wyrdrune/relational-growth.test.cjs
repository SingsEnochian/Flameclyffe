'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CODE,IR,SCHEMA,proposeRelationalGrowth}=require('../wayglass-wyrdrune-relations.cjs');
const {compile}=require('./wyrdrune.cjs');
const owner={principal:{id:'owner:rowan',authorized:true}};
const input=(patch={})=>({
  parent_ids:['glyph:void','glyph:withness'],
  relation:'conjunction',
  field:{novelty:0.8,coherence:0.6,recurrence:0.3,uncertainty:0.7},
  source:{event_id:'rune-sketch-20261112',source_hash:'a'.repeat(64)},
  ...patch,
});
test('relational growth is compiled and executed by native scoped Wyrdrune',async()=>{
  assert.equal(IR.schema,'wyrdrune.ir/v0.1');
  assert.equal(IR.units.length,1);
  assert.equal(IR.units[0].scope,'carried');
  assert.equal(compile(CODE).sourceHash,IR.sourceHash);
  const result=await proposeRelationalGrowth(input(),owner);
  assert.equal(result.schema,SCHEMA);
  assert.equal(result.status,'candidate-returned');
  assert.equal(result.phase_receipts.length,8);
  assert.equal(result.checkpoints.length,1);
  assert.equal(result.candidate.status,'proposed');
  assert.equal(result.candidate.meaning_status,'author-defined-or-unresolved');
  assert.deepEqual(result.candidate.parent_ids,['glyph:void','glyph:withness']);
  assert.equal(result.return_marker.status,'candidate-only');
  assert.equal(result.canon_commit,false);
  assert.equal(result.world_created,false);
  assert.equal(result.persisted,false);
  assert.equal(result.model_invoked,false);
  assert.equal(result.model_weights_updated,false);
});
test('return and re-entry carry genuine changed state, with deterministic replay',async()=>{
  const first=await proposeRelationalGrowth(input(),owner);
  const second=await proposeRelationalGrowth(input(),{...owner,seeds:first.carry});
  assert.notDeepEqual(second.carry,first.carry);
  assert.deepEqual(first,await proposeRelationalGrowth(input(),owner));
  assert.deepEqual(second,await proposeRelationalGrowth(input(),{...owner,seeds:first.carry}));
  for(const v of Object.values(second.carry))assert.ok(v>=0&&v<=1);
  const other=await proposeRelationalGrowth(input({field:{
    novelty:0.1,coherence:0.9,recurrence:0.8,uncertainty:0.1,
  }}),owner);
  assert.notDeepEqual(first.carry,other.carry);
});
test('a rune or a coordinate can independently address a world, without assuming equivalence',async()=>{
  const rune=await proposeRelationalGrowth(input({
    world_address:{kind:'rune',value:'world:terra-aeterna'},
  }),owner);
  const coords=await proposeRelationalGrowth(input({
    world_address:{kind:'coordinates',universe:'wayglass',x:0,y:1,z:2,t:3},
  }),owner);
  assert.equal(rune.candidate.world_address.kind,'rune');
  assert.equal(coords.candidate.world_address.kind,'coordinates');
  assert.equal(rune.candidate.world_created,false);
  assert.equal(coords.candidate.world_created,false);
});
test('offered model contribution remains attributed, never invented or promoted',async()=>{
  const words='Perhaps the two glyphs form a third relation.';
  const result=await proposeRelationalGrowth(input({model_offer:{
    kind:'attributed-model-proposal',owner_offered:true,
    route_ref:'local:amber',receipt_ref:'model:receipt-001',text:words,
  }}),owner);
  assert.equal(result.candidate.model_offer.route_ref,'local:amber');
  assert.equal(result.candidate.model_offer.receipt_ref,'model:receipt-001');
  assert.equal(JSON.stringify(result).includes(words),false);
  assert.equal(result.candidate.canon_adopted,false);
});
test('rejects fabricated parent identity, missing provenance, unoffered models and malformed seeds',async()=>{
  await assert.rejects(proposeRelationalGrowth(input()),/authenticated House/);
  await assert.rejects(proposeRelationalGrowth(input({parent_ids:['same','same']}),owner),/distinct/);
  await assert.rejects(proposeRelationalGrowth(input({source:{event_id:'rune-1',source_hash:'fake'}}),owner),/source hash/);
  await assert.rejects(proposeRelationalGrowth(input({field:{...input().field,novelty:NaN}}),owner),/finite/);
  await assert.rejects(proposeRelationalGrowth(input({world_address:{kind:'coordinates',universe:'wayglass',x:0,y:0,z:0}}),owner),/world coordinate t must be finite/);
  await assert.rejects(proposeRelationalGrowth(input({model_offer:{
    kind:'attributed-model-proposal',owner_offered:false,
    route_ref:'local:amber',receipt_ref:'model:1',text:'unoffered',
  }}),owner),/explicitly offered/);
  await assert.rejects(proposeRelationalGrowth(input(),{...owner,seeds:{resonance:0.5}}),/exactly/);
});
test('Feather aborts execution without returning a proposal',async()=>{
  const stop=new AbortController();stop.abort();
  await assert.rejects(proposeRelationalGrowth(input(),{...owner,signal:stop.signal}),/Feather/);
});
