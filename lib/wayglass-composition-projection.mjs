import {createPaletteInstrument} from './wayglass-palette-instrument.mjs';
import {soundSampleBank} from './wayglass-sound-sample-bank.mjs';
// Original procedural voices into an EXISTING host bus. Stable layer IDs reuse
// sources between generations; no separate AudioContext or head-tracking claim.
export function createCompositionProjection({getContext,getDestination,canPlay=()=>false,maxVoices=8,sampleBank=soundSampleBank}={}){
 if(typeof getContext!=='function'||typeof getDestination!=='function'||typeof canPlay!=='function'||!Number.isInteger(maxVoices)||maxVoices<1||maxVoices>8)throw new TypeError('Existing audio context and bus required');
 const voices=new Map();let disposed=false,lastFrame=null,renderEpoch=0,lastError=null,timelineOrigin=null;
 const disconnect=node=>{try{node?.disconnect();}catch{}};
 function release(voice){if(voices.get(voice.id)!==voice)return;voices.delete(voice.id);voice.instrument?.dispose();if(voice.source)voice.source.onended=null;try{voice.source?.stop();}catch{}for(const node of voice.nodes)disconnect(node);}
 function stop(){renderEpoch++;lastFrame=null;timelineOrigin=null;for(const voice of [...voices.values()])release(voice);}
 function smooth(param,value,now,seconds=.25){
  if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
  else{param.cancelScheduledValues?.(now);param.setValueAtTime(Number.isFinite(param.value)?param.value:value,now);}
  param.linearRampToValueAtTime(value,now+seconds);
 }
 function spatialize(voice,layer,frame,context,destination){
  const mode=frame.mono?'mono':typeof context.createPanner==='function'?'hrtf':typeof context.createStereoPanner==='function'?'stereo':'direct';
  if(voice.mode!==mode||voice.destination!==destination){
   disconnect(voice.gain);disconnect(voice.panner);voice.nodes=voice.nodes.filter(n=>n!==voice.panner);voice.panner=null;
   if(mode==='hrtf')voice.panner=context.createPanner();else if(mode==='stereo')voice.panner=context.createStereoPanner();
   if(voice.panner){voice.nodes.push(voice.panner);voice.gain.connect(voice.panner);voice.panner.connect(destination);}else voice.gain.connect(destination);
   voice.mode=mode;voice.destination=destination;
  }
  const x=Math.max(-1,Math.min(1,layer.position?.x||0)),depth=Math.max(-1,Math.min(1,layer.position?.y||0));
  if(mode==='hrtf'){
   const p=voice.panner;p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1;p.maxDistance=12;p.rolloffFactor=.5;
   if(p.positionX){smooth(p.positionX,x*4,context.currentTime);smooth(p.positionY,0,context.currentTime);smooth(p.positionZ,depth*4,context.currentTime);}
   else p.setPosition(x*4,0,depth*4);
  }else if(mode==='stereo')smooth(voice.panner.pan,x,context.currentTime);
  return mode==='hrtf'?1:1/(1+Math.abs(depth)*.5);
 }
 function allocate(layer,context){
  const voice={id:layer.id,kind:layer.kind,source:null,gain:null,panner:null,nodes:[],mode:null};voices.set(layer.id,voice);
  const own=node=>{voice.nodes.push(node);return node;};
  try{
   voice.gain=own(context.createGain());voice.gain.gain.setValueAtTime(0,context.currentTime);
   if(layer.palette){
    const token=renderEpoch;voice.paletteKey=JSON.stringify(layer.palette);
    voice.instrument=createPaletteInstrument({context,destination:voice.gain,palette:layer.palette,bank:sampleBank,origin:timelineOrigin,onEnded:()=>release(voice),onReady:()=>{if(!disposed&&token===renderEpoch&&lastFrame&&canPlay())render(lastFrame);}});
   }else if(layer.kind==='texture'&&typeof context.createBufferSource==='function'){
    voice.source=own(context.createBufferSource());const frames=Math.max(1,Math.floor(context.sampleRate)),buffer=context.createBuffer(1,frames,context.sampleRate),data=buffer.getChannelData(0);let seed=layer.seed||1;
    for(let i=0;i<frames;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=((seed>>>0)/2147483648-1)*.25;}
    voice.source.buffer=buffer;voice.source.loop=true;voice.filter=own(context.createBiquadFilter());voice.filter.type='lowpass';voice.filter.Q.value=.6;
    voice.source.connect(voice.filter);voice.filter.connect(voice.gain);
   }else{voice.source=own(context.createOscillator());voice.source.type='sine';voice.source.connect(voice.gain);}
   if(voice.source)voice.source.onended=()=>release(voice);return voice;
  }catch(error){release(voice);throw error;}
 }
 function render(frame){
  if(disposed||canPlay()!==true)return false;
  lastFrame=frame;
  const context=getContext(),destination=getDestination();if(!context||context.state!=='running'||!destination)return false;
  if(timelineOrigin===null)timelineOrigin=context.currentTime;
  const active=frame.layers.filter(l=>l.active&&!l.muted&&l.gain>0).slice(0,maxVoices),ids=new Set(active.map(l=>l.id));
  try{
   for(const voice of voices.values())if(!ids.has(voice.id)){smooth(voice.gain.gain,0,context.currentTime,.05);if(voice.instrument)voice.instrument.stopAt(context.currentTime+.07);else voice.source.stop(context.currentTime+.07);}
   for(const layer of active){
    let voice=voices.get(layer.id),fresh=false;
    if(voice&&(voice.kind!==layer.kind||voice.paletteKey!==(layer.palette?JSON.stringify(layer.palette):undefined))){release(voice);voice=null;}
    if(!voice){if(voices.size>=maxVoices)continue;voice=allocate(layer,context);fresh=true;}
    const now=context.currentTime,duration=Math.min(40,Math.max(1,layer.duration_s));
    const attenuation=spatialize(voice,layer,frame,context,destination),target=Math.min(.04,typeof layer.amplitude==='number'?Math.max(0,layer.amplitude):Math.min(.012,layer.gain*.012))*attenuation;
    smooth(voice.gain.gain,target,now);voice.gain.gain.setValueAtTime(target,now+duration-.35);voice.gain.gain.linearRampToValueAtTime(0,now+duration);
    if(voice.instrument){voice.instrument.render(layer,now,duration);continue;}
    const frequency=voice.filter?.frequency||voice.source.frequency;smooth(frequency,Math.min(4800,Math.max(20,layer.frequency_hz)),now);
    if(fresh)voice.source.start(now);
    // WebAudio's latest stop call replaces the earlier scheduled stop, extending
    // this same bounded source through the next score interval with a tail.
    voice.source.stop(now+duration+.02);
   }
   return true;
  }catch(error){lastError=error.message;stop();return false;}
 }
 return Object.freeze({render,stop,dispose(){stop();disposed=true;},snapshot:()=>({active_voices:voices.size,pending_samples:[...voices.values()].filter(v=>v.instrument?.pending).length,last_error:lastError,max_voices:maxVoices,output:'existing-host-bus',device_calibrated:false,head_tracking:'not-connected'})});
}
