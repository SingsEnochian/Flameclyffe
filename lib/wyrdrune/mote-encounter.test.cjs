'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {encounterTurn}=require('../wayglass-mote-encounter.cjs');
const {DEFAULT_SEEDS}=require('../wayglass-wyrdrune-motes.cjs');
const principal={id:'dev:encounter-test',authorized:true};
const pair=()=>[
  {mote_id:'wayglass:mote:opal',identity_spin:0.73,kind:'wonder',consent:true},
  {mote_id:'wayglass:mote:amber',identity_spin:0.27,kind:'listen',consent:true},
];
test('two opted-in motes receive separate native WTL proposals and an encounter projection',async()=>{
  const result=await encounterTurn({participants:pair(),principal});
  assert.equal(result.schema,'wayglass.mote-encounter/v0.1');
  assert.equal(result.consent,'both-explicit');
  assert.equal(result.changes.length,2);
  assert.equal(result.changes[0].identity_spin,0.73);
  assert.equal(result.changes[1].identity_spin,0.27);
  assert.notDeepEqual(result.changes[0].proposed,result.changes[1].proposed);
  for(const item of result.changes){
    assert.ok(item.proposed.phase>item.previous.phase);
    assert.ok(item.proposed.elevation>item.previous.elevation);
    assert.equal(item.evidence.phase_receipts,8);
    assert.equal(item.evidence.checkpoints,1);
    assert.equal(item.proposal.persisted,false);
  }
  assert.ok(result.projection.hue_shift>=0&&result.projection.hue_shift<=1);
  assert.equal(result.persisted,false);
  assert.equal(result.canon_adopted,false);
  assert.equal(result.model_invoked,false);
});
test('encounter is deterministic, replayable and reads both previous states',async()=>{
  const a=await encounterTurn({participants:pair(),principal});
  assert.deepEqual(a,await encounterTurn({participants:pair(),principal}));
  const next=pair();
  next[0].seeds=a.changes[0].proposed;
  next[1].seeds=a.changes[1].proposed;
  const b=await encounterTurn({participants:next,turn:2,principal});
  assert.ok(b.changes[0].proposed.phase>a.changes[0].proposed.phase);
  assert.ok(b.changes[1].proposed.phase>a.changes[1].proposed.phase);
  assert.notEqual(a.source_hash,b.source_hash);
  assert.deepEqual(next[0].seeds,a.changes[0].proposed);
  assert.deepEqual(DEFAULT_SEEDS,pair()[0].seeds??DEFAULT_SEEDS);
});
test('neighbour prior state affects encounter, without rewriting identity',async()=>{
  const a=await encounterTurn({participants:pair(),principal});
  const changed=pair();
  changed[1].seeds={...DEFAULT_SEEDS,harmony:0.95,magic:0.85};
  const b=await encounterTurn({participants:changed,principal});
  assert.notEqual(a.changes[0].proposed.harmony,b.changes[0].proposed.harmony);
  assert.equal(a.changes[0].identity_spin,b.changes[0].identity_spin);
  assert.notEqual(a.encounter_id,b.encounter_id);
});
test('refusal, duplicate identity, invalid seeds, unauthorised principal and Feather fail closed',async()=>{
  const refused=pair();refused[1].consent=false;
  await assert.rejects(encounterTurn({participants:refused,principal}),/explicit consent/);
  const duplicate=pair();duplicate[1].mote_id=duplicate[0].mote_id;
  await assert.rejects(encounterTurn({participants:duplicate,principal}),/distinct/);
  const bad=pair();bad[0].seeds={...DEFAULT_SEEDS,magic:2};
  await assert.rejects(encounterTurn({participants:bad,principal}),/seeds.magic/);
  await assert.rejects(encounterTurn({participants:pair()}),/authenticated/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(encounterTurn({participants:pair(),principal,signal:controller.signal}),/Feather/);
});
