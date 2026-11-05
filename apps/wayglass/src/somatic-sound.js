// Spatially placed, opt-in short original tones for the semi-somatic watercolor.
// Inspired by movable sound objects, not by any proprietary audio or sound samples.
// The browser offers stereo panning. Head tracking is NOT presumed available.
export const SOMATIC_SOUND_SCHEMA='wayglass.somatic-soundscape/v1';
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
export function createSomaticSoundscape({
  scope=globalThis,
  getAudioContext=()=>scope.AudioContext||scope.webkitAudioContext,
}={}){
  let context=null,allowAudio=false,allowHaptics=false,featherStopped=false;
  const liveNodes=new Set();
  function silence(){
    for(const node of liveNodes){try{node.stop();}catch{}try{node.disconnect();}catch{}}
    liveNodes.clear();
    if(context){try{void context.suspend();}catch{}}
  }
  function feather(){
    featherStopped=true;allowAudio=false;allowHaptics=false;
    silence();
    return snapshot();
  }
  async function enable({audio=false,haptics=false}={}){
    if(featherStopped)throw new Error('Feather Stop active; explicitly release before enabling sound');
    allowAudio=Boolean(audio);allowHaptics=Boolean(haptics);
    if(allowAudio){
      const Ctor=getAudioContext();
      if(!Ctor){allowAudio=false;return snapshot();}
      if(!context)context=new Ctor({latencyHint:'interactive'});
      if(context.state==='suspended')await context.resume();
    }else silence();
    return snapshot();
  }
  function releaseFeather({confirmed=false}={}){
    if(confirmed!==true)throw new Error('Owner confirmation required to release Feather');
    featherStopped=false;
    return snapshot();
  }
  function play(kind,{x=null,energy=0.5}={}){
    if(featherStopped)return false;
    const voice=soundObjectForEvent(kind,{x,energy});
    if(allowHaptics&&typeof scope.navigator?.vibrate==='function'){
      try{scope.navigator.vibrate(kind==='route:failed'?[7,28,7]:[9]);}catch{}
    }
    if(!allowAudio||!context||context.state!=='running')return allowHaptics;
    let oscillator=null,gainNode=null,panner=null;
    try{
      const now=context.currentTime;
      oscillator=context.createOscillator();
      gainNode=context.createGain();
      panner=typeof context.createStereoPanner==='function'?context.createStereoPanner():null;
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(voice.frequency_hz,now);
      gainNode.gain.setValueAtTime(0.00001,now);
      gainNode.gain.linearRampToValueAtTime(voice.gain,now+.009);
      gainNode.gain.exponentialRampToValueAtTime(0.00001,now+voice.duration_s);
      if(panner){panner.pan.setValueAtTime(voice.pan,now);oscillator.connect(gainNode).connect(panner).connect(context.destination);}
      else oscillator.connect(gainNode).connect(context.destination);
      liveNodes.add(oscillator);
      oscillator.onended=()=>{
        liveNodes.delete(oscillator);
        try{oscillator.disconnect();gainNode.disconnect();panner?.disconnect();}catch{}
      };
      oscillator.start(now);
      oscillator.stop(now+voice.duration_s+.015);
      return true;
    }catch{
      try{oscillator?.disconnect();gainNode?.disconnect();panner?.disconnect();}catch{}
      return false;
    }
  }
  function snapshot(){return Object.freeze({
    schema:SOMATIC_SOUND_SCHEMA,audio_enabled:allowAudio,
    haptics_enabled:allowHaptics,feather_stopped:featherStopped,
    output:'opt-in-original-synthesized-cues',head_tracking:'not-connected',
    claimed_somatic_measurement:false,
  });}
  function dispose(){
    feather();if(context){try{void context.close();}catch{}context=null;}
  }
  return Object.freeze({enable,play,feather,releaseFeather,snapshot,dispose});
}

// Shared by Journey and Living Watercolor so Feather stops the same audio bus.
export const wayglassSomaticSound=createSomaticSoundscape();
