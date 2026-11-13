'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CODE,IR,SCHEMA,DEFAULT_SEEDS,advanceMote}=require('../wayglass-wyrdrune-motes.cjs');
const {compile}=require('./wyrdrune.cjs');
const owner={principal:{id:'owner:rowan',authorized:true}};
const input=(patch={})=>({
  mote_id:'wayglass:mote:001',identity_spin:0.73,
  signals:{wonder:0.8,possibility:0.7,neighbour_resonance:0.4,novelty:0.6,time_step:0.5},
  source:{event_id:'observer:turn-001',source_hash:'a'.repeat(64)},...patch,
});
test('ascending turn is a native scoped Wyrdrune eightfold cycle',async()=>{
  assert.equal(IR.schema,'wyrdrune.ir/v0.1');
  assert.equal(IR.units.length,1);
  assert.equal(IR.units[0].scope,'carried');
  assert.equal(compile(CODE).sourceHash,IR.sourceHash);
  const r=await advanceMote(input(),owner);
  assert.equal(r.schema,SCHEMA);
  assert.equal(r.status,'candidate-returned');
  assert.equal(r.phase_receipts.length,8);
  assert.equal(r.checkpoints.length,1);
  assert.equal(r.candidate.mote_id,'wayglass:mote:001');
  assert.equal(r.candidate.identity_spin,0.73);
  assert.deepEqual(r.candidate.state,r.carry);
  assert.ok(r.carry.phase>DEFAULT_SEEDS.phase);
  assert.ok(r.carry.elevation>DEFAULT_SEEDS.elevation);
  assert.equal(r.return_marker.status,'proposal-only');
  assert.equal(r.persisted,false);
  assert.equal(r.canon_commit,false);
  assert.equal(r.model_invoked,false);
  assert.equal(r.model_weights_updated,false);
});
test('each Return advances a helical state without rewriting immutable identity',async()=>{
  const first=await advanceMote(input(),owner);
  const second=await advanceMote(input({source:{
    event_id:'observer:turn-002',source_hash:'b'.repeat(64),
  }}),{...owner,seeds:first.carry});
  assert.ok(second.carry.phase>first.carry.phase);
  assert.ok(second.carry.elevation>first.carry.elevation);
  assert.notDeepEqual(second.carry,first.carry);
  assert.equal(second.candidate.identity_spin,first.candidate.identity_spin);
  assert.deepEqual(first,await advanceMote(input(),owner));
  assert.deepEqual(second,await advanceMote(input({source:{
    event_id:'observer:turn-002',source_hash:'b'.repeat(64),
  }}),{...owner,seeds:first.carry}));
});
test('distinct spins and relational signals do not collapse into lockstep',async()=>{
  const a=await advanceMote(input(),owner);
  const b=await advanceMote(input({mote_id:'wayglass:mote:002',identity_spin:0.19}),owner);
  const c=await advanceMote(input({signals:{
    ...input().signals,neighbour_resonance:0.95,novelty:0.1,
  }}),owner);
  assert.notEqual(a.carry.velocity,b.carry.velocity);
  assert.notEqual(a.carry.phase,b.carry.phase);
  assert.notEqual(a.carry.harmony,c.carry.harmony);
  assert.notEqual(a.carry.chaos,c.carry.chaos);
  assert.notEqual(a.carry.magic,c.carry.magic);
});
test('rejects unauthorised, unattributed and malformed observations or carried state',async()=>{
  await assert.rejects(advanceMote(input()),/authenticated House/);
  await assert.rejects(advanceMote(input({identity_spin:0}),owner),/identity_spin/);
  await assert.rejects(advanceMote(input({mote_id:'bad id'}),owner),/mote_id/);
  await assert.rejects(advanceMote(input({source:{
    event_id:'event:1',source_hash:'invented',
  }}),owner),/source_hash/);
  await assert.rejects(advanceMote(input({signals:{
    ...input().signals,novelty:NaN,
  }}),owner),/finite/);
  await assert.rejects(advanceMote(input({signals:{
    ...input().signals,time_step:0,
  }}),owner),/time_step/);
  await assert.rejects(advanceMote(input(),{...owner,seeds:{phase:0}}),/exactly/);
  await assert.rejects(advanceMote(input(),{...owner,seeds:{
    ...DEFAULT_SEEDS,magic:2,
  }}),/seeds.magic/);
});
test('Feather aborts before any candidate is returned',async()=>{
  const stop=new AbortController();stop.abort();
  await assert.rejects(advanceMote(input(),{...owner,signal:stop.signal}),/Feather/);
});
test('phase budget fails closed rather than silently wrapping or persisting',async()=>{
  await assert.rejects(advanceMote(input(),{...owner,seeds:{
    ...DEFAULT_SEEDS,phase:1000000,
  }}),/did not return cleanly/);
});
