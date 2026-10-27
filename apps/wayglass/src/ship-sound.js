/**
 * Local mono-safe Web Audio sound desk. Explicit start/stop and global
 * Feather halt. Music is aesthetic ambience, never neuromodulation or a
 * medical treatment. No external files, auto-play, or microphone.
 */
export const SHIP_SOUND_SCHEMA='wayglass.ship-soundscape/v1';
export const SOUNDS=Object.freeze(['silence','deep-space','rain','starwell']);
export function createShipSoundDesk({
 AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,
 events=globalThis
}={}){
 let ctx=null,voices=[],gain=null,mode='silence',held=false;
 function snapshot(){return Object.freeze({schema:SHIP_SOUND_SCHEMA,
  mode,active:mode!=='silence',held,mono_safe:true,external_transport:false,
  device_capture:false,medical_claim:false})}
 function stop(){
  for(const item of voices){try{item.osc.stop()}catch{}try{item.osc.disconnect()}catch{}}
  voices=[];
  if(gain){try{gain.disconnect()}catch{}gain=null}
  if(ctx){const old=ctx;ctx=null;try{void old.close().catch(()=>{})}catch{}}
  mode='silence';return snapshot();
 }
 function start(choice){
  if(!SOUNDS.includes(choice))throw Error('Unknown ship soundscape');
  if(choice==='silence')return stop();
  if(held)throw Error('Feather held: ship audio unavailable');
  if(!AudioContextClass)throw Error('Web Audio unavailable');
  stop();
  ctx=new AudioContextClass();
  gain=ctx.createGain();
  gain.gain.value=.0001;gain.connect(ctx.destination);
  const patterns={
   'deep-space':[[110,'sine',.32],[165,'sine',.12]],
   'rain':[[196,'triangle',.08],[293.66,'sine',.045]],
   'starwell':[[216,'sine',.23],[324,'sine',.06]]
  };
  for(const [freq,type,level] of patterns[choice]){
   const osc=ctx.createOscillator(),amp=ctx.createGain();
   osc.type=type;osc.frequency.value=freq;
   amp.gain.value=level;osc.connect(amp).connect(gain);
   osc.start();voices.push({osc,amp});
  }
  gain.gain.setValueAtTime(.0001,ctx.currentTime);
  gain.gain.linearRampToValueAtTime(.015,ctx.currentTime+.8);
  mode=choice;return snapshot();
 }
 function feather(event){held=event?.detail?.held===true;if(held)stop()}
 events.addEventListener?.('wayglass:feather',feather);
 return Object.freeze({start,stop,snapshot,destroy(){
  events.removeEventListener?.('wayglass:feather',feather);stop()
 }});
}
export function speakExplicitText(text,{
 synth=globalThis.speechSynthesis,
 Utterance=globalThis.SpeechSynthesisUtterance,
 maxChars=3800
}={}){
 const selected=String(text||'').trim().slice(0,maxChars);
 if(!selected)throw Error('No text selected for speech');
 if(!synth||!Utterance)throw Error('Browser speech synthesis unavailable');
 synth.cancel();const utterance=new Utterance(selected);
 utterance.rate=.95;utterance.volume=.76;synth.speak(utterance);
 return Object.freeze({characters:selected.length,browser_engine:true,
  offline_not_guaranteed:true,identification_verified:false});
}
