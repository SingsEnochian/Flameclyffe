// Pure musical listening and reply engine. No audio devices or side effects.
// Semitones are MIDI-style integers; deterministic, bounded, and testable.
const INTERVALS=[0,3,4,5,7,8,9,12];
export function listenAndReply(call,{listenerBias=0,previous=60}={}){
 if(!Number.isSafeInteger(call)||call<24||call>96||
 !Number.isSafeInteger(previous)||previous<24||previous>96||
 !Number.isSafeInteger(listenerBias)||listenerBias<0||listenerBias>3)throw Error('Invalid musical context');
 const candidates=[];
 for(const interval of INTERVALS){
  for(const direction of [-1,1]){
   const note=call+interval*direction;
   if(note<24||note>96)continue;
   const voiceLeading=Math.abs(note-previous);
   const consonance=[0,3,4,7,8,9,12].includes(interval)?2:0;
   const score=consonance*4-voiceLeading+(listenerBias===3&&interval===5?3:0);
   candidates.push({note,interval,direction,score});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.note-b.note);
 const selected=candidates[0];
 return Object.freeze({schema:'wayglass.wtl.harmonic-reply.v1',call,response:selected.note,
  interval:Math.abs(selected.note-call),score:selected.score,alternatives:candidates.length,
  provenance:{algorithm:'bounded-consonance-and-voice-leading',human_judgement:false}});
}
export function composeDialogue(call,reply,{beat=0}={}){
 if(!Number.isSafeInteger(beat)||beat<0||beat>15)throw Error('Invalid beat');
 const notes=[call,reply.response,call,reply.response];
 return Object.freeze({schema:'wayglass.wtl.harmonic-dialogue.v1',beat,
  events:notes.map((pitch,i)=>Object.freeze({pitch,at:beat+i*0.25,duration:i===3?0.45:0.2,voice:i%2})),
  provenance:{source:'algorithmic-dialogue',live_audio_verified:false}});
}
