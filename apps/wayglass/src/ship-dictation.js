/**
 * Opt-in browser speech recognition in ArcSweep's real composer.
 * SpeechRecognition/webkitSpeechRecognition may use the browser vendor's
 * online speech service. Explicit disclosure is mandatory before Start.
 * No automatic model turn, canon update, storage, or microphone retry.
 */
export const SHIP_DICTATION_SCHEMA='wayglass.ship-dictation/v1';
export function mountShipDictation(root,{
 speechConstructor=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,
 events=globalThis
}={}){
 const composer=root.querySelector('.wg-writing-room .wg-composer');
 const input=composer?.querySelector('#wg-input');
 if(!composer||!input)return()=>{};
 const pane=document.createElement('section');pane.className='wg-ship-dictation';
 pane.setAttribute('aria-label','Speech-to-draft console');
 const disclosure=document.createElement('p');
 disclosure.className='tiny';
 disclosure.textContent='Browser speech recognition. Your browser may process audio through an online service. Spoken words enter an unsent draft only.';
 const control=document.createElement('button');control.type='button';control.className='glass-chip';
 control.textContent='Dictate · Start';
 const status=document.createElement('span');status.className='tiny';
 status.setAttribute('role','status');
 status.textContent=speechConstructor?'Microphone inactive':'Speech recognition unavailable in this browser';
 control.disabled=!speechConstructor;
 pane.append(disclosure,control,status);
 composer.before(pane);
 let active=null,held=false,destroyed=false;
 function close(reason='Stopped'){
  const old=active;active=null;
  if(old){
   try{old.onresult=null;old.onerror=null;old.onend=null;old.stop?.()}catch{}
  }
  if(!destroyed){
   status.textContent=reason;
   control.textContent='Dictate · Start';
   control.disabled=!speechConstructor||held;
  }
 }
 function feather(event){
  held=event?.detail?.held===true;
  if(held)close('Feather held. Dictation stopped. Draft remains unsent.');
  else if(!destroyed){
   control.disabled=!speechConstructor;
   status.textContent='Feather released. Microphone remains off.';
  }
 }
 function click(){
  if(active){close('Dictation stopped. Draft remains unsent.');return}
  if(held||!speechConstructor||destroyed)return;
  const recognizer=new speechConstructor();
  recognizer.lang=globalThis.navigator?.language||'en-US';
  recognizer.continuous=false;recognizer.interimResults=false;
  recognizer.maxAlternatives=1;
  recognizer.onresult=event=>{
   if(destroyed||held||active!==recognizer)return;
   let transcript='';
   for(let i=event.resultIndex||0;i<event.results.length;i++){
    if(event.results[i]?.isFinal){
     transcript+=String(event.results[i]?.[0]?.transcript||'').slice(0,3500)+' ';
    }
   }
   transcript=transcript.trim();
   if(transcript){
    input.value+=(input.value.trim()?'\n':'')+transcript.slice(0,3500);
    status.textContent='Transcribed into unsent draft. Review before sending.';
   }
  };
  recognizer.onerror=event=>{
   if(active===recognizer)close('Recognition stopped: '+String(event.error||'browser error').slice(0,80));
  };
  recognizer.onend=()=>{if(active===recognizer)close('Recognition ended. Nothing transmitted to a Wayglass model.')};
  // Only called within the explicit user click. Browser owns permissions.
  active=recognizer;
  try{
   recognizer.start();
   status.textContent='Browser microphone active. Stop at any time.';
   control.textContent='Dictate · Stop';
  }catch(error){close('Microphone unavailable: '+String(error?.message||error).slice(0,110))}
 }
 control.addEventListener('click',click);
 events.addEventListener?.('wayglass:feather',feather);
 return()=>{
  destroyed=true;close('Disposed');
  control.removeEventListener('click',click);
  events.removeEventListener?.('wayglass:feather',feather);
  pane.remove();
 };
}
