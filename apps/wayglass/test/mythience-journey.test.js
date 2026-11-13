import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMythienceJourney,wayglassMythienceJourney} from '../src/mythience-journey.js';
const hash='a'.repeat(64),other='b'.repeat(64);
function crossing({id='traveller:a',input_hash=hash,from='universe:one',to='universe:two',crossings=1,charge=.7}={}){
  return {status:'candidate-returned',input_hash,source_hash:'wtl:crossing',
    phase_receipts:Array.from({length:8},(_,i)=>({phase:i})),
    carry:{crossings,attunement:.5,charge},
    candidate:{traveller_id:id,from,to,expression:.75,
      ability:{id:'ability:light',origin_universe:'universe:one',modality:'magic'}}};
}
function hybrid(){
  return {status:'candidate-returned',input_hash:'c'.repeat(64),source_hash:'wtl:hybrid',
    phase_receipts:Array.from({length:8},(_,i)=>({phase:i})),
    carry:{crossings:2,attunement:.6,charge:.4},
    candidate:{traveller_id:'traveller:a',id:'hybrid:one',
      destination_universe:'universe:three',expression:.8,
      parents:[{id:'ability:light',origin_universe:'universe:one'},
        {id:'ability:prism',origin_universe:'universe:two'}]}};
}
test('a candidate does not silently become carried experience or canon',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});
  const s=journey.snapshot();
  assert.equal(s.traveller_id,null);
  assert.equal(s.history.length,0);
  assert.equal(s.abilities.length,0);
  assert.equal(s.pending.kind,'crossing');
  assert.equal(s.canon_adopted,false);
});
test('explicit carry binds traveller and preserves source ability and return',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});
  const s=journey.carry();
  assert.equal(s.traveller_id,'traveller:a');
  assert.equal(s.seeds.crossings,1);
  assert.equal(s.history.length,1);
  assert.equal(s.abilities[0].origin_universe,'universe:one');
  assert.equal(s.lineage[0].source_hash,'wtl:crossing');
  assert.equal(s.pending,null);
  assert.equal(s.canon_adopted,false);
});
test('one traveller cannot silently inherit another traveller\'s powers',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});journey.carry();
  assert.throws(()=>journey.offer(crossing({id:'traveller:b',input_hash:other,crossings:2}),{traveller_id:'traveller:b'}),/another traveller/);
  assert.equal(journey.snapshot().abilities.length,1);
  journey.reset();
  assert.equal(journey.snapshot().traveller_id,null);
  journey.offer(crossing({id:'traveller:b',input_hash:other}),{traveller_id:'traveller:b'});
  assert.equal(journey.carry().traveller_id,'traveller:b');
});
test('a refused or malformed encounter cannot consume charge',()=>{
  const journey=createMythienceJourney();
  journey.offer({status:'denied'},{traveller_id:'traveller:a'});
  assert.equal(journey.snapshot().seeds.charge,1);
  assert.throws(()=>journey.carry(),/No proposed/);
  assert.throws(()=>journey.offer(crossing({charge:1.1}),{traveller_id:'traveller:a'}),/invalid carried/);
  assert.equal(journey.snapshot().seeds.charge,1);
});
test('a third ability carries two parents, but only after deliberate invitation',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});journey.carry();
  const second=crossing({input_hash:other,from:'universe:two',to:'universe:three',crossings:2,charge:.55});
  second.candidate.ability={id:'ability:prism',origin_universe:'universe:two',modality:'technology'};
  journey.offer(second,{traveller_id:'traveller:a'});journey.carry();
  journey.offer(hybrid(),{traveller_id:'traveller:a'});
  assert.equal(journey.snapshot().abilities.length,2);
  const carried=journey.carry();
  assert.equal(carried.abilities.length,3);
  assert.equal(carried.abilities[2].modality,'hybrid');
  assert.equal(carried.lineage[2].parent_refs.length,2);
  assert.equal(carried.seeds.crossings,2);
  assert.equal(carried.canon_adopted,false);
});
test('hybrid cannot forge uncarried parents or increase crossing count',()=>{
  const journey=createMythienceJourney();
  assert.throws(()=>journey.offer(hybrid(),{traveller_id:'traveller:a'}),/not in this traveller/);
  assert.equal(journey.snapshot().pending,null);
});
test('snapshot is detached from mutable internal state',()=>{
  const journey=createMythienceJourney();
  const s=journey.snapshot();s.seeds.charge=0;s.history.push({id:'forged'});
  assert.equal(journey.snapshot().seeds.charge,1);
  assert.equal(journey.snapshot().history.length,0);
});

test('a forged source or missing origin cannot enter the local lineage',()=>{
  const journey=createMythienceJourney();
  const missing=crossing();delete missing.source_hash;
  assert.throws(()=>journey.offer(missing,{traveller_id:'traveller:a'}),/source provenance/);
  const noOrigin=crossing();delete noOrigin.candidate.ability.origin_universe;
  assert.throws(()=>journey.offer(noOrigin,{traveller_id:'traveller:a'}),/provenance is incomplete/);
  assert.equal(journey.snapshot().history.length,0);
  assert.equal(journey.snapshot().pending,null);
});
test('Feather discards only the pending proposal and keeps earlier carried lineage',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});journey.carry();
  journey.offer(crossing({input_hash:other,from:'universe:two',to:'universe:three',crossings:2,charge:.55}),
    {traveller_id:'traveller:a'});
  const paused=journey.discard();
  assert.equal(paused.pending,null);
  assert.equal(paused.history.length,1);
  assert.equal(paused.seeds.crossings,1);
  assert.equal(paused.traveller_id,'traveller:a');
});

test('the ship shares one tab-local journey across room mounts without adopting pending candidates',()=>{
  const first=wayglassMythienceJourney(),second=wayglassMythienceJourney();
  assert.equal(first,second);
  first.reset();
  first.offer(crossing(),{traveller_id:'traveller:a'});
  assert.equal(second.snapshot().history.length,0);
  first.carry();
  assert.equal(second.snapshot().history.length,1);
  first.reset();
});

test('a stale asynchronous Wyrdrune result cannot replace a newer proposal',()=>{
  const journey=createMythienceJourney(),start=journey.snapshot().revision;
  journey.offer(crossing(),{traveller_id:'traveller:a',expected_revision:start});
  const newer=journey.snapshot();
  assert.equal(newer.revision,start+1);
  assert.throws(()=>journey.offer(crossing({input_hash:other}),{
    traveller_id:'traveller:a',expected_revision:start}),/Stale encounter/);
  assert.equal(journey.snapshot().pending.input_hash,hash);
  assert.throws(()=>journey.carry({expected_revision:start}),/Stale carry/);
  assert.equal(journey.carry({expected_revision:newer.revision}).history.length,1);
});
test('invalid candidate does not destroy an earlier valid pending proposal',()=>{
  const journey=createMythienceJourney();
  journey.offer(crossing(),{traveller_id:'traveller:a'});
  const before=journey.snapshot();
  const forged=crossing({input_hash:other});
  forged.candidate.ability.origin_universe='';
  assert.throws(()=>journey.offer(forged,{traveller_id:'traveller:a'}),/provenance/);
  assert.deepEqual(journey.snapshot(),before);
  assert.equal(journey.carry().history.length,1);
});
test('Feather invalidates outstanding asynchronous revision tokens',()=>{
  const journey=createMythienceJourney(),rev=journey.snapshot().revision;
  journey.discard();
  assert.throws(()=>journey.offer(crossing(),{
    traveller_id:'traveller:a',expected_revision:rev}),/Stale encounter/);
});
