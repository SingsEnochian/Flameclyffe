// Explicitly authorised SF2 transport adapter. No audio engine or clock is assumed.
// Host must supply a synth with send(intent), and schedule(callback, milliseconds).
import {sf2FeatherIntents,validateSf2MidiIntent} from './sf2-control.js';
export function createSonicPlanPlayer({synth,schedule,clearSchedule}={}){
 if(!synth||typeof synth.send!=='function'||typeof schedule!=='function'||typeof clearSchedule!=='function')throw new TypeError('Sonic player requires a synth and cancellable scheduler');
 let active=null,stopped=false;
 const playedEvents=new Set(); // session-local anti-replay; host persists receipts across Return
 const silence=()=>{if(active){clearSchedule(active.timer);active=null;}for(const intent of sf2FeatherIntents())synth.send(intent);};
 return Object.freeze({
  play(plan,{authorised=false,durationMs=240}={}){
   if(!plan||plan.type!=='sf2-plan'||plan.requires_live_synth!==true||authorised!==true||stopped)return Object.freeze({played:false,reason:'not-authorised'});
   if(!Number.isInteger(durationMs)||durationMs<40||durationMs>2000)throw new TypeError('Invalid duration');
   if(!Array.isArray(plan.intents)||plan.intents.length!==2||plan.intents[0].type!=='note-on'||plan.intents[1].type!=='note-off'||plan.intents[0].channel!==plan.intents[1].channel||plan.intents[0].note!==plan.intents[1].note)throw new TypeError('Invalid paired note plan');
   // A forged plan must never reach a live synthesiser merely because it has the right shape.
   const note=validateSf2MidiIntent(plan.intents[0]);
   const off=validateSf2MidiIntent(plan.intents[1]);
   if(note.velocity===0||off.velocity!==0)throw new TypeError('Invalid note-on/off velocity');
   if(typeof plan.event_id!=='string'||!plan.event_id||typeof plan.source_receipt!=='string'||!plan.source_receipt||typeof plan.choice_receipt!=='string'||!plan.choice_receipt||typeof plan.participant_id!=='string'||!plan.participant_id)throw new TypeError('Missing attributable sonic provenance');
   if(playedEvents.has(plan.event_id))return Object.freeze({played:false,reason:'replayed-event'});
   silence();
   // Mark before the transport call to prevent reentrant duplicate dispatch.
   playedEvents.add(plan.event_id);
   try{synth.send(note);}catch(error){silence();throw error;}
   const session={timer:null};
   active=session;
   try{session.timer=schedule(()=>{if(active!==session)return;active=null;synth.send(off);},durationMs);}
   catch(error){silence();throw error;}
   return Object.freeze({played:true,event_id:plan.event_id,source_receipt:plan.source_receipt,choice_receipt:plan.choice_receipt,duration_ms:durationMs});
  },
  feather(){stopped=true;silence();return Object.freeze({stopped:true});},
  reset({ownerAuthorised=false}={}){if(ownerAuthorised!==true)throw new TypeError('Explicit owner authorisation required');silence();stopped=false;},
  snapshot(){return Object.freeze({active:active!==null,feather_latched:stopped,played_event_count:playedEvents.size});}
 });
}
