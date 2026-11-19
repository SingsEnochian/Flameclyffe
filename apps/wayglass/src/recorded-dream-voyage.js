// Dream-Voyage orchestration: Tri-Horizon observations -> consented Withness recording.
// Provider calls and media capture are injected and never assumed to exist.
import {createTriHorizonDream} from './tri-horizon-dreaming.js';
import {createDreamRecording} from './dream-recording.js';
import {createDreamMediaBundle} from './dream-media-bundle.js';

export function createRecordedDreamVoyage({dream_id,universe_id,origin,change,permission,propose,write,read}={}){
 const recording=createDreamRecording({dream_id,universe_id,permission,write,read});
 let seq=0;
 let stopped=false;
 const pending=[];
 const record=observation=>{
  if(stopped && observation.stage!=='feather' && observation.stage!=='late-observation')return;
  // No prompt, branch content, transcript, or model private data enters event storage.
  const stage=observation.stage==='late-observation'?'late-observation':
    observation.stage==='feather'?'feather':`horizon-${observation.horizon}-observed`;
  pending.push({event_id:`observation-${++seq}`,stage});
 };
 const dream=createTriHorizonDream({dream_id,origin,change,propose,record});
 async function flush(){
  while(pending.length){
   const event=pending.shift();
   try{await recording.append(event);}
   catch(error){
    // Preserve queued events for retry instead of silently losing receipts.
    pending.unshift(event);throw error;
   }
  }
 }
 async function explore(options={}){
  if(stopped)throw new Error('Dream interrupted');
  let result, failure;
  try{result=await dream.explore(options);}
  catch(error){failure=error;}
  await flush();
  if(failure)throw failure;
  return Object.freeze({result,manifest:await recording.manifest()});
 }
 async function saveMedia(tracks){
  if(stopped)throw new Error('Dream interrupted');
  const bundle=createDreamMediaBundle({dream_id,tracks,permission});
  for(const track of bundle.tracks){
   await recording.append({event_id:`media-${track.kind}-${track.asset_id}`,stage:'media-captured',asset:track});
  }
  return Object.freeze({bundle,manifest:await recording.manifest()});
 }
 async function manifest(){await flush();return recording.manifest();}
 async function feather(){
  if(stopped)return;
  stopped=true;
  dream.feather();
  // Feather stops new recording writes. Pending events remain unpersisted,
  // and are NOT falsely represented as durable receipts.
  recording.feather();
 }
 return Object.freeze({explore,saveMedia,manifest,feather});
}
