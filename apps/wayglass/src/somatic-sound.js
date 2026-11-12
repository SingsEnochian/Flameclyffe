import {createSoundComposition} from '../../../lib/wayglass-sound-composition.mjs';
import {createCompositionProjection} from '../../../lib/wayglass-composition-projection.mjs';
// Spatially placed, opt-in short original tones for the semi-somatic watercolor.
// Inspired by movable sound objects, not by any proprietary audio or sound samples.
// The browser offers stereo panning. Head tracking is NOT presumed available.
export const SOMATIC_SOUND_SCHEMA='wayglass.somatic-soundscape/v1';
// Shared stop/release event. Releasing Feather never enables audio or haptics.
export const WAYGLASS_FEATHER_EVENT='wayglass:feather';
export const SOUND_EVENTS=Object.freeze({
  'agent:active':{hz:246,pan:-0.35,velocity:0.3,duration:0.13},
  'route:pending':{hz:220,pan:-0.55,velocity:0.25,duration:0.16},
  'route:responded':{hz:392,pan:0.4,velocity:0.45,duration:0.19},
  'route:failed':{hz:185,pan:-0.65,velocity:0.20,duration:0.16},
  'waygate:return':{hz:330,pan:0,velocity:0.4,duration:0.2},
  'learning:verified':{hz:440,pan:0.45,velocity:0.45,duration:0.17},
  'touch:suggestion':{hz:294,pan:0,velocity:0.19,duration:0.11},
  'fold:compass':{hz:330,pan:-0.5,velocity:0.24,duration:0.12},
  'fold:witness':{hz:392,pan:0.5,velocity:0.24,duration:0.12},
  'fold:hearth':{hz:261.63,pan:0,velocity:0.24,duration:0.18},
  'chamber:changed':{hz:293.66,pan:0,velocity:0.23,duration:0.15},
});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function soundObjectForEvent(kind,{x=null,energy=0.5}={}){
  if(!Object.hasOwn(SOUND_EVENTS,kind))throw new TypeError('Unknown sound event');
  const item=SOUND_EVENTS[kind];
  if(!item)throw new TypeError('Unknown sound event');
  if(x!==null && (typeof x!=='number'||!Number.isFinite(x)))throw new TypeError('Finite sound position required');
  if(typeof energy!=='number'||!Number.isFinite(energy))throw new TypeError('Finite sound energy required');
  return Object.freeze({
    schema:'wayglass.spatial-sound-object/v1',
    kind,frequency_hz:item.hz,
    pan:clamp(x===null?item.pan:(x-.5)*2,-1,1),
    duration_s:item.duration,
    gain:clamp(item.velocity*energy*.13,0,.065),
    synthesized:true,epistemic_register:'local-sonification-only',
  });
}
/**
 * Explicit opt-in cue desk. enable({audio,haptics,mono}) starts only chosen channels;
 * setMono changes projection, stop supports room teardown, dispose is terminal.
 * feather/releaseFeather broadcast WAYGLASS_FEATHER_EVENT across mounted surfaces.
 * Confirmed release clears the latch while both output channels remain off.
 */
