import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundComposition,isSoundCompositionProposal,scoreForComposition} from '../lib/wayglass-sound-composition.mjs';
function fixture(options={}){const tasks=new Map(),frames=[],timers={setTimeout(fn,ms){const id=Symbol();tasks.set(id,{fn,ms});return id;},clearTimeout(id){tasks.delete(id);}};const e=createSoundComposition({timers,onScore:frame=>{frames.push(frame);return true;},enableAudio:async()=>true,...options});return {e,frames,tasks,tick(){const [id,task]=tasks.entries().next().value;tasks.delete(id);task.fn();}};}
test('continuous seeded generation and playback are independently explicit, bounded and reproducible',async()=>{
 const a=fixture(),b=fixture();assert.equal(a.e.snapshot().audio_enabled,false);assert.equal(a.tasks.size,0);
 assert.throws(()=>a.e.startGeneration());a.e.startGeneration({confirmed:true});b.e.startGeneration({confirmed:true});
 assert.equal(a.e.snapshot().generating,true);assert.equal(a.frames.length,0);assert.equal(a.tasks.size,1);
 for(let i=0;i<40;i++){a.tick();b.tick();assert.deepEqual(a.e.snapshot().layers,b.e.snapshot().layers);}
 await a.e.enableAudio({confirmed:true});assert.equal(a.frames.length,1);assert.equal(a.e.snapshot().audio_enabled,true);
 assert.equal(a.e.snapshot().source_kind,'procedural-composition');assert.equal(a.e.snapshot().layers.filter(l=>l.active).length,4);
 a.e.dispose();b.e.dispose();assert.equal(a.tasks.size,0);
});
test('spatial positions gain mute and mono take effect without losing source or exceeding bounds',async()=>{
 const f=fixture();await f.e.enableAudio({confirmed:true});f.e.setLayer('layer-1',{position:{x:-.8,y:.2},gain:.2,muted:true});
 assert.equal(f.frames.at(-1).layers[1].gain,.2);assert.equal(f.frames.at(-1).layers[1].muted,true);
 f.e.setMix({density:1,rate:30,mono:true});assert.ok(f.frames.at(-1).layers.every(l=>l.pan===0));
 f.e.setMix({density:0});assert.equal(f.e.snapshot().layers.filter(l=>l.active).length,0);
 for(const patch of [{density:NaN},{density:2},{rate:0},{mono:'yes'},{play:true}])assert.throws(()=>f.e.setMix(patch));
 assert.throws(()=>f.e.setLayer('layer-1',{position:{x:2,y:0}}));f.e.dispose();
});
test('Feather cancels timer, output and stale async enable; confirmed release never resumes',async()=>{
 let release;const f=fixture({enableAudio:()=>new Promise(r=>release=r)});
 f.e.startGeneration({confirmed:true});const pending=f.e.enableAudio({confirmed:true});f.e.feather();release(true);await pending;
 assert.equal(f.tasks.size,0);assert.equal(f.e.snapshot().audio_enabled,false);assert.equal(f.e.snapshot().generating,false);
 assert.throws(()=>f.e.startGeneration({confirmed:true}));assert.throws(()=>f.e.releaseFeather());
 f.e.releaseFeather({confirmed:true});assert.equal(f.e.snapshot().generating,false);assert.equal(f.e.snapshot().audio_enabled,false);f.e.dispose();
});
test('return restores exact reproducible score paused with Feather retained and rejects corrupt receipts',()=>{
 const a=fixture(),b=fixture();a.e.startGeneration({confirmed:true});a.tick();a.e.setLayer('layer-0',{gain:.3});const receipt=a.e.checkpoint();
 b.e.restore(receipt);assert.deepEqual(b.e.snapshot().layers,a.e.snapshot().layers);assert.equal(b.e.snapshot().generating,false);assert.equal(b.e.snapshot().audio_enabled,false);
 b.e.feather();b.e.restore(receipt);assert.equal(b.e.snapshot().feather_stopped,true);
 assert.throws(()=>b.e.restore({...receipt,intent:{...receipt.intent,seed:NaN}}));a.e.dispose();b.e.dispose();
});
test('proposal changes only source-labelled intent, rejects replay/source/session/credential extensions',()=>{
 const a=fixture(),b=fixture({region:'wayglass-arcsweep'}),session='12345678-abcd-1234-abcd-123456789abc';
 a.e.setMix({density:.75});const proposal=a.e.createProposal({session});assert.equal(isSoundCompositionProposal(proposal),true);
 b.e.applyProposal(proposal,{session,expectedSource:'wayglass-watercolor'});assert.equal(b.e.snapshot().density,.75);assert.equal(b.e.snapshot().generating,false);assert.equal(b.e.snapshot().audio_enabled,false);
 assert.throws(()=>b.e.applyProposal(proposal,{session,expectedSource:'wayglass-watercolor'}),/Replayed/);
 assert.throws(()=>b.e.applyProposal(a.e.createProposal({session}),{session:'other',expectedSource:'wayglass-watercolor'}));
 assert.equal(isSoundCompositionProposal({...proposal,token:'secret'}),false);assert.equal(isSoundCompositionProposal({...proposal,intent:{...proposal.intent,start:true}}),false);
 a.e.dispose();b.e.dispose();
});
test('different world scene roots evolve while original intent input remains immutable',()=>{
 const f=fixture();const scene={id:'luna',root_hz:432,source_ref:'apps/arcsweep/src/story-soundscape.js#resolveWorldTone'};f.e.setScene(scene);scene.root_hz=99;
 assert.equal(f.e.snapshot().scene.root_hz,432);f.e.startGeneration({confirmed:true});const first=f.e.snapshot().layers;f.tick();assert.notDeepEqual(f.e.snapshot().layers,first);
 assert.equal(f.e.snapshot().scene.root_hz,432);assert.throws(()=>scoreForComposition({...f.e.checkpoint().intent,sequence:-1}));f.e.dispose();
});
function programScore(){return {layers:[{id:'layer-0',kind:'tone',frequency_hz:432,gain:.035,amplitude:.035,duration_s:8,position:{x:-.5,y:0},source_ref:'owner:explicit-wyrdrune-score',active:true},{id:'layer-1',kind:'tone',frequency_hz:440,gain:.025,amplitude:.025,duration_s:8,position:{x:.5,y:0},source_ref:'owner:explicit-wyrdrune-score',active:true}],provenance:{sourceHash:'fixture-source-hash',anchor:{held:'unchanged'},execution:'explicit-fixture'}};}
test('authoritative provider is single-flight and has no procedural fallback while pending or missing input',async()=>{
 let calls=0,finish,signal;const f=fixture();f.e.setScoreProvider(async request=>{calls++;signal=request.signal;return await new Promise(r=>finish=r);},{sourceKind:'wyrdrune-program'});
 f.e.startGeneration({confirmed:true});await Promise.resolve();assert.equal(calls,1);assert.equal(f.e.snapshot().layers.length,0);assert.equal(f.e.snapshot().score_status,'pending');
 void f.e.advance();assert.equal(calls,1);await assert.rejects(f.e.enableAudio({confirmed:true}),/Source program evaluation/);
 finish(programScore());await f.e.waitForScore();assert.equal(f.e.snapshot().layers.length,2);assert.equal(f.e.snapshot().layers[0].frequency_hz,432);assert.equal(f.e.snapshot().layers[0].amplitude,.035);assert.equal(signal.aborted,false);
 f.e.setLayer('layer-0',{gain:.5});assert.equal(f.e.snapshot().layers[0].amplitude,.0175);assert.equal(f.e.snapshot().layers[0].frequency_hz,432);
 f.e.setScoreProvider(async()=>{throw new Error('declared-affinity-required');});await f.e.waitForScore();assert.equal(f.e.snapshot().layers.length,0);assert.equal(f.e.snapshot().last_error,'declared-affinity-required');assert.equal(f.e.snapshot().audio_enabled,false);f.e.dispose();
});
test('Feather aborts authoritative evaluation and stale completions cannot restore sound or score',async()=>{
 let finish,signal;const f=fixture();f.e.setScoreProvider(async request=>{signal=request.signal;return await new Promise(r=>finish=r);});f.e.startGeneration({confirmed:true});await Promise.resolve();const pending=f.e.waitForScore();f.e.feather();assert.equal(signal.aborted,true);finish(programScore());await pending;assert.equal(f.e.snapshot().layers.length,0);assert.equal(f.e.snapshot().audio_enabled,false);assert.equal(f.e.snapshot().generating,false);f.e.dispose();
});
test('source program provenance and anchor survive return without replaying cached score as authority',async()=>{
 const f=fixture();f.e.setScoreProvider(async()=>programScore(),{sourceKind:'wyrdrune-program'});f.e.startGeneration({confirmed:true});await f.e.waitForScore();const checkpoint=f.e.checkpoint(),cold=fixture();cold.e.restore(checkpoint);assert.deepEqual(cold.e.snapshot().program_provenance,programScore().provenance);assert.equal(cold.e.snapshot().source_kind,'wyrdrune-program');assert.equal(cold.e.snapshot().score_status,'return-held');await assert.rejects(cold.e.enableAudio({confirmed:true}),/Source program evaluation/);assert.equal(cold.e.snapshot().generating,false);f.e.dispose();cold.e.dispose();
});
