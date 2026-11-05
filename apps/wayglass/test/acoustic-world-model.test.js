import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition} from '../src/acoustic-marker-model.js';
import {createWorld,advanceWorld,forkWorld,worldReceipt,recoverWorld,compareWorlds,MAX_RECEIPT_BYTES} from '../src/acoustic-world-model.js';

// Acceptance: one snapshot binds field and listener coordinates; JSON cold
// return preserves that scientific state and lineage with playback muted.
// Corrupted metadata, source, coordinates, histories and oversized envelopes
// reject before the baseline marker recovery can coerce or clamp them.
const clone=value=>JSON.parse(JSON.stringify(value));
test('shared snapshot binds source, listener, frame and field model',()=>{
 const w=createWorld();
 assert.equal(w.sources[0].mass,w.fieldMass);
 assert.equal(w.sources[0].source_ref,w.markerState.marker.source_ref);
 assert.equal(w.sources[0].x,w.markerState.marker.x);
 assert.equal(w.frame.y,'down');assert.equal(w.frame.heading,'radians-clockwise-from-positive-x');
 assert.equal(w.model.softening,0.15);assert.equal(w.tick,0);assert.equal(w.parent_snapshot_id,null);
 assert.ok(Object.isFrozen(w));assert.ok(Object.isFrozen(w.markerState.listener));
});
test('JSON cold return preserves spatial state, selection, branch and sources without autoplay',()=>{
 let s=transition(initialState(),{type:'turn',value:0.4});
 s=transition(s,{type:'move',value:0.1});s=transition(s,{type:'select'});
 s=transition(s,{type:'mute',value:false});s=transition(s,{type:'ambience',value:true});
 s=transition(s,{type:'mono',value:true});
 const a=advanceWorld(createWorld(),{markerState:s,fieldMass:1.25});
 const b=forkWorld(a,{branchId:'mirror-1',fieldMass:1.5});
 const saved=worldReceipt(b),c=recoverWorld(clone(saved));
 assert.equal(c.snapshot_id,b.snapshot_id);assert.equal(c.parent_snapshot_id,a.snapshot_id);
 assert.equal(c.branch_id,'mirror-1');assert.equal(c.tick,2);
 assert.deepEqual(c.markerState.listener,b.markerState.listener);
 assert.deepEqual(c.sources,b.sources);assert.deepEqual(c.model,b.model);
 assert.equal(c.fieldMass,1.5);assert.equal(c.markerState.selected,true);
 assert.equal(c.markerState.muted,true);assert.equal(c.markerState.ambience,false);
 assert.equal(c.markerState.mono,true);assert.equal(c.markerState.status,'returned');
 assert.equal(b.markerState.muted,false); // Saving does not modify running audio preferences.
});
test('branch comparison reports the changed scientific conditions without mutating originals',()=>{
 const a=createWorld(),b=forkWorld(a,{branchId:'mass-trial',fieldMass:1.2});
 assert.equal(b.parent_snapshot_id,a.snapshot_id);
 assert.deepEqual(compareWorlds(a,b).changes,[{path:'fieldMass',before:0.7,after:1.2}]);
 assert.equal(a.fieldMass,0.7);assert.equal(a.tick,0);
 assert.throws(()=>forkWorld(a,{branchId:'primary'}),/distinct/);
});
test('deterministic IDs distinguish divergent same-tick content and branch names',()=>{
 const a=createWorld();
 assert.equal(a.snapshot_id,createWorld().snapshot_id);
 const b=advanceWorld(a,{fieldMass:1}),c=advanceWorld(a,{fieldMass:2});
 assert.equal(b.tick,c.tick);assert.notEqual(b.snapshot_id,c.snapshot_id);
 assert.notEqual(forkWorld(a,{branchId:'left'}).snapshot_id,forkWorld(a,{branchId:'right'}).snapshot_id);
});
test('rejects unsupported schema, frames, models, source corruption and tag changes',()=>{
 const valid=worldReceipt(createWorld());
 for(const mutate of [
  r=>r.schema='other',r=>r.world_id='other',r=>r.room_id='other',r=>r.kind='observed',
  r=>r.frame.units='metres',r=>r.model.softening=0.3,
  r=>r.sources[0].mass=1,r=>r.sources[0].x=0.8,r=>r.sources[0].source_ref='spoofed',
  r=>r.markerState.marker.x=0.8,r=>r.markerState.marker.source_ref='spoofed',
  r=>r.fieldMass=1,r=>r.tick++,r=>r.parent_snapshot_id='anything',
  r=>r.branch_id='../../other',r=>r.snapshot_id='spoofed'
 ]){const bad=clone(valid);mutate(bad);assert.throws(()=>recoverWorld(bad));}
});
test('rejects nonfinite, coerced, out-of-range and unsafe state inputs',()=>{
 for(const fieldMass of [NaN,Infinity,-1,2.01,'1',null])assert.throws(()=>createWorld({fieldMass}));
 const w=createWorld();
 assert.throws(()=>advanceWorld(w,{fieldMass:null}));
 assert.throws(()=>advanceWorld(w,{markerState:null}));
 assert.throws(()=>forkWorld(w,{branchId:'trial',fieldMass:null}));
 for(const mutate of [
  s=>s.listener.x=Infinity,s=>s.listener.y=-1.01,s=>s.listener.heading=4,
  s=>s.selected='true',s=>s.muted=1,s=>s.mono=null,
  s=>s.revision=Infinity,s=>s.revision=Number.MAX_SAFE_INTEGER+1,
  s=>s.status='executed-crossing',s=>s.events=[{revision:1,type:'unknown',status:'idle'}],
  s=>s.events=[{revision:1,type:'turn',status:'idle'}],
  s=>{s.revision=2;s.events=[{revision:2,type:'turn',status:'idle'},{revision:1,type:'turn',status:'idle'}];}
 ]){const s=initialState();mutate(s);assert.throws(()=>createWorld({markerState:s}));}
});
test('bounded receipt rejects oversized/cyclic payloads and excessive histories',()=>{
 const r=worldReceipt(createWorld());
 assert.throws(()=>recoverWorld({...r,unexpected:'x'.repeat(MAX_RECEIPT_BYTES)}),/size limit/);
 const cycle={...r};cycle.cycle=cycle;assert.throws(()=>recoverWorld(cycle),/serializable/);
 const s=initialState();s.revision=41;s.events=Array.from({length:41},(_,i)=>({revision:i+1,type:'turn',status:'idle'}));
 assert.throws(()=>createWorld({markerState:s}),/events/);
});
test('receipt and comparison return independent values',()=>{
 const a=createWorld(),r=worldReceipt(a);r.markerState.listener.x=0.9;r.sources[0].mass=2;
 assert.equal(a.markerState.listener.x,0);assert.equal(a.sources[0].mass,0.7);
 const b=advanceWorld(a,{markerState:transition(a.markerState,{type:'select'})});
 assert.deepEqual(compareWorlds(a,b).changes,[{path:'selected',before:false,after:true}]);
});
test('typed placement advances and cold-recovers with its recorded event',()=>{
 const a=createWorld();
 const placed=transition(a.markerState,{type:'place',x:-0.35,y:0.6});
 const b=advanceWorld(a,{markerState:placed});
 const c=recoverWorld(clone(worldReceipt(b)));
 assert.equal(c.markerState.listener.x,-0.35);assert.equal(c.markerState.listener.y,0.6);
 assert.equal(c.markerState.events.at(-1).type,'place');
 assert.equal(c.snapshot_id,b.snapshot_id);assert.equal(c.parent_snapshot_id,a.snapshot_id);
});
test('world capture rejects incomplete, sparse, noncontiguous and extended event histories before saving',()=>{
 for(const mutate of [
  s=>s.revision++,
  s=>{s.events=[];},
  s=>{s.events=new Array(1);},
  s=>{s.events[0].revision=0;},
  s=>{s.events[0].extra='invalid';},
  s=>{s.events[0]=['revision','type','status'];}
 ]){
  const s=transition(initialState(),{type:'select'});mutate(s);
  assert.throws(()=>createWorld({markerState:s}));
 }
 let s=initialState();for(let i=0;i<45;i++)s=transition(s,{type:'turn',value:0.01});
 const w=createWorld({markerState:s});
 assert.equal(recoverWorld(clone(worldReceipt(w))).markerState.events[0].revision,6);
});