export function createSomaticSoundscape({
  scope=globalThis,
  getAudioContext=()=>scope.AudioContext||scope.webkitAudioContext,
}={}){
  let context=null,master=null,compressor=null,allowAudio=false,allowHaptics=false,featherStopped=false;
  let mono=false,disposed=false,epoch=0,lastError=null,featherReleaseConfirmed=false;
  const liveNodes=new Set();
  const compositionProjection=createCompositionProjection({getContext:()=>context,getDestination:()=>master,canPlay:()=>context?.state==='running'&&!featherStopped&&!disposed});
  const composition=createSoundComposition({region:'wayglass-watercolor',eventScope:scope,source_ref:'apps/wayglass/src/somatic-sound.js',onScore:frame=>{setMono(frame.mono);return compositionProjection.render(frame);},
    enableAudio:async()=>{await enable({audio:true,mono:composition.snapshot().mono});return allowAudio;},stopAudio:()=>compositionProjection.stop()});
  const safeAsync=fn=>{try{Promise.resolve(fn()).catch(()=>{});}catch{}};
  const disconnect=node=>{try{node?.disconnect();}catch{}};
  function releaseVoice(voice){
    liveNodes.delete(voice);
    if(voice.oscillator){voice.oscillator.onended=null;try{voice.oscillator.stop();}catch{}}
    if(voice.counterpart){voice.counterpart.onended=null;try{voice.counterpart.stop();}catch{}}
    disconnect(voice.oscillator);disconnect(voice.counterpart);disconnect(voice.gainNode);disconnect(voice.panner);
  }
  function silence(){
    for(const voice of [...liveNodes])releaseVoice(voice);
    if(typeof scope.navigator?.vibrate==='function'){try{scope.navigator.vibrate(0);}catch{}}
    if(context&&!composition.snapshot().audio_enabled)safeAsync(()=>context.suspend());
  }
  function stop(){
    ++epoch;allowAudio=false;allowHaptics=false;silence();return snapshot();
  }
  function broadcast(stopped){
    if(typeof scope.dispatchEvent!=='function')return;
    const detail={stopped,source:'somatic-sound',...(stopped?{}:{confirmed:true})};
    try{
      const Custom=scope.CustomEvent||globalThis.CustomEvent;
      if(typeof Custom==='function')scope.dispatchEvent(new Custom(WAYGLASS_FEATHER_EVENT,{detail}));
      else{
        const EventCtor=scope.Event||globalThis.Event;
        if(typeof EventCtor==='function'){
          const event=new EventCtor(WAYGLASS_FEATHER_EVENT);Object.defineProperty(event,'detail',{value:detail});scope.dispatchEvent(event);
        }
      }
    }catch{}
  }
  function feather({notify=true}={}){
    composition.feather();featherStopped=true;featherReleaseConfirmed=false;allowAudio=false;allowHaptics=false;
    stop();if(notify)broadcast(true);
    return snapshot();
  }
  async function enable({audio=false,haptics=false,mono:nextMono=mono}={}){
    if(disposed)throw new Error('Soundscape disposed');
    if(featherStopped)throw new Error('Feather Stop active; explicitly release before enabling sound');
    const token=++epoch;setMono(nextMono);allowAudio=false;allowHaptics=Boolean(haptics);lastError=null;
    if(!audio){silence();return snapshot();}
    try{
      const Ctor=getAudioContext();if(!Ctor)return snapshot();
      if(!context||context.state==='closed'){
        disconnect(master);disconnect(compressor);master=null;compressor=null;
        context=new Ctor({latencyHint:'interactive'});
      }
      if(context.state!=='running')await context.resume();
      if(disposed||featherStopped||token!==epoch)return snapshot();
      if(!master){
        master=context.createGain();master.gain.setValueAtTime(.8,context.currentTime);
        compressor=context.createDynamicsCompressor();
        compressor.threshold.value=-12;compressor.knee.value=0;compressor.ratio.value=20;
        compressor.attack.value=.003;compressor.release.value=.15;
        master.connect(compressor);compressor.connect(context.destination);
      }
      allowAudio=context.state==='running';
    }catch(error){
      if(token===epoch&&!disposed){allowAudio=false;lastError=String(error?.message||error);silence();disconnect(master);disconnect(compressor);master=null;compressor=null;}
    }
    return snapshot();
  }
  function releaseFeather({confirmed=false,notify=true}={}){
    if(disposed)throw new Error('Soundscape disposed');
    if(confirmed!==true)throw new Error('Owner confirmation required to release Feather');
    stop();composition.releaseFeather({confirmed:true});featherStopped=false;featherReleaseConfirmed=true;if(notify)broadcast(false);
    return snapshot();
  }
  function setMono(value){
    if(disposed)return snapshot();
    mono=Boolean(value);
    if(composition.snapshot().mono!==mono)composition.setMix({mono});
    for(const voice of liveNodes){if(voice.panner)voice.panner.pan.setValueAtTime(mono?0:voice.pan,context.currentTime);}
    return snapshot();
  }
  function play(kind,{x=null,energy=0.5}={}){
    if(featherStopped||disposed)return false;
    const voice=soundObjectForEvent(kind,{x,energy});
    if(allowHaptics&&typeof scope.navigator?.vibrate==='function'){
      try{scope.navigator.vibrate(kind==='route:failed'?[7,28,7]:[9]);}catch{}
    }
    if(!allowAudio||!context||context.state!=='running')return allowHaptics;
    if(liveNodes.size>=4)return false;
    const nodes={oscillator:null,gainNode:null,panner:null,pan:voice.pan};
    liveNodes.add(nodes);
    try{
      const now=context.currentTime;
      nodes.oscillator=context.createOscillator();
      nodes.gainNode=context.createGain();
      nodes.panner=typeof context.createStereoPanner==='function'?context.createStereoPanner():null;
      const {oscillator,gainNode,panner}=nodes;
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(voice.frequency_hz,now);
      gainNode.gain.setValueAtTime(0.00001,now);
      gainNode.gain.linearRampToValueAtTime(voice.gain,now+.009);
      gainNode.gain.exponentialRampToValueAtTime(0.00001,now+voice.duration_s);
      if(panner){panner.pan.setValueAtTime(mono?0:voice.pan,now);oscillator.connect(gainNode).connect(panner).connect(master);}
      else oscillator.connect(gainNode).connect(master);
      oscillator.onended=()=>releaseVoice(nodes);
      oscillator.start(now);
      oscillator.stop(now+voice.duration_s+.015);
      return true;
    }catch{
      releaseVoice(nodes);
      return false;
    }
  }
  // Two voices supplied by a validated executable Wyrdrune score.
  // This function never starts AudioContext, never overrides Feather, and
  // never promotes local score values to environmental measurements.
  function playExpression(frame){
    if(disposed||featherStopped)return false;
    if(frame?.schema!=='wayglass.wyrdrune-mythience-expression/v1')throw new TypeError('Verified Wyrdrune expression required');
    const bounded=(value,min,max,name)=>{
      if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
        throw new RangeError('Invalid Wyrdrune '+name);
      return value;
    };
    const frequency=bounded(frame.frequency_hz,100,880,'frequency');
    const counterpart=bounded(frame.counterpart_hz,100,1000,'counterpart');
    const pan=bounded(frame.pan,-1,1,'pan');
    const pulse=bounded(frame.pulse,0,1,'pulse');
    if(!allowAudio||!context||context.state!=='running'||liveNodes.size>=4)return false;
    const voice={oscillator:null,counterpart:null,gainNode:null,panner:null,pan};
    liveNodes.add(voice);
    try{
      const now=context.currentTime,duration=.15+pulse*.17;
      voice.oscillator=context.createOscillator();
      voice.counterpart=context.createOscillator();
      voice.gainNode=context.createGain();
      voice.panner=typeof context.createStereoPanner==='function'?context.createStereoPanner():null;
      voice.oscillator.type='sine';voice.counterpart.type='sine';
      voice.oscillator.frequency.setValueAtTime(frequency,now);
      voice.counterpart.frequency.setValueAtTime(counterpart,now);
      voice.gainNode.gain.setValueAtTime(.00001,now);
      voice.gainNode.gain.linearRampToValueAtTime(.012,now+.012);
      voice.gainNode.gain.exponentialRampToValueAtTime(.00001,now+duration);
      voice.oscillator.connect(voice.gainNode);
      voice.counterpart.connect(voice.gainNode);
      if(voice.panner){
        voice.panner.pan.setValueAtTime(mono?0:pan,now);
        voice.gainNode.connect(voice.panner).connect(master);
      }else voice.gainNode.connect(master);
      voice.oscillator.onended=()=>releaseVoice(voice);
      voice.oscillator.start(now);voice.counterpart.start(now);
      voice.oscillator.stop(now+duration+.01);voice.counterpart.stop(now+duration+.01);
      return true;
    }catch{releaseVoice(voice);return false;}
  }
  function snapshot(){return Object.freeze({
    schema:SOMATIC_SOUND_SCHEMA,audio_enabled:allowAudio,
    haptics_enabled:allowHaptics,feather_stopped:featherStopped,feather_release_confirmed:featherReleaseConfirmed,mono,disposed,active_voices:liveNodes.size,
    status:disposed?'disposed':featherStopped?'feather-stopped':lastError?'error':allowAudio?context?.state||'running':'stopped',last_error:lastError,
    output:'opt-in-original-synthesized-cues',head_tracking:'not-connected',
    claimed_somatic_measurement:false,
  });}
  function onSharedFeather(event){
    if(disposed)return;
    if(event.detail?.stopped===true)feather({notify:false});
    else if(event.detail?.stopped===false&&event.detail?.confirmed===true)releaseFeather({confirmed:true,notify:false});
  }
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
  function dispose(){
    if(disposed)return;
    disposed=true;stop();composition.dispose();compositionProjection.dispose();scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
    disconnect(master);disconnect(compressor);master=null;compressor=null;
    if(context){const closing=context;context=null;safeAsync(()=>closing.close());}
  }
  return Object.freeze({composition,enable,play,playExpression,stop,setMono,feather,releaseFeather,snapshot,dispose});
}

// Shared by Journey and Living Watercolor so Feather stops the same audio bus.
export const wayglassSomaticSound=createSomaticSoundscape();

