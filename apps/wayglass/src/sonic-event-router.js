// Pure Wayglass WTL-semantic-event -> owner-reviewed lexicon -> authorised SF2 intent.
// The returned plan is inert: only a separately authorised local synth may execute it.
import {createProposedSonicLexicon,resolveSonicCue} from './sonic-lexicon.js';
import {createSonicBoopConsent,boopDecision} from './sonic-boop-consent.js';
import {validateSf2Choice,validateSf2MidiIntent,sf2OutputAllowed,sf2FeatherIntents} from './sf2-control.js';
const noteByMeaning=Object.freeze({presence:48,wonder:79,return:60,withness:64});
export function planWayglassSonicEvent(event,{lexicon=createProposedSonicLexicon(),boopConsent=createSonicBoopConsent(),catalogue=[],sf2Choice=null,ownerAudioEnabled=false,audioReady=false,bankAuthorised=false,muted=false,quietMode=false,feather=false}={}){
 if(!event||typeof event.id!=='string'||!event.id||typeof event.source_receipt!=='string'||!event.source_receipt||typeof event.participant_id!=='string'||!event.participant_id)throw new TypeError('Sonic event needs source receipt, id and participant');
 if(feather||event.meaning==='feather')return Object.freeze({type:'stop',event_id:event.id,source_receipt:event.source_receipt,intents:sf2FeatherIntents(),reason:'feather'});
 const cue=resolveSonicCue(lexicon,event.meaning,{ownerAudioEnabled,feather});
 if(cue.type!=='proposed-sketch')return Object.freeze({type:'silent',event_id:event.id,source_receipt:event.source_receipt,reason:cue.type});
 const consent=boopDecision(boopConsent,{audioReady,muted,quietMode,feather,kind:event.meaning==='withness'?'greeting':event.meaning});
 if(!consent.play)return Object.freeze({type:'silent',event_id:event.id,source_receipt:event.source_receipt,reason:consent.reason});
 if(!sf2Choice||!sf2OutputAllowed({ownerEnabled:ownerAudioEnabled,bankAuthorised,feather}))return Object.freeze({type:'silent',event_id:event.id,source_receipt:event.source_receipt,reason:'synth-not-authorised'});
 const choice=validateSf2Choice(sf2Choice,catalogue);
 if(choice.participant_id!==event.participant_id)throw new TypeError('SF2 choice belongs to another participant');
 if(choice.mode==='silent')return Object.freeze({type:'silent',event_id:event.id,source_receipt:event.source_receipt,reason:'participant-chose-silence'});
 const note=noteByMeaning[event.meaning];
 if(note===undefined)return Object.freeze({type:'silent',event_id:event.id,source_receipt:event.source_receipt,reason:'meaning-not-mapped'});
 const intents=Object.freeze([validateSf2MidiIntent({type:'note-on',channel:0,note,velocity:48}),validateSf2MidiIntent({type:'note-off',channel:0,note,velocity:0})]);
 return Object.freeze({type:'sf2-plan',event_id:event.id,source_receipt:event.source_receipt,participant_id:event.participant_id,choice_receipt:choice.receipt,soundfont_id:choice.soundfont_id,bank:choice.bank,program:choice.program,intents,requires_live_synth:true});
}
