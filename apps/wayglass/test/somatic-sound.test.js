import test from 'node:test';
import assert from 'node:assert/strict';
import {createSomaticSoundscape,soundObjectForEvent,WAYGLASS_FEATHER_EVENT} from '../src/somatic-sound.js';

function fixture({deferred=false,failResume=false,failAllocation=Infinity,noPanner=false,clock=()=>Date.now()}={}){
  const scope=new EventTarget(),haptics=[],contexts=[],nodes=[],resumes=[];
  scope.navigator={vibrate:value=>{haptics.push(value);return true;}};
  let allocations=0;
  class Param{
    constructor(){this.value=0;this.events=[];}
    setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}
    linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);}
    exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exponential',v,t]);}
  }
  function node(type){
    if(++allocations===failAllocation)throw Error('allocation failure');
    const n={typeName:type,connections:[],disconnected:false,connect(to){this.connections.push(to);return to;},disconnect(){this.disconnected=true;this.connections=[];}};
    nodes.push(n);return n;
  }
  class Context{
    constructor(){this.state='suspended';this.currentTime=1;this.destination={};contexts.push(this);if(noPanner)this.createStereoPanner=undefined;}
    resume(){if(failResume)return Promise.reject(Error('device unavailable'));return deferred?new Promise(resolve=>resumes.push(()=>{this.state='running';resolve();})):Promise.resolve().then(()=>{this.state='running';});}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';this.closed=true;return Promise.resolve();}
    createGain(){const n=node('gain');n.gain=new Param();return n;}
    createDynamicsCompressor(){const n=node('compressor');for(const key of ['threshold','knee','ratio','attack','release'])n[key]=new Param();return n;}
    createStereoPanner(){const n=node('panner');n.pan=new Param();return n;}
    createOscillator(){const n=node('oscillator');n.frequency=new Param();n.started=0;n.stopped=0;n.start=()=>n.started++;n.stop=()=>n.stopped++;return n;}
  }
  const sound=createSomaticSoundscape({scope,getAudioContext:()=>Context,now:clock});
  function dispatch(detail){const event=new Event(WAYGLASS_FEATHER_EVENT);Object.defineProperty(event,'detail',{value:detail});scope.dispatchEvent(event);}
  return {sound,scope,haptics,contexts,nodes,resumes,dispatch};
}

