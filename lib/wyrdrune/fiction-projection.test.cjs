const {test}=require('node:test'),assert=require('node:assert/strict');
const native=require('./wyrdrune.cjs');
const fiction=()=>import('./fiction-mobius.mjs'),project=()=>import('./fiction-projection.mjs');
async function receipt(source) {
 const {fictionToWtl,verifyFictionExecution,FICTION_EXAMPLE}=await fiction();
 const p=fictionToWtl(source??FICTION_EXAMPLE,{compile:native.compile});
 const e=await native.execute(p.ir,{principal:{authorized:false},bridges:{}});
 return verifyFictionExecution(p,e);
}
test('explicit projection renders only both accepted example proposals, after committed fiction and gesture',async()=>{
 const {planFictionProjection,renderApprovedFiction}=await project();
 const r=await receipt(),plan=planFictionProjection(r);
 assert.deepEqual(plan.items.map(x=>x.kind),['sound','fictional-state']);
 assert.equal(plan.effects_applied,0);
 assert.equal(plan.consent_verified,false);
 let sounds=0,worlds=0;
 await assert.rejects(()=>renderApprovedFiction(r,{playSound:()=>{sounds++},projectWorld:()=>{worlds++}}),/explicit user gesture/);
 assert.deepEqual([sounds,worlds],[0,0]);
 const result=await renderApprovedFiction(r,{confirmed:true,
   playSound:(score,event)=>{sounds++;assert.equal(score.sampleRate,24000);assert.equal(score.samples.length,38400);assert.equal(event.preset,'glass-harmonics-original');return true;},
   projectWorld:(state)=>{worlds++;assert.deepEqual([state.object,state.state,state.physical_effect],['fictional-door','open',false]);return true;}
 });
 assert.deepEqual([sounds,worlds],[1,1]);
 assert.equal(result.supported_applied,2);
 assert.equal(result.physical_output_attempted,true);
 assert.equal(result.physical_world_affected,null);
 assert.equal(result.physically_verified,false);
});
test('unrecognised image, video, sound and narrative changes never dispatch',async()=>{
 const {renderApprovedFiction}=await project();
 const r=await receipt('::cue image make the moon red\n::cue video open a wormhole\n::cue audio unknown effect\n::change rewrite the real operating system');
 let called=0;
 const result=await renderApprovedFiction(r,{confirmed:true,playSound:()=>{called++},projectWorld:()=>{called++}});
 assert.equal(called,0);assert.equal(result.unhandled,4);
 assert.ok(result.results.every(x=>x.result==='unsupported'));
});
test('tampered events, source hashes or proposal lists cannot reach adapters',async()=>{
 const {planFictionProjection,renderApprovedFiction}=await project();
 const r=await receipt();
 for(const bad of [
  {...r,wtl_source_hash:'broken'},
  {...r,proposed_effects:[]},
  {...r,events:[{...r.events[0],physically_verified:true},...r.events.slice(1)]},
  {...r,external_effects:['something']},
  {...r,status:'rolled-back'}
 ]) {
  assert.throws(()=>planFictionProjection(bad));
  await assert.rejects(()=>renderApprovedFiction(bad,{confirmed:true,playSound:()=>true}));
 }
});
test('Feather before projection permits no output; Feather between sound and state prevents world render',async()=>{
 const {renderApprovedFiction}=await project(),r=await receipt(),c=new AbortController();
 c.abort();let called=0;
 await assert.rejects(()=>renderApprovedFiction(r,{confirmed:true,signal:c.signal,playSound:()=>{called++}}),/Feather/);
 assert.equal(called,0);
 const second=new AbortController();
 await assert.rejects(()=>renderApprovedFiction(r,{confirmed:true,signal:second.signal,
  playSound:()=>{second.abort();return true;},projectWorld:()=>{called++}}),/Feather/);
 assert.equal(called,0);
});
test('sound preset is bounded, deterministic and not copied from a work',async()=>{
 const {glassHarmonicScore}=await project();
 const a=glassHarmonicScore(),b=glassHarmonicScore();
 assert.deepEqual(a.samples,b.samples);
 assert.ok(a.samples.every(n=>Math.abs(n)<=.13&&Number.isFinite(n)));
 assert.throws(()=>glassHarmonicScore({sampleRate:192000}),/24000/);
});

test('cold browser display restore is source-bound, does not replay sound or WTL, and never changes reality',async()=>{
 const {renderApprovedFiction,restoreFictionDisplay}=await project();
 const r=await receipt();
 let play=0,world=0;
 const p=await renderApprovedFiction(r,{confirmed:true,
  playSound:()=>{play++;return true;},
  projectWorld:()=>{world++;return true;}
 });
 const serialized=JSON.parse(JSON.stringify({r,p}));
 const restored=restoreFictionDisplay(serialized.r,serialized.p);
 assert.equal(restored.status,'restored-browser-display-only');
 assert.equal(restored.fictional_door,'open');
 assert.equal(restored.audio_replayed,false);
 assert.equal(restored.wtl_executed_on_restore,false);
 assert.equal(restored.physical_world_affected,false);
 assert.equal(restored.host_attested,false);
 assert.deepEqual([play,world],[1,1],'restore must not re-invoke any sound/state callback');
 for(const bad of [
  {...p,fiction_source_hash:'0'.repeat(64)},
  {...p,wtl_source_hash:'0'.repeat(64)},
  {...p,confirmed_by:'automatic'},
  {...p,results:p.results.map(x=>({...x,applied:true,result:'audio-started'}))},
  {...p,supported_applied:0},
  {...p,physical_world_affected:true}
 ])assert.throws(()=>restoreFictionDisplay(r,bad));
});
test('browser restore of unsupported proposals retains no executable state',async()=>{
 const {renderApprovedFiction,restoreFictionDisplay}=await project();
 const r=await receipt('::cue video show me another universe\n::change change my desktop settings');
 const p=await renderApprovedFiction(r,{confirmed:true});
 const restored=restoreFictionDisplay(r,p);
 assert.equal(restored.fictional_door,'closed');
 assert.equal(restored.external_actions_on_restore,0);
 assert.equal(restored.audio_replayed,false);
});
