import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundComposition} from '../../../lib/wayglass-sound-composition.mjs';
import {createAcousticComposition} from '../src/acoustic-composition.js';
import {createWorld,advanceWorld,worldReceipt} from '../src/acoustic-world-model.js';
const declaration=value=>({voices:[{voice_id:'captured:acoustic-a',source_ref:'fixture:voice-a'},{voice_id:'captured:acoustic-b',source_ref:'fixture:voice-b'}],affinity:{value,source_ref:'fixture:declared-affinity'}});
function fixture({acceptAudio=true}={}){
 let world=createWorld(),id=0,stops=0;const tasks=new Map(),playback=[],mono=[],frames=[];
 const engine=createSoundComposition({region:'wayglass-acoustic',source_ref:'apps/wayglass/src/acoustic-audio-engine.js',timers:{setTimeout(fn){tasks.set(++id,fn);return id;},clearTimeout(id){tasks.delete(id);}},onScore:frame=>{frames.push(frame);return true;},enableAudio:async()=>acceptAudio});
 const audio={composition:engine,stop(){stops++;engine.pauseGeneration();engine.disableAudio();}};
 const score=createAcousticComposition({audio,getWorldReceipt:()=>worldReceipt(world),setPlayback:value=>playback.push(value),setMono:value=>mono.push(value)});
 return {score,engine,tasks,playback,mono,frames,get stops(){return stops;},get world(){return world;},changeWorld(){world=advanceWorld(world,{fieldMass:1.1});},close:()=>engine.dispose()};
}
test('acoustic region begins source-pending without inventing voices or enabling output',async()=>{
 const f=fixture();try{
 assert.equal(f.engine.snapshot().source_kind,'wyrdrune-program');assert.equal(f.score.storyBinding.getContext(),null);assert.equal(f.engine.snapshot().audio_enabled,false);assert.equal(f.tasks.size,0);
 f.engine.startGeneration({confirmed:true});await f.engine.waitForScore();assert.equal(f.engine.snapshot().score_status,'source-score-unavailable');assert.equal(f.frames.length,0);assert.equal(f.playback.length,0);
 await assert.rejects(f.score.composition.enableAudio({confirmed:true}),/evaluation/);assert.equal(f.playback.length,0);
 }finally{f.close();}
});
test('actual authored WTL uses acoustic-local literal story, distinct declarations and immutable field anchor',async()=>{
 const f=fixture();try{
 f.score.setStoryText('Water wind flame shadow moving');f.score.storyBinding.setContext(declaration(.5));
 const original=f.score.storyBinding.checkpoint().anchor;assert.equal(original.field.snapshot_id,f.world.snapshot_id);
 f.engine.startGeneration({confirmed:true});await f.engine.waitForScore();
 const first=f.engine.snapshot();assert.equal(first.layers.length,4);assert.equal(first.score_status,'source-score-ready');assert.equal(first.program_provenance.phase_receipts.length,16);assert.equal(first.program_provenance.metrics_source,'acoustic-local:story-input');
 assert.deepEqual(first.program_provenance.return_anchor,original);assert.equal(first.audio_enabled,false);
 f.changeWorld();f.score.storyBinding.setContext(declaration(.8));await f.engine.waitForScore();assert.deepEqual(f.score.storyBinding.checkpoint().anchor,original);assert.deepEqual(f.engine.snapshot().program_provenance.return_anchor,original);
 }finally{f.close();}
});
test('explicit playback and mono synchronize existing acoustic controls; a source-ready score is required first',async()=>{
 const f=fixture();try{
 f.score.storyBinding.setContext(declaration(.5));f.engine.startGeneration({confirmed:true});await f.engine.waitForScore();
 await assert.rejects(f.score.composition.enableAudio({confirmed:false}),/gesture/);assert.equal(f.playback.length,0);
 await f.score.composition.enableAudio({confirmed:true});assert.deepEqual(f.playback,[true]);assert.equal(f.engine.snapshot().audio_enabled,true);
 f.score.composition.setMix({mono:true});assert.deepEqual(f.mono,[true]);assert.ok(f.engine.snapshot().layers.every(layer=>layer.pan===0));
 f.score.composition.disableAudio();assert.deepEqual(f.playback,[true,false]);assert.equal(f.engine.snapshot().audio_enabled,false);assert.equal(f.engine.snapshot().generating,true);
 }finally{f.close();}
});
test('complete acoustic sound return validates before mutation and restores paused with the same source anchor',async()=>{
 const f=fixture();try{
 f.score.setStoryText('A river beneath the wind');f.score.storyBinding.setContext(declaration(.4));f.engine.startGeneration({confirmed:true});await f.engine.waitForScore();
 const record=f.score.checkpoint(),before=f.score.checkpoint();
 for(const bad of [{...record,world_snapshot_id:'different'},{...record,binding:{...record.binding,sourceHash:'bad'}},{...record,composition:{...record.composition,intent:{...record.composition.intent,rate:0}}}]){
  assert.throws(()=>f.score.validate(bad,{worldSnapshotId:f.world.snapshot_id}));assert.deepEqual(f.score.checkpoint(),before);assert.equal(f.stops,0);
 }
 await f.score.composition.enableAudio({confirmed:true});f.score.setStoryText('Changed draft');f.score.restore(record);
 assert.equal(f.engine.snapshot().generating,false);assert.equal(f.engine.snapshot().audio_enabled,false);assert.equal(f.engine.snapshot().score_status,'return-held');assert.equal(f.tasks.size,0);assert.equal(f.score.getStoryText(),'A river beneath the wind');assert.deepEqual(f.score.storyBinding.checkpoint().anchor,record.binding.anchor);
 await assert.rejects(f.score.composition.enableAudio({confirmed:true}),/evaluation/);
 }finally{f.close();}
});
test('Feather remains held through recovery and release never starts generation or audio',async()=>{
 const f=fixture();try{
 const record=f.score.checkpoint();f.score.soundscape.feather();f.score.restore(record);assert.equal(f.engine.snapshot().feather_stopped,true);
 assert.throws(()=>f.score.soundscape.releaseFeather({confirmed:false}),/Explicit/);assert.equal(f.engine.snapshot().feather_stopped,true);
 f.score.soundscape.releaseFeather({confirmed:true});assert.equal(f.engine.snapshot().feather_stopped,false);assert.equal(f.engine.snapshot().generating,false);assert.equal(f.engine.snapshot().audio_enabled,false);
 assert.throws(()=>f.score.setStoryText('x'.repeat(10001)),/10000/);
 }finally{f.close();}
});

test('unavailable output rolls the existing acoustic playback controls back to muted',async()=>{
 const f=fixture({acceptAudio:false});try{
 f.score.storyBinding.setContext(declaration(.5));f.engine.startGeneration({confirmed:true});await f.engine.waitForScore();
 const result=await f.score.composition.enableAudio({confirmed:true});assert.equal(result.audio_enabled,false);assert.deepEqual(f.playback,[true,false]);assert.equal(f.engine.snapshot().generating,true);
 }finally{f.close();}
});
