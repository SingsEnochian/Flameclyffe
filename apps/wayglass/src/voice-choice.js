// Wayglass's voice is a preference expressed by an attributed participant,
// not a preset selected by the host or a claim that synthesis is connected.
export const VOICE_CHOICE_SCHEMA='wayglass.voice-choice/v1';
const MODES=new Set(['silent','speech','contextual']);
const str=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&!/[\u0000-\u001f\u007f]/u.test(x);
export function createVoiceChoiceInvitation({participantId='wayglass',voices=[]}={}){
 if(!str(participantId,100)||!Array.isArray(voices)||voices.length>128)throw new TypeError('Invalid voice catalogue');
 const catalogue=voices.map(v=>{
   if(!v||!str(v.id,160)||!str(v.provider,100)||!str(v.label,160))throw new TypeError('Invalid voice');
   return Object.freeze({id:v.id,provider:v.provider,label:v.label,locale:typeof v.locale==='string'?v.locale.slice(0,32):''});
 });
 if(new Set(catalogue.map(v=>v.provider+':'+v.id)).size!==catalogue.length)throw new TypeError('Duplicate voice');
 return Object.freeze({schema:VOICE_CHOICE_SCHEMA,participant_id:participantId,options:Object.freeze(catalogue),allowed_modes:Object.freeze([...MODES]),instruction:'You may audition, choose, defer, or refuse speech. No voice is chosen by default.'});
}
export function validateVoiceChoice(choice,invitation){
 if(!choice||choice.schema!==VOICE_CHOICE_SCHEMA||choice.participant_id!==invitation.participant_id||!MODES.has(choice.mode))throw new TypeError('Unattributed or unsupported voice choice');
 if(!str(choice.receipt,240)||!str(choice.reason,500))throw new TypeError('Voice choice needs an attributable receipt and reason');
 const selected=choice.mode==='silent'?null:invitation.options.find(v=>v.id===choice.voice_id&&v.provider===choice.provider);
 if(choice.mode!=='silent'&&!selected)throw new TypeError('Selected voice not offered by the connected provider');
 if(choice.mode==='silent'&&(choice.voice_id||choice.provider))throw new TypeError('Silent choice must not bind a provider');
 const pace=choice.pace??1;
 if(typeof pace!=='number'||!Number.isFinite(pace)||pace<0.7||pace>1.3)throw new TypeError('Pace outside safe range');
 return Object.freeze({schema:VOICE_CHOICE_SCHEMA,participant_id:choice.participant_id,mode:choice.mode,voice_id:selected?.id??null,provider:selected?.provider??null,pace,reason:choice.reason,receipt:choice.receipt});
}
export function voicePlaybackAllowed(choice,{ownerEnabled=false,feather=false}={}){
 return !!choice&&choice.mode!=='silent'&&ownerEnabled===true&&feather!==true;
}