test('original tone semantics survive explicit opt-in and conservative output graph',async()=>{
  const f=fixture();assert.equal(f.sound.play('route:responded'),false);assert.equal(f.contexts.length,0);
  await f.sound.enable({audio:true,haptics:true});assert.equal(f.sound.play('route:responded',{x:.8,energy:.5}),true);
  const original=soundObjectForEvent('route:responded',{x:.8,energy:.5});
  assert.equal(original.frequency_hz,392);assert.equal(original.duration_s,.19);assert.equal(original.gain,.45*.5*.13);
  const osc=f.nodes.find(n=>n.typeName==='oscillator');assert.equal(osc.frequency.value,392);
  assert.equal(f.nodes.find(n=>n.typeName==='panner').pan.value,original.pan);
  assert.equal(f.nodes.find(n=>n.typeName==='compressor').ratio.value,20);
  assert.deepEqual(f.haptics.at(-1),[9]);f.sound.dispose();
});
test('unknown and inherited event names cannot generate untyped sound objects',()=>{
  for(const kind of ['unknown','constructor','toString','__proto__'])assert.throws(()=>soundObjectForEvent(kind),/Unknown sound event/);
});
test('mono centres existing and future cues while preserving source pan mapping',async()=>{
  const f=fixture();await f.sound.enable({audio:true});f.sound.play('route:pending');
  const p=f.nodes.find(n=>n.typeName==='panner');assert.equal(p.pan.value,-.55);
  f.sound.setMono(true);assert.equal(p.pan.value,0);
  f.sound.play('fold:witness');assert.equal(f.nodes.filter(n=>n.typeName==='panner').at(-1).pan.value,0);
  f.sound.setMono(false);assert.equal(p.pan.value,-.55);f.sound.dispose();
});
test('Feather during pending resume prevents stale enable and cancels haptics',async()=>{
  const f=fixture({deferred:true});const start=f.sound.enable({audio:true,haptics:true});
  f.sound.feather();f.resumes[0]();const after=await start;
  assert.equal(after.audio_enabled,false);assert.equal(after.haptics_enabled,false);assert.equal(after.feather_stopped,true);
  assert.equal(f.nodes.length,0);assert.equal(f.haptics.at(-1),0);
  await assert.rejects(f.sound.enable({audio:true}),/Feather Stop/);f.sound.dispose();
});
test('shared Feather stops every complete voice and explicit release leaves sound off',async()=>{
  const f=fixture();await f.sound.enable({audio:true,haptics:true});f.sound.play('waygate:return');
  f.dispatch({stopped:true,source:'acoustic-room'});
  assert.equal(f.sound.snapshot().feather_stopped,true);assert.equal(f.sound.snapshot().active_voices,0);
  assert.ok(f.nodes.filter(n=>['oscillator','panner'].includes(n.typeName)).every(n=>n.disconnected));
  assert.equal(f.nodes.filter(n=>n.typeName==='gain')[1].disconnected,true);
  f.dispatch({stopped:false,source:'acoustic-room'});assert.equal(f.sound.snapshot().feather_stopped,true);
  f.dispatch({stopped:false,confirmed:true,source:'acoustic-room'});
  assert.equal(f.sound.snapshot().feather_stopped,false);assert.equal(f.sound.snapshot().audio_enabled,false);
  assert.equal(f.sound.play('waygate:return'),false);f.sound.dispose();
});
test('local Feather broadcasts one stop and one confirmed release without an event loop',()=>{
  const f=fixture(),events=[];f.scope.addEventListener(WAYGLASS_FEATHER_EVENT,event=>events.push(event.detail));
  f.sound.feather();assert.throws(()=>f.sound.releaseFeather(),/Owner confirmation/);
  f.sound.releaseFeather({confirmed:true});assert.equal(events.length,2);
  assert.deepEqual(events.map(e=>e.stopped),[true,false]);assert.equal(events[1].confirmed,true);f.sound.dispose();
});
test('ordinary stop supports room departure and later explicit enable without latching Feather',async()=>{
  const f=fixture();await f.sound.enable({audio:true,haptics:true});f.sound.play('route:failed');
  f.sound.stop();assert.equal(f.sound.snapshot().feather_stopped,false);assert.equal(f.sound.snapshot().audio_enabled,false);
  assert.equal(f.sound.snapshot().haptics_enabled,false);assert.equal(f.sound.snapshot().active_voices,0);
  await f.sound.enable({audio:true});assert.equal(f.sound.play('route:responded'),true);f.sound.dispose();
});
test('dispose during resume is terminal, closes context and detaches shared event listener',async()=>{
  const f=fixture({deferred:true});const start=f.sound.enable({audio:true});f.sound.dispose();f.resumes[0]();await start;
  assert.equal(f.sound.snapshot().disposed,true);assert.equal(f.contexts[0].closed,true);assert.equal(f.nodes.length,0);
  assert.equal(f.sound.play('route:responded'),false);await assert.rejects(f.sound.enable({audio:true}),/disposed/);
  f.dispatch({stopped:true});assert.equal(f.sound.snapshot().feather_stopped,false);
});
test('resume failure leaves audio off and inspectable; unsupported context preserves opted-in haptics',async()=>{
  const f=fixture({failResume:true});const result=await f.sound.enable({audio:true});
  assert.equal(result.audio_enabled,false);assert.equal(result.status,'error');assert.match(result.last_error,/device unavailable/);f.sound.dispose();
  const h=[];const sound=createSomaticSoundscape({scope:{navigator:{vibrate:p=>h.push(p)}},getAudioContext:()=>null});
  await sound.enable({audio:true,haptics:true});assert.equal(sound.play('route:failed'),true);assert.deepEqual(h.at(-1),[7,28,7]);sound.dispose();
});
test('partial signal allocation cleans all allocated voice nodes and permits another cue',async()=>{
  const f=fixture({failAllocation:4});await f.sound.enable({audio:true});assert.equal(f.sound.play('agent:active'),false);
  assert.equal(f.sound.snapshot().active_voices,0);assert.equal(f.nodes.find(n=>n.typeName==='oscillator').disconnected,true);
  assert.equal(f.sound.play('agent:active'),true);f.sound.dispose();
});
test('voice capacity is bounded and ended voices release all audio nodes',async()=>{
  const f=fixture({noPanner:true});await f.sound.enable({audio:true,mono:true});
  for(let i=0;i<4;i++)assert.equal(f.sound.play('agent:active'),true);
  assert.equal(f.sound.play('agent:active'),false);
  const osc=f.nodes.find(n=>n.typeName==='oscillator');osc.onended();assert.equal(f.sound.snapshot().active_voices,3);
  assert.equal(osc.disconnected,true);assert.equal(f.sound.play('agent:active'),true);f.sound.dispose();
});

const mythFrame=Object.freeze({schema:'wayglass.wyrdrune-mythience-expression/v1',
  frequency_hz:220,counterpart_hz:264,pan:.7,pulse:.5});
