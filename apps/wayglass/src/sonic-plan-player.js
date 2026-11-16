// Explicitly authorised SF2 transport adapter. No audio engine or clock is assumed.
// Host must supply a synth with send(intent), and schedule(callback, milliseconds).
import {sf2FeatherIntents} from './sf2-control.js';
export function createSonicPlanPlayer({synth,schedule,clearSchedule}={}){
 if(!synth||typeof synth.send!=='function'||typeof schedule!=='function'||typeof clearSchedule!=='function')throw new TypeError('Sonic player requires a synth and cancellable scheduler');
 let active=null,stopped=false;
 const silence=()=>{if(active){clearSchedule(active.timer);active=null;}for(const intent of sf2FeatherIntents())synth.send(intent);};
 return Object.freeze({
  play(plan,{authorised=false,durationMs=240}={}){
   if(!plan||plan.type!=='sf2-plan'||plan.requires_live_synth!==true||authorised!==true||stopped)return Object.freeze({played:false,reason:'not-authorised'});
   if(!Number.isInteger(durationMs)||durationMs<40||durationMs>2000)throw new TypeError('Invalid duration');
   if(!Array.isArray(plan.intents)||plan.intents.length!==2||plan.intents[0].type!=='note-on'||plan.intents[1].type!=='note-off'||plan.intents[0].channel!==plan.intents[1].channel||plan.intents[0].note!==plan.intents[1].note)throw new TypeError('Invalid paired note plan');
   silence();
   const note=plan.intents[0],off=plan.intents[1];
   synth.send(note);
   const session={timer:null};
   active=session;
   try{session.timer=schedule(()=>{if(active!==session)return;active=null;synth.send(off);},durationMs);}
   catch(error){silence();throw error;}
   return Object.freeze({played:true,event_id:plan.event_id,source_receipt:plan.source_receipt,choice_receipt:plan.choice_receipt,duration_ms:durationMs});
  },
  feather(){stopped=true;silence();return Object.freeze({stopped:true});},
  reset({ownerAuthorised=false}={}){if(ownerAuthorised!==true)throw new TypeError('Explicit owner authorisation required');silence();stopped=false;},
  snapshot(){return Object.freeze({active:active!==null,feather_latched:stopped});}
 });
}
