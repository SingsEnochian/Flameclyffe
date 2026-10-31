import test from 'node:test';
import assert from 'node:assert/strict';
import {createVesselEcology,VESSEL_ECOLOGY_SCHEMA} from '../src/vessel-ecology.js';
const e=(kind,event_id)=>({kind,event_id,source_ref:'wayglass-ship:kernel'});
test('source observations alter bounded vessel dynamics, not identity',()=>{
  const a=createVesselEcology();
  assert.equal(a.snapshot().schema,VESSEL_ECOLOGY_SCHEMA);
  a.observe(e('deck-settled','room:1'));
  assert.equal(a.snapshot().metrics.activity,.27);
  assert.equal(a.snapshot().recent_events[0].source_ref,'wayglass-ship:kernel');
  assert.equal('participant_id' in a.snapshot(),false);
});
test('event deduplication and bounded history',()=>{
  const a=createVesselEcology({maxEvents:2});
  a.observe(e('route-started','r1'));a.observe(e('route-started','r1'));
  assert.equal(a.snapshot().sequence,1);
  a.observe(e('route-completed','r2'));a.observe(e('deck-settled','r3'));
  assert.deepEqual(a.snapshot().recent_events.map(x=>x.event_id),['r2','r3']);
});
test('Feather freezes all process dynamics, including elapsed time',()=>{
  const a=createVesselEcology();a.observe(e('feather-held','f1'));
  const before=a.snapshot();
  a.observe(e('route-started','r1'));a.step(30);
  assert.deepEqual(a.snapshot().metrics,before.metrics);
  assert.equal(a.snapshot().elapsed_seconds,0);
  a.observe(e('feather-released','f2'));a.step(1);
  assert.equal(a.snapshot().elapsed_seconds,1);
});
test('deterministic independent replay',()=>{
  const a=createVesselEcology();
  const events=[e('deck-settled','a'),e('wonder-open','b'),e('route-failed','c')];
  for(const x of events)a.observe(x);a.step(5);
  assert.deepEqual(a.replay(events,[5]),a.snapshot());
});
test('invalid event sources, event types, and extreme time steps rejected',()=>{
  const a=createVesselEcology();
  for(const invalid of [{kind:'identity-mutation',event_id:'x',source_ref:'ship:local'},
    {kind:'deck-settled',event_id:'x',source_ref:'model text'},
    {kind:'deck-settled',event_id:'',source_ref:'ship:x'}])assert.throws(()=>a.observe(invalid));
  for(const x of [-1,Infinity,61,NaN])assert.throws(()=>a.step(x));
});
test('failing subscribers cannot alter kernel or block later subscribers',()=>{
  const a=createVesselEcology();let n=0;
  a.subscribe(()=>{throw Error('subscriber');});
  const stop=a.subscribe(()=>n++);
  a.observe(e('deck-settled','a'));stop();a.observe(e('deck-settled','b'));
  assert.equal(n,2);a.destroy();assert.throws(()=>a.observe(e('deck-settled','c')));
});