test('Wyrdrune two-voice sonification requires audio opt-in and uses exact score frequencies',async()=>{
  const f=fixture();assert.equal(f.sound.playExpression(mythFrame),false);
  assert.equal(f.contexts.length,0);
  await f.sound.enable({audio:true,mono:false});
  assert.equal(f.sound.playExpression(mythFrame),true);
  const oscillators=f.nodes.filter(n=>n.typeName==='oscillator');
  assert.deepEqual(oscillators.map(n=>n.frequency.value),[220,264]);
  assert.equal(f.nodes.find(n=>n.typeName==='panner').pan.value,.7);
  assert.equal(f.sound.snapshot().active_voices,1);
  oscillators[0].onended();assert.equal(f.sound.snapshot().active_voices,0);
  assert.ok(oscillators.every(n=>n.disconnected));f.sound.dispose();
});
test('Wyrdrune playback is mono-safe and Feather cuts both voices',async()=>{
  const f=fixture();await f.sound.enable({audio:true,mono:true});
  assert.equal(f.sound.playExpression(mythFrame),true);
  assert.equal(f.nodes.find(n=>n.typeName==='panner').pan.value,0);
  f.sound.feather();assert.equal(f.sound.snapshot().active_voices,0);
  assert.ok(f.nodes.filter(n=>n.typeName==='oscillator').every(n=>n.disconnected));
  assert.equal(f.sound.playExpression(mythFrame),false);
  f.sound.releaseFeather({confirmed:true});
  assert.equal(f.sound.playExpression(mythFrame),false);f.sound.dispose();
});
test('Wyrdrune audio rejects forged or out-of-range frames',async()=>{
  const f=fixture();await f.sound.enable({audio:true});
  for(const frame of [{...mythFrame,schema:'unknown'}, {...mythFrame,frequency_hz:Infinity},
    {...mythFrame,counterpart_hz:20001},{...mythFrame,pan:2}])
    assert.throws(()=>f.sound.playExpression(frame),/Wyrdrune/);
  assert.equal(f.nodes.filter(n=>n.typeName==='oscillator').length,0);f.sound.dispose();
});

test('sensorium haptics are independent, brief, throttled and explicitly opted in',()=>{
  let tick=1000;const f=fixture({clock:()=>tick});
  const frame={...mythFrame,tactile_intensity:.5};
  assert.equal(f.sound.feelExpression(frame),false);
  assert.equal(f.sound.setHaptics(true),true);
  assert.equal(f.contexts.length,0,'vibration does not create an AudioContext');
  assert.equal(f.sound.feelExpression(frame),true);
  const pulse=f.haptics.at(-1);assert.ok(Array.isArray(pulse));
  assert.ok(pulse[0]<=25&&pulse[2]<=25);
  assert.equal(f.sound.feelExpression(frame),false,'no rapid retrigger');
  tick+=350;assert.equal(f.sound.feelExpression(frame),true);
  assert.equal(f.sound.setHaptics(false),false);
  assert.equal(f.sound.feelExpression(frame),false);
  f.sound.dispose();
});
test('Feather stops tactile output and release requires new explicit vibration opt-in',()=>{
  let tick=1000;const f=fixture({clock:()=>tick});
  const frame={...mythFrame,tactile_intensity:.65};
  f.sound.setHaptics(true);assert.equal(f.sound.feelExpression(frame),true);
  f.sound.feather();tick+=500;
  assert.equal(f.haptics.at(-1),0);
  assert.equal(f.sound.feelExpression(frame),false);
  assert.equal(f.sound.setHaptics(true),false);
  f.sound.releaseFeather({confirmed:true});
  assert.equal(f.sound.feelExpression(frame),false);
  assert.equal(f.sound.snapshot().haptics_enabled,false);f.sound.dispose();
});
test('invalid tactile frame is rejected and unsupported devices never claim vibration',()=>{
  const f=fixture();f.sound.setHaptics(true);
  for(const frame of [{...mythFrame,tactile_intensity:Infinity},{...mythFrame,tactile_intensity:2},
    {...mythFrame,tactile_intensity:.5,schema:'forged'}])
    assert.throws(()=>f.sound.feelExpression(frame),/Wyrdrune/);
  f.sound.dispose();
  const scope=new EventTarget();scope.navigator={};
  const sound=createSomaticSoundscape({scope,getAudioContext:()=>null});
  assert.equal(sound.setHaptics(true),false);
  assert.equal(sound.snapshot().haptics_supported,false);
  assert.equal(sound.feelExpression({...mythFrame,tactile_intensity:.5}),false);
  sound.dispose();
});
