import test from 'node:test';
import assert from 'node:assert/strict';
import { planNikola27, runNikola27, NIKOLA_27_ARCS } from '../src/math-spine/nikola-spiral-27.js';
import { advanceNikolaSpiral, replayNikolaSpiral, NIKOLA_SPIRAL_MAX_CYCLES } from '../src/math-spine/nikola-upward-spiral.js';

const noWait=async()=>{};
test('27-cycle plan is 3 arcs of 9 each, all inputs synthetic and independently identified',()=>{
 const p=planNikola27();
 assert.equal(p.length,27);
 assert.deepEqual(NIKOLA_27_ARCS.map(a=>[a.start,a.end]),[[1,9],[10,18],[19,27]]);
 assert.deepEqual(p.map(x=>x.arc).filter((v,i,a)=>i===0||v!==a[i-1]),NIKOLA_27_ARCS.map(a=>a.id));
 assert.equal(new Set(p.map(x=>x.source.id)).size,27);
 assert.ok(p.every(x=>x.source.kind==='synthetic'&&x.measurement.value>0));
 assert.equal(NIKOLA_SPIRAL_MAX_CYCLES,27);
});
test('all twenty-seven turns replay as a single uninterrupted receipt chain',async()=>{
 const marks=[];
 const result=await runNikola27({onStep:mark=>marks.push(mark),yieldTurn:noWait});
 assert.equal(result.status,'completed');
 assert.equal(result.completed,27);
 assert.equal(result.timeline.length,27);
 assert.equal(result.state.rounds.length,27);
 assert.equal(result.admitted,19);
 assert.equal(result.held,8);
 assert.equal(result.conflicts_present,true);
 assert.equal(result.epistemic_state,'inconsistent-independent-measurements');
 assert.equal(result.no_model_calls,true);
 assert.equal(result.physical_observation_verified,false);
 assert.equal(result.no_canon_or_identity_mutation,true);
 assert.ok(marks.every((x,i)=>x.cycle===i+1&&x.replay_matched));
 for(let i=1;i<result.state.rounds.length;i++)
   assert.equal(result.state.rounds[i].from_fingerprint,result.state.rounds[i-1].fingerprint);
 assert.equal((await replayNikolaSpiral(result.state)).head_fingerprint,result.final_head_sha256);
 assert.ok(result.state.projection.conditional_state.conflicts.length>=2);
});
test('independently re-running the synthetic 27 script reproduces the exact head hash',async()=>{
 const a=await runNikola27({yieldTurn:noWait});
 const b=await runNikola27({yieldTurn:noWait});
 assert.equal(a.final_head_sha256,b.final_head_sha256);
 assert.deepEqual(a.timeline,b.timeline);
});
test('abort before starting records zero turns and no false completion',async()=>{
 const ctrl=new AbortController();ctrl.abort();
 let count=0;
 const result=await runNikola27({signal:ctrl.signal,onStep:()=>{count++;},yieldTurn:noWait});
 assert.equal(result.status,'stopped');
 assert.equal(result.completed,0);
 assert.equal(count,0);
 assert.equal(result.state.rounds.length,0);
});
test('Feather stop after ninth turn keeps nine verified receipts and skips turn ten',async()=>{
 const ctrl=new AbortController();
 const result=await runNikola27({
   signal:ctrl.signal,yieldTurn:noWait,
   onStep:mark=>{if(mark.cycle===9)ctrl.abort();},
 });
 assert.equal(result.status,'stopped');
 assert.equal(result.completed,9);
 assert.equal(result.state.rounds.length,9);
 assert.equal(result.timeline.at(-1).cycle,9);
 assert.equal((await replayNikolaSpiral(result.state)).matched,true);
 assert.equal(result.epistemic_state,'conditional-on-caller-declared-independent-measurement');
});
test('the 28th attempt is refused, even if it presents a unique apparent source',async()=>{
 const completed=await runNikola27({yieldTurn:noWait});
 await assert.rejects(advanceNikolaSpiral(completed.state,{
   measurement:{kind:'mass',value:8/3,unit:'kg'},
   source:{id:'turn28',family:'new-independent-family',kind:'synthetic'},
 }),/cycle limit/);
});
test('script does not silently promote repeated origin into independent corroboration',async()=>{
 const completed=await runNikola27({yieldTurn:noWait});
 const echoed=completed.timeline.filter(x=>x.status==='held-shared-source-origin');
 assert.equal(echoed.length,8);
 assert.deepEqual(echoed.map(x=>x.cycle),[3,6,9,11,15,18,21,26]);
 assert.equal(completed.state.projection.evidence_state,'inconsistent-independent-measurements');
 assert.match(completed.next_question,/calibration|amended physical model/);
});
test('observer callback failure cannot be reported as completed evidence',async()=>{
 await assert.rejects(runNikola27({yieldTurn:noWait,onStep:()=>{
   throw new Error('synthetic observation callback failure');
 }}),/observation callback failure/);
});
test('callers cannot supply non-functions in place of progress/yield control',async()=>{
 await assert.rejects(runNikola27({onStep:null,yieldTurn:noWait}),/invalid run callback/);
 await assert.rejects(runNikola27({yieldTurn:'skip'}),/invalid run callback/);
});
