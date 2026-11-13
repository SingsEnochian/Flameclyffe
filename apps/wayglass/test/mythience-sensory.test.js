import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mythienceTone,createMythienceSensory} from '../src/mythience-sensory.js';
test('Wyrdrune-derived audible tone stays bounded and deterministic',()=>{
  const low=mythienceTone({expression:0,permeability:0});
  const high=mythienceTone({expression:1,permeability:1});
  assert.ok(high.rootHz>low.rootHz);
  assert.ok(high.secondHz>low.secondHz);
  assert.ok(high.volume<=.04);
  assert.deepEqual(high,mythienceTone({expression:3,permeability:3}));
});
test('audio and haptics do not activate on creation',async()=>{
  let called=0;
  const sensory=createMythienceSensory({AudioContextCtor:null,vibrate:()=>{called++;return true;}});
  assert.equal(called,0);
  assert.equal((await sensory.hear({expression:.5})).played,false);
  assert.equal(called,0);
  assert.equal(sensory.feel({expression:.5}).felt,true);
  assert.equal(called,1);
  await sensory.destroy();
});
