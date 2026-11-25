import test from 'node:test';
import assert from 'node:assert/strict';
import {describeEpistemicMembrane} from '../src/living-observer-model.js';
test('membrane preserves unknown, negative, unobservable and withheld independently',()=>{
 const channels=['a','b','c','d','e'];
 const readings=[{channel:'a',status:'observed',basis:'receipt A'},{channel:'b',status:'bounded-negative',basis:'no event in sampled window'},{channel:'c',status:'unobservable',basis:'specified instrument cannot distinguish'},{channel:'d',status:'withheld',basis:'consent not granted'}];
 const result=describeEpistemicMembrane({channels,readings});
 assert.deepEqual(result.channels.map(x=>x.status),['observed','bounded-negative','unobservable','withheld','unknown']);
 assert.equal(result.model_completeness,'unresolved');assert.equal(result.mathematical_observability_rank,null);assert.equal(result.permissions_changed,false);
 assert.throws(()=>describeEpistemicMembrane({channels,readings:[...readings,readings[0]]}));
});

test('real Observer packet preserves missing route and private-memory boundaries',async()=>{
 const {createWayglassObservation}=await import('../src/living-observer-model.js');
 const a=createWayglassObservation({route:null});
 const get=(p,id)=>p.membrane.channels.find(x=>x.channel===id).status;
 assert.equal(get(a,'routes'),'unknown');assert.equal(get(a,'receipt'),'unknown');assert.equal(get(a,'private-memory'),'withheld');
 const b=createWayglassObservation({route:{status:'completed',receipt_time:'2026-11-25T00:00:00Z'}});
 assert.equal(get(b,'routes'),'observed');assert.equal(get(b,'receipt'),'observed');assert.equal(b.membrane.mathematical_observability_rank,null);
});
