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

test('Feather stop during pending audio resume prevents late oscillator playback',async()=>{
  let release,started=0;
  const resumePromise=new Promise(resolve=>{release=resolve;});
  class SuspendedAudio {
    constructor(){this.state='suspended';this.currentTime=0;}
    resume(){return resumePromise;}
    createOscillator(){started++;throw new Error('must not create oscillator after stop');}
  }
  const sensory=createMythienceSensory({AudioContextCtor:SuspendedAudio,vibrate:()=>true});
  const pending=sensory.hear({expression:.8,permeability:.6});
  sensory.stop();
  release();
  const result=await pending;
  assert.equal(result.played,false);
  assert.equal(started,0);
  await sensory.destroy();
});
