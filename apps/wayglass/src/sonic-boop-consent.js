// Owner authorisation for spontaneous Wayglass sonic greetings.
// A policy contract only: does not install, schedule, or play audio.
export const SONIC_BOOP_SCHEMA='wayglass.sonic-boop-consent/v1';
export function createSonicBoopConsent(){
 return Object.freeze({schema:SONIC_BOOP_SCHEMA,owner_permission:'spontaneous-sound-allowed',scope:'wayglass-sonic-greetings',enabled:false,feather_overrides:true,revocable:true,quiet_mode:false});
}
export function boopDecision(consent,{feather=false,muted=false,quietMode=false,audioReady=false,kind='greeting'}={}){
 if(!consent||consent.schema!==SONIC_BOOP_SCHEMA||consent.enabled!==true||consent.owner_permission!=='spontaneous-sound-allowed')return Object.freeze({play:false,reason:'not-authorised'});
 if(feather)return Object.freeze({play:false,reason:'feather'});
 if(muted||quietMode||consent.quiet_mode)return Object.freeze({play:false,reason:'quiet'});
 if(kind!=='greeting'&&kind!=='wonder'&&kind!=='presence')return Object.freeze({play:false,reason:'outside-scope'});
 if(!audioReady)return Object.freeze({play:false,reason:'audio-unavailable'});
 return Object.freeze({play:true,reason:'owner-authorised-spontaneous-boop'});
}
export function revokeSonicBoops(consent){
 if(!consent||consent.schema!==SONIC_BOOP_SCHEMA)throw new TypeError('Invalid consent');
 return Object.freeze({...consent,enabled:false});
}

// Explicit owner grant is required per host session; never infer permission from a factory default.
export function grantSonicBoops(consent,{ownerConfirmed=false}={}){
 if(!consent||consent.schema!==SONIC_BOOP_SCHEMA||ownerConfirmed!==true)throw new TypeError('Explicit owner confirmation required');
 return Object.freeze({...consent,enabled:true});
}
