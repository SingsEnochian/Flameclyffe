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
