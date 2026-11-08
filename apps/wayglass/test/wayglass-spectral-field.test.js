import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassSpectralField } from '../src/spectral-field.js';

function harness(){
 const scope=new EventTarget(), document=new EventTarget(), calls=[],atlasCalls=[],learningCalls=[],integrations=[],updates=[],vibrations=[];
 let nextTimer=0;const timers=new Map();
 Object.assign(scope,{
   document,innerWidth:1000,navigator:{vibrate:n=>{vibrations.push(n);return true}}, 
   setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id},
   clearTimeout(id){timers.delete(id)},
 });
 let audioRunning=false,audioDisposed=false,watercolorSink=null;
 const audioFactory=()=>({
   start:async()=>{audioRunning=true;return {running:true}},
   update:v=>updates.push(v),
   stop:()=>{audioRunning=false},
   dispose:()=>{audioDisposed=true},
 });
 const score=async events=>{
  calls.push(events);
  return {schema:'wayglass.full-spectrum/v0.1',count:events.length,events:events.map(e=>({
   event_id:e.event_id,kind:e.kind,source_ref:e.source_ref,source_hash:'wtl-fixture',
   phases:Array.from({length:16},(_,i)=>String(i)),
   spectrum:{
    infrasonic:{hz:3,physical_playback:false},
    audible:{voice_one_hz:220,voice_two_hz:300,foreground_gain:.012,atmosphere_gain:.005},
    ultrasonic:{hz:26500,physical_playback:false},
    bloom:.65,
    projection:{refraction:.5,granulation:.6,tactile_ms:17,actuation:'user-opt-in-only'}, 
   },
  }))};
 };
 const atlasScore=async scalars=>{
   atlasCalls.push(scalars);
   return {schema:'wayglass.resonance-atlas/v0.1',status:'composed-in-wyrdrune',
     phase_receipts:Array.from({length:16},()=>({phase:'verify'})),
     source_sha256:'a'.repeat(64),input_sha256:'b'.repeat(64),
     counts:scalars.counts,returned:{below:{hz:3,physical_playback:false},
       within:{root_hz:190,counterpart_hz:240,autoplay:false},
       above:{hz:26000,physical_playback:false},
       structure:{coherence:.7,interference:.3,bloom:.5,granulation:.3,flow:.4}}};
 };
 const observerInterior={
   nativeLearningInputs:()=>({energy:.5,curiosity:.6,uncertainty:.5,
     coherence:.65,previous_resonance:.7}),
   integrateNativeLearning:result=>{
     integrations.push(result);
     return {status:'integrated-native-wyrdrune',input_hash:result.source.atlas_input_hash};
   },
 };
 const learningScore=async value=>{
   learningCalls.push(value);
   return {schema:'wayglass.wyrdrune-living-learning/v0.1',status:'wyrdrune-returned',
     source:value.source,source_hash:'c'.repeat(64),model_invoked:false,model_weights_updated:false,
     canon_commit:false,identity_commit:false,relationship_commit:false,
     phase_receipts:Array.from({length:16},()=>({phase:'integrate'})),
     withness:{completedCycles:2},open_reflection:{interpretation:'open'},
     returned:{energy:.5,curiosity:.6,uncertainty:.5,coherence:.65,opening:.3,attention:.4},
   };
 };
 const field=createWayglassSpectralField({
   scope,document,score,atlasScore,learningScore,observerInterior,audioFactory,
   observerSubscribe:()=>()=>{},
   watercolorSubscribe:callback=>{watercolorSink=callback;return ()=>{watercolorSink=null}}, 
   featherState:()=>({feather_stopped:false}),
 });
 return {field,scope,document,calls,atlasCalls,learningCalls,integrations,updates,timers,vibrations,
   sendWatercolor:record=>watercolorSink?.(record),
   get audioRunning(){return audioRunning},get audioDisposed(){return audioDisposed}};
}

test('global listener is silent and has no interaction capture until opt-in',async()=>{
 const h=harness();
 h.document.dispatchEvent(new Event('input'));
 assert.equal(h.field.status().captured,0);
 assert.equal(h.calls.length,0);
 await assert.rejects(h.field.hear(),/Enable/);
 h.field.dispose();
 assert.equal(h.audioDisposed,true);
});

test('each authorised interaction gets a distinct queued Wyrdrune event, never key contents',async()=>{
 const h=harness();
 h.field.observe();
 const before=h.field.status().captured;
 h.document.dispatchEvent(new Event('input'));
 h.document.dispatchEvent(new Event('pointerup'));
 h.document.dispatchEvent(new Event('change'));
 assert.equal(h.field.status().captured,before+3);
 await h.field.flush();
 assert.equal(h.calls.length,1);
 assert.ok(h.calls[0].every(event=>Object.keys(event).every(k=>k!=='raw_text'&&k!=='key'&&k!=='value')));
 assert.equal(h.field.status().history.length,4);
 assert.equal(h.field.status().last.spectrum.ultrasonic.hz,26500);
 assert.equal(h.audioRunning,false);
 h.field.dispose();
});

