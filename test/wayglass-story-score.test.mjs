import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {executeStorySoundScore,createStoryScoreProvider,STORY_SCORE_SOURCE} from '../lib/wayglass-story-score.mjs';
import {STORY_SCORE_IR} from '../lib/wyrdrune/story-score-program.mjs';
const require=createRequire(import.meta.url);const {compile}=require('../lib/wyrdrune/wyrdrune.cjs');
const data=()=>({metrics:{wordCount:32,waterRatio:.5,windRatio:.2,flameRatio:.1,shadowRatio:.25,motionRatio:.4,turns:6,source_ref:'fixture:story-observation'},affinity:{value:.75,source_ref:'fixture:declared-affinity'},anchor:{id:'return-1',unresolved:['wonder-1']},voices:[{voice_id:'voice-a',source_ref:'fixture:declaration-a'},{voice_id:'voice-b',source_ref:'fixture:declaration-b'}]});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
test('owner source is executable unchanged by canonical parser and generated artifact matches',async()=>{
 assert.equal(await readFile(new URL('../scores/wyrdrune/story-soundscape-v0.1.wtl',import.meta.url),'utf8'),STORY_SCORE_SOURCE);
 assert.deepEqual(compile(STORY_SCORE_SOURCE),STORY_SCORE_IR);assert.equal(STORY_SCORE_IR.units.length,2);
});
test('both Möbius cycles execute with sequential reciprocal arithmetic and unchanged return anchor',async()=>{
 const input=data(),before=structuredClone(input);const out=await executeStorySoundScore(input);
 near(out.frames[0].root_hz,187.6);near(out.frames[0].counterpart_hz,245.756);near(out.frames[0].foreground,.019985);near(out.frames[0].atmosphere,.0125);
 near(out.frames[1].root_hz,190.549072);near(out.frames[1].counterpart_hz,248.042588864);
 assert.equal(out.phase_receipts.length,16);assert.deepEqual(out.holds[0],out.holds[1]);assert.deepEqual(out.return_anchor,input.anchor);assert.deepEqual(input,before);
 assert.deepEqual(out.frames[0].voices,out.frames[1].voices);assert.equal(out.model_inference,false);assert.ok(Object.isFrozen(out.return_anchor));
});
test('declared affinity changes interval; absent or invented inputs cannot masquerade as declarations',async()=>{
 const a=data(),b=data();a.affinity.value=0;b.affinity.value=1;
 const [zero,one]=await Promise.all([executeStorySoundScore(a),executeStorySoundScore(b)]);
 near(zero.frames[0].counterpart_hz/zero.frames[0].root_hz,1.22);near(one.frames[0].counterpart_hz/one.frames[0].root_hz,1.34);
 for(const change of [x=>x.affinity=null,x=>x.affinity={value:.5},x=>x.affinity.value=2,x=>x.metrics.windRatio=NaN,x=>x.metrics.wordCount=-1,x=>x.voices[1].voice_id=x.voices[0].voice_id]){
  const input=data();change(input);await assert.rejects(executeStorySoundScore(input));
 }
 await assert.rejects(executeStorySoundScore({...data(),signal:AbortSignal.abort()}),/Feather/);
});
test('WebAudio bridge projects authoritative returned frame as independent source-labelled layers',async()=>{
 const d=data();const provider=createStoryScoreProvider({readStoryMetrics:()=>d.metrics,readParticipantAffinity:()=>d.affinity,readReturnAnchor:()=>d.anchor,voiceSources:d.voices});
 const result=await provider({intent:{rate:30,scene:{id:'world-1'}},sequence:7});
 assert.equal(result.layers.length,4);assert.deepEqual(result.layers.slice(0,2).map(l=>l.voice_source.voice_id),['voice-a','voice-b']);
 near(result.layers[0].frequency_hz,result.provenance.frames[1].root_hz);near(result.layers[1].frequency_hz,result.provenance.frames[1].counterpart_hz);
 near(result.layers[0].amplitude,.019985);assert.ok(result.layers.every(l=>l.duration_s>=32));
});
test('provider snapshots external voice declarations and refuses non-JSON return anchors',async()=>{
 const d=data(),provider=createStoryScoreProvider({readStoryMetrics:()=>d.metrics,readParticipantAffinity:()=>d.affinity,readReturnAnchor:()=>d.anchor,voiceSources:d.voices});
 d.voices[0].voice_id='changed-after-binding';
 const result=await provider({intent:{rate:6},sequence:1});
 assert.equal(result.layers[0].voice_source.voice_id,'voice-a');assert.equal(result.provenance.frames[1].voices[0].voice_id,'voice-a');
 await assert.rejects(executeStorySoundScore({...data(),anchor:{date:new Date()}}),/Plain JSON/);
 await assert.rejects(executeStorySoundScore({...data(),anchor:{number:NaN}}),/Plain JSON/);
});
