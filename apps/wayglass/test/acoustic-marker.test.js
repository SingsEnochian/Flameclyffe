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