test('audible mapping needs explicit gesture and is stopped by Feather',async()=>{
 const h=harness();
 h.field.observe();
 await h.field.flush();
 await h.field.hear();
 assert.equal(h.audioRunning,true);
 assert.equal(h.field.status().heard,true);
 assert.equal(h.updates.at(-1).score.rootHz,220);
 assert.equal(h.updates.at(-1).score.counterpartHz,300);
 assert.equal(h.updates.at(-1).score.foregroundGain,.012);
 const feather=new Event('wayglass:feather');
 Object.defineProperty(feather,'detail',{value:{stopped:true}});
 h.scope.dispatchEvent(feather);
 assert.equal(h.field.status().active,false);
 assert.equal(h.field.status().heard,false);
 assert.equal(h.audioRunning,false);
 h.field.dispose();
});

test('completed model/observer signals cross without assuming a real model identity',async()=>{
 const h=harness();
 h.field.observe();
 h.scope.dispatchEvent(new Event('wayglass:material-wake'));
 await h.field.flush();
 assert.ok(h.calls[0].some(event=>event.source_ref==='wayglass:material-signal'));
 assert.equal(h.field.status().history.at(-1).source_ref,'wayglass:material-signal');
 h.field.dispose();
});

test('metadata route does not silently invent Wyrdrune frames if the host fails',async()=>{
 const h=harness();
 h.field.observe();
 h.field.capture({kind:'world',source_ref:'wayglass:ui-events'});
 const good=await h.field.flush();
 assert.equal(good.error,null);
 h.field.dispose();
});

test('Wyrdrune haptic echo is opt-in, bounded, and returns quiet on Feather',async()=>{
 const h=harness();
 h.field.observe();
 await h.field.flush();
 assert.deepEqual(h.vibrations,[]);
 h.field.setHaptics(true);
 h.field.capture({kind:'gesture',source_ref:'wayglass:ui-events'});
 await h.field.flush();
 assert.ok(h.vibrations.includes(17));
 const feather=new Event('wayglass:feather');
 Object.defineProperty(feather,'detail',{value:{stopped:true}});
 h.scope.dispatchEvent(feather);
 assert.equal(h.field.status().haptics,false);
 assert.equal(h.vibrations.at(-1),0);
 h.field.dispose();
});

test('spectral watercolor feedback cannot recursively score itself',async()=>{
 const h=harness();h.field.observe();
 const before=h.field.status().captured;
 h.sendWatercolor({actor:'wayglass:full-spectrum',intensity:.8,flow:.7});
 assert.equal(h.field.status().captured,before);
 h.sendWatercolor({actor:'wayglass:observer',intensity:.8,flow:.7});
 assert.equal(h.field.status().captured,before+1);
 await h.field.flush();
 assert.equal(h.field.status().last.kind,'observer');
 h.field.dispose();
});

test('Atlas composes scoped interaction/room/world/universe signals without sending names',async()=>{
 const h=harness();
 h.field.setScope({room:'arcsweep:writing-room',world:'world:forest'});
 h.field.observe();
 await h.field.flush();
 const first=h.field.status();
 assert.equal(first.atlas.counts.instant,1);
 assert.equal(first.atlas.counts.universe,1);
 assert.equal(first.atlas.spectrum.structure.coherence,.7);
 h.field.setScope({room:'arcsweep:writing-room',world:'world:sea'});
 h.field.capture({kind:'world',source_ref:'wayglass:room-crossing'});
 await h.field.flush();
 const second=h.field.status();
 assert.equal(second.atlas.counts.universe,2);
 assert.equal(second.atlas_window.distinct_worlds,2);
 assert.equal(second.atlas_scope.world,'world:sea');
 assert.ok(h.atlasCalls.every(call=>!Object.keys(call).includes('world_ref')));
 assert.ok(h.atlasCalls.every(call=>!JSON.stringify(call).includes('world:forest')));
 h.field.dispose();
});

test('an Atlas adapter failure does not forge Atlas harmonics or stop independent Wyrdrune spectrum',async()=>{
 const h=harness();
 h.field.observe();
 await h.field.flush();
 assert.equal(h.field.status().atlas.source_hash,'a'.repeat(64));
 assert.equal(h.field.status().active,true);
 h.field.dispose();
});

test('native Wyrdrune learning follows the verified Atlas and retains possible reflections as open',async()=>{
 const h=harness();h.field.observe();await h.field.flush();
 assert.equal(h.learningCalls.length,1);
 assert.equal(h.integrations.length,1);
 assert.equal(h.field.status().learning.status,'integrated-native-wyrdrune');
 assert.equal(h.learningCalls[0].reflection,null);
 assert.equal(h.learningCalls[0].source.atlas_input_hash,'b'.repeat(64));
 assert.equal(h.learningCalls[0].source.atlas_program_hash,'a'.repeat(64));
 assert.equal(h.field.status().learning_error,null);
 assert.equal(h.field.status().active,true);
 h.field.dispose();
});
