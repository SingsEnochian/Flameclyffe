import test from 'node:test';
import assert from 'node:assert/strict';
import {createShipSoundscape,SHIP_SCORE_SOURCES} from '../src/ship-soundscape.js';

const frame=Object.freeze({
 schema:'wayglass.wyrdrune-story-soundscape/v0.1',
 withness:{completedCycles:2},eightfold:Array.from({length:16},(_,i)=>({phase:String(i)})),
 program_sha256:'a'.repeat(64),story_sha256:'b'.repeat(64),
 score:{rootHz:165,counterpartHz:211,foregroundGain:.02,atmosphereGain:.01},
});
function harness(){
 const calls=[];
 const state={running:false,muted:true};
 const composition={
  snapshot:()=>({program:{source_kind:'wyrdrune-program'}}),
  pauseGeneration:()=>calls.push('pause'),disableAudio:()=>calls.push('disable'),
 };
 const audio={
  composition,
  getState:()=>({running:state.running,status:state.running?'running':'stopped'}),
  update:x=>{calls.push(['update',x]);if(x.muted!=null)state.muted=x.muted;return audio.getState();},
  start:async()=>{calls.push('start');state.running=true;return audio.getState();},
  stop:()=>{calls.push('stop');state.running=false;return audio.getState();},
  dispose:()=>calls.push('dispose'),
 };
 const events=new Map(),scope={
  addEventListener:(k,v)=>events.set(k,v),
  removeEventListener:k=>events.delete(k),
 };
 const bus=createShipSoundscape({audio,scope,scoreStory:async()=>frame,
  feather:{snapshot:()=>({feather_stopped:false})}});
 return {bus,calls,events};
}
test('ship playback preserves original and extended WTL score source and digest',async()=>{
 const h=harness();
 try{
  assert.equal(h.bus.snapshot().source_ref,SHIP_SCORE_SOURCES.owner);
  assert.equal(h.bus.snapshot().playing,false);
  await h.bus.composeExtended({text:'Water wind'});
  assert.equal(h.bus.snapshot().score_ready,true);
  await h.bus.playExtended({mono:true});
  assert.equal(h.bus.snapshot().playing,true);
  assert.equal(h.bus.snapshot().source_ref,SHIP_SCORE_SOURCES.extended);
  assert.equal(h.bus.snapshot().score_digest,'a'.repeat(64));
  assert.equal(h.calls.filter(c=>c==='start').length,1);
  h.bus.selectOwner();
  assert.equal(h.bus.snapshot().source_ref,SHIP_SCORE_SOURCES.owner);
 }finally{h.bus.dispose();}
});
test('ship Feather stops soundtrack, while owner and extended remain separate',async()=>{
 const h=harness();
 try{
  await h.bus.composeExtended();
  await h.bus.playExtended();
  h.events.get('wayglass:feather')?.({detail:{stopped:true}});
  // The injected test scope receives the shared Feather event name.
  assert.equal(h.bus.snapshot().playing,false);
 }finally{h.bus.dispose();}
});
test('invalid host receipts never reach the shared audio device',async()=>{
 const h=harness();
 try{
  assert.throws(()=>h.bus.setExtended({...frame,program_sha256:'not-a-digest'}),/verified 16-phase/);
  assert.equal(h.calls.filter(c=>c==='start').length,0);
 }finally{h.bus.dispose();}
});
