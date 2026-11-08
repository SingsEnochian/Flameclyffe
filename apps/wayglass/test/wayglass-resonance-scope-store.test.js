import test from 'node:test';
import assert from 'node:assert/strict';
import {createResonanceScopeStore} from '../src/resonance-scope-store.js';

const item=(n,bloom,scope_ref)=>({event_id:'ui-'+n,source_ref:'wayglass:ui-events',bloom,scope_ref});
test('instant / room / world / universe are distinct numerical windows',()=>{
  const store=createResonanceScopeStore();
  const first=store.setScope({room:'arcsweep:writing-room',world:'world:forest'});
  store.record(item(1,.2,first));store.record(item(2,.6,first));
  const second=store.setScope({room:'wayglass:living-observer',world:'world:forest'});
  store.record(item(3,.8,second));
  const third=store.setScope({room:'arcsweep:writing-room',world:'world:sea'});
  store.record(item(4,1,third));
  const a=store.snapshot('ui-2');
  assert.equal(a.scalars.instant,.6);
  assert.equal(a.scalars.room,.4);
  assert.ok(Math.abs(a.scalars.world-(.2+.6+.8)/3)<1e-10);
  assert.ok(Math.abs(a.scalars.universe-(((.2+.6+.8)/3)+1)/2)<1e-10);
  assert.deepEqual(a.counts,{instant:1,room:2,world:3,universe:2});
  assert.deepEqual(a.provenance.event_refs,['ui-1','ui-2','ui-3']);
  assert.equal(store.snapshot('ui-4').counts.room,1);
});
test('world boundaries never mix private source refs into server scalars',()=>{
 const store=createResonanceScopeStore({limit:8});
 const a=store.setScope({room:'room:a',world:'world:a'});
 store.record(item(1,.1,a));
 const b=store.setScope({room:'room:b',world:'world:b'});
 for(let n=2;n<=10;n++)store.record(item(n,.8,b));
 const snap=store.snapshot('ui-10');
 assert.equal(snap.counts.world,8);
 assert.equal(snap.counts.universe,1);
 assert.equal(store.inspect().size,8);
 assert.ok(Math.abs(snap.scalars.universe-.8)<1e-12);
 assert.equal(snap.provenance.event_refs.length,8);
});
test('scope and sensor values must be bounded; no model identities are inferred',()=>{
 const store=createResonanceScopeStore();
 assert.throws(()=>store.setScope({world:'🚨 private secret'}),/scope/i);
 assert.throws(()=>store.record(item(1,NaN,store.scope())),/bounded/);
 assert.throws(()=>store.record({...item(1,.5,store.scope()),source_ref:'external:speaker'}),/source/);
 assert.equal(store.snapshot(),null);
 store.record(item(2,.5,store.scope()));
 store.clear();
 assert.equal(store.inspect().size,0);
});
