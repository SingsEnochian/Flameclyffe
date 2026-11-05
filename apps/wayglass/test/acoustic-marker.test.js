import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,bearing,receipt,recover,MARKER,SCHEMA} from '../src/acoustic-marker-model.js';

test('default is muted and marker has a stable source',()=>{
 const s=initialState();assert.equal(s.muted,true);assert.equal(s.marker.source_ref,MARKER.source_ref);assert.equal(s.schema,SCHEMA);
});
test('orient exposes bearing without moving listener',()=>{
 const s=initialState(),n=transition(s,{type:'orient'});assert.deepEqual(n.listener,s.listener);assert.equal(n.status,'oriented');assert.ok(bearing(n).distance>0);
});
test('traverse request never executes traversal',()=>{
 const s=initialState(),n=transition(s,{type:'request-traverse'});assert.deepEqual(n.listener,s.listener);assert.equal(n.status,'traverse-requested');
});
test('turn changes relative pan and stays bounded',()=>{
 const s=initialState(),a=bearing(s),b=bearing(transition(s,{type:'turn',value:Math.PI/2}));assert.notEqual(a.pan,b.pan);assert.ok(Math.abs(b.pan)<=1);
});
test('move is bounded and finite',()=>{
 let s=initialState();for(let i=0;i<50;i++)s=transition(s,{type:'move',value:500});assert.ok(s.listener.x<=1);assert.throws(()=>transition(s,{type:'move',value:'not-a-number'}),TypeError);
});
test('cold receipt recovers spatial state but not autoplay',()=>{
 let s=transition(initialState(),{type:'turn',value:0.4});s=transition(s,{type:'move',value:0.1});s=transition(s,{type:'select'});
 const r=receipt(s),t=recover(JSON.parse(JSON.stringify(r)));
 assert.deepEqual(t.listener,s.listener);assert.equal(t.marker.id,s.marker.id);assert.equal(t.status,'returned');assert.equal(t.muted,true);
});
test('invalid receipt is rejected',()=>{
 assert.throws(()=>recover({schema:'other'}),TypeError);
 assert.throws(()=>recover({...receipt(initialState()),marker:{...MARKER,source_ref:'spoofed'}}),TypeError);
});
test('Feather stops sound and ambience independently',()=>{
 let s=transition(initialState(),{type:'mute',value:false});s=transition(s,{type:'ambience',value:true});s=transition(s,{type:'feather'});
 assert.equal(s.muted,true);assert.equal(s.ambience,false);assert.equal(s.status,'cancelled');
});
test('mono does not change the bearing',()=>{
 const s=initialState(),n=transition(s,{type:'mono',value:true});assert.deepEqual(bearing(n),bearing(s));
});


test('recovery rejects corrupt state instead of coercing or clamping it',()=>{
 const original=receipt(initialState());
 const mutations=[
  r=>{r.world_id='other-world';},
  r=>{r.marker.x+=0.01;},r=>{r.marker.y+=0.01;},
  r=>{r.listener.x=2;},r=>{r.listener.y=-2;},r=>{r.listener.heading=4;},
  r=>{r.listener.x='0';},r=>{r.listener.heading=NaN;},
  r=>{r.selected='false';},r=>{r.selected=1;},r=>{delete r.selected;},
  r=>{r.status='crossing-completed';},r=>{r.status=null;},
  r=>{r.revision=Infinity;},r=>{r.revision=-1;},r=>{r.revision=0.5;},
  r=>{r.revision='0';},r=>{r.revision=Number.MAX_SAFE_INTEGER+1;},
  r=>{r.events={};},r=>{delete r.events;},
 ];
 for(const mutate of mutations){const r=structuredClone(original);mutate(r);assert.throws(()=>recover(r),TypeError);}
});

test('recovery accepts only bounded contiguous typed event history',()=>{
 let state=initialState();
 for(let i=0;i<45;i++)state=transition(state,{type:'turn',value:0.01});
 const valid=receipt(state),restored=recover(valid);
 assert.equal(restored.events.length,40);assert.deepEqual(restored.events,valid.events);
 const mutations=[
  r=>{r.events.push({...r.events[0]});},r=>{r.events=[];},
  r=>{r.events[0]=null;},r=>{r.events[0].revision=Infinity;},
  r=>{r.events[0].revision+=1;},r=>{r.events[0].type='execute-crossing';},
  r=>{r.events[0].status='anything';},r=>{r.events[0].payload={arbitrary:true};},
  r=>{delete r.events[0].type;},r=>{delete r.events[0];},
 ];
 for(const mutate of mutations){const r=structuredClone(valid);mutate(r);assert.throws(()=>recover(r),TypeError);}
 valid.events[0].type='feather';
 assert.equal(restored.events[0].type,'turn','recovered history must be detached');
});

test('recovered legacy receipt remains recoverable after new events and a second cold return',()=>{
 let state=transition(initialState(),{type:'select'});
 state=transition(state,{type:'mute',value:false});
 state=recover(JSON.parse(JSON.stringify(receipt(state))));
 state=transition(state,{type:'move',value:0.1});
 const result=recover(JSON.parse(JSON.stringify(receipt(state))));
 assert.deepEqual(result.listener,state.listener);assert.equal(result.selected,true);
 assert.equal(result.muted,true);assert.equal(result.ambience,false);assert.equal(result.status,'returned');
 assert.equal(result.revision,3);
});

test('typed placement records an event and survives cold return',()=>{
 const initial=transition(initialState(),{type:'turn',value:0.7});
 const placed=transition(initial,{type:'place',x:-0.75,y:0.25});
 assert.deepEqual(initial.listener,{x:0,y:0,heading:0.7});
 assert.deepEqual(placed.listener,{x:-0.75,y:0.25,heading:initial.listener.heading});
 assert.equal(placed.revision,2);assert.deepEqual(placed.events.at(-1),{revision:2,type:'place',status:'idle'});
 const returned=recover(JSON.parse(JSON.stringify(receipt(placed))));
 assert.deepEqual(returned.listener,placed.listener);assert.equal(returned.muted,true);
});

test('placement rejects nonnumeric nonfinite and out-of-bounds coordinates',()=>{
 const state=initialState();
 for(const coordinate of ['0',null,true,NaN,Infinity,-Infinity,{},undefined]){
  assert.throws(()=>transition(state,{type:'place',x:coordinate,y:0}),TypeError);
  assert.throws(()=>transition(state,{type:'place',x:0,y:coordinate}),TypeError);
 }
 for(const coordinate of [-1.001,1.001]){
  assert.throws(()=>transition(state,{type:'place',x:coordinate,y:0}),RangeError);
  assert.throws(()=>transition(state,{type:'place',x:0,y:coordinate}),RangeError);
 }
 assert.deepEqual(transition(state,{type:'place',x:-1,y:1}).listener,{x:-1,y:1,heading:0});
 assert.equal(state.revision,0);
});
