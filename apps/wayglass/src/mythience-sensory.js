// Sound is an opt-in transport of a Wyrdrune result, not a second composition authority.
// Nothing plays on entry, on a model response, or without an explicit user gesture.
const clamp=n=>Math.min(1,Math.max(0,Number.isFinite(Number(n))?Number(n):0));
export function mythienceTone({expression=0,permeability=0}={}){
  const e=clamp(expression),p=clamp(permeability);
  return Object.freeze({rootHz:174+Math.round(e*110),secondHz:261+Math.round(p*110),
    durationSeconds:.34+e*.18,volume:.025+p*.015});
}
export function createMythienceSensory({AudioContextCtor=globalThis.AudioContext||globalThis.webkitAudioContext,
  vibrate=globalThis.navigator?.vibrate?.bind(globalThis.navigator)}={}){
  let context=null,voices=[];
  function stop(){
    for(const voice of voices){try{voice.stop()}catch{}try{voice.disconnect()}catch{}}
    voices=[];try{vibrate?.(0)}catch{}
  }
  async function hear(reading){
    if(!AudioContextCtor)return {played:false,reason:'Audio is unavailable on this device'};
    stop();
    try{
      if(!context)context=new AudioContextCtor();
      if(context.state==='suspended')await context.resume();
      const tone=mythienceTone(reading);
      const now=context.currentTime;
      for(const [hz,weight] of [[tone.rootHz,1],[tone.secondHz,.42]]){
        const osc=context.createOscillator(),gain=context.createGain();
        osc.type='sine';osc.frequency.setValueAtTime(hz,now);
        gain.gain.setValueAtTime(0,now);
        gain.gain.linearRampToValueAtTime(tone.volume*weight,now+.045);
        gain.gain.exponentialRampToValueAtTime(.0001,now+tone.durationSeconds);
        osc.connect(gain);gain.connect(context.destination);
        osc.start(now);osc.stop(now+tone.durationSeconds+.01);
        osc.onended=()=>{try{osc.disconnect();gain.disconnect()}catch{}};
        voices.push(osc);
      }
      return {played:true,tone};
    }catch(error){stop();return {played:false,reason:error?.message||'Audio unavailable'};}
  }
  function feel(reading){
    if(typeof vibrate!=='function')return {felt:false,reason:'Haptics unavailable on this device'};
    const e=clamp(reading?.expression);
    try{return {felt:Boolean(vibrate([25+Math.round(e*30),65,20+Math.round(e*20)]))};}
    catch{return {felt:false,reason:'Haptics unavailable on this device'};}
  }
  async function destroy(){stop();if(context){const c=context;context=null;try{await c.close()}catch{}}}
  return Object.freeze({hear,feel,stop,destroy});
}
