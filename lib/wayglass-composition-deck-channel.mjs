import {isSoundCompositionProposal} from './wayglass-sound-composition.mjs';
export const SOUND_PROGRAM_CONTEXT_SCHEMA='wayglass.sound-program-context-proposal/v1';
const regions=new Set(['wayglass-watercolor','wayglass-acoustic','wayglass-arcsweep']);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const label=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\u0000-\u001f]/.test(v);
function validContext(context){return Boolean(exact(context,['voices','affinity'])&&Array.isArray(context.voices)&&context.voices.length===2&&context.voices.every(v=>exact(v,['voice_id','source_ref'])&&label(v.voice_id)&&label(v.source_ref))&&context.voices[0].voice_id!==context.voices[1].voice_id&&exact(context.affinity,['value','source_ref'])&&typeof context.affinity.value==='number'&&Number.isFinite(context.affinity.value)&&context.affinity.value>=0&&context.affinity.value<=1&&label(context.affinity.source_ref));}
export function isSoundProgramContextProposal(value){return Boolean(exact(value,['schema','source','session','sequence','context'])&&value.schema===SOUND_PROGRAM_CONTEXT_SCHEMA&&regions.has(value.source)&&typeof value.session==='string'&&/^[a-f0-9-]{16,64}$/i.test(value.session)&&Number.isSafeInteger(value.sequence)&&value.sequence>=1&&validContext(value.context));}
function captureContext(context){
 const value={voices:context.voices.map(v=>({voice_id:v.voice_id,source_ref:v.source_ref})),affinity:{value:context.affinity.value,source_ref:context.affinity.source_ref}};
 for(const voice of value.voices)Object.freeze(voice);Object.freeze(value.voices);Object.freeze(value.affinity);return Object.freeze(value);
}
// Same-origin proposals only. Declared affinity/voice context is separate from
// score intent; anchors, text, credentials and start/play commands never cross.
export function installCompositionDeckChannel({scope=globalThis,composition,getPeer,getSession,isReady=()=>false,expectedSources=[],getProgramContext,applyProgramContext}={}){
 if(!composition||typeof getPeer!=='function'||typeof getSession!=='function')return()=>{};
 let disposed=false,lastSentGeneration=-1,lastSentContext=null,lastReceivedContext=null;
 const seenContexts=new Map();
 const stopped=()=>{try{return composition.snapshot().feather_stopped!==false;}catch{return true;}};
 const sendCurrent=()=>{
  const peer=getPeer(),session=getSession();if(disposed||stopped()||!isReady()||!peer||!session)return false;
  try{
   const proposal=composition.createProposal({session});if(!isSoundCompositionProposal(proposal))return false;
   peer.postMessage(proposal,scope.location.origin);
   const declared=getProgramContext?.();
   if(validContext(declared)){
    const context=captureContext(declared),signature=session+':'+JSON.stringify(context);
    // Identical declarations do not bounce between two active regions or cause
    // unbounded source-program reevaluation. Original source refs are retained.
    if(signature!==lastSentContext&&JSON.stringify(context)!==lastReceivedContext){
     const message={schema:SOUND_PROGRAM_CONTEXT_SCHEMA,source:proposal.source,session,sequence:proposal.sequence,context};
     peer.postMessage(message,scope.location.origin);lastSentContext=signature;
    }
   }
   return true;
  }catch{return false;}
 };
 const onMessage=event=>{
  const peer=getPeer(),session=getSession(),data=event.data;
  if(disposed||stopped()||!isReady()||!peer||!session||event.origin!==scope.location.origin||event.source!==peer||data?.session!==session||!expectedSources.includes(data?.source))return;
  if(isSoundCompositionProposal(data)){
   try{composition.applyProposal(data,{session,expectedSource:data.source});}catch{/* Replayed score held. */}
  }else if(isSoundProgramContextProposal(data)&&typeof applyProgramContext==='function'){
   const key=data.source+':'+session;
   if(data.sequence<=(seenContexts.get(key)||0))return;
   const context=captureContext(data.context),signature=JSON.stringify(context);
   if(signature===lastReceivedContext){seenContexts.set(key,data.sequence);return;}
   // This injected trusted binding must preserve its local return anchor and
   // leave paused generation/audio off; changing declarations is not a play grant.
   try{const result=applyProgramContext(context,{source:data.source,session,sequence:data.sequence});
    if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});throw new TypeError('Program declaration binding must commit synchronously');}
    seenContexts.set(key,data.sequence);lastReceivedContext=signature;
    if(seenContexts.size>8)seenContexts.delete(seenContexts.keys().next().value);
   }catch{/* Invalid/unavailable binding retains local declarations. */}
  }
 };
 const onProposal=event=>{
  const peer=getPeer(),session=getSession();
  if(disposed||stopped()||!isReady()||!peer||!session||event.detail?.composition!==composition)return;
  if(sendCurrent())event.preventDefault();
 };
 const unsubscribe=composition.subscribe?.(snapshot=>{if(snapshot.generating&&snapshot.sequence!==lastSentGeneration&&(!snapshot.score_status||snapshot.score_status==='source-score-ready')&&sendCurrent())lastSentGeneration=snapshot.sequence;});
 scope.addEventListener('message',onMessage);scope.addEventListener('wayglass:sound-composition-proposal',onProposal);
 return()=>{disposed=true;unsubscribe?.();scope.removeEventListener('message',onMessage);scope.removeEventListener('wayglass:sound-composition-proposal',onProposal);};
}
