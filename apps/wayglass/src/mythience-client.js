import {publishWatercolorActivity} from './watercolor-bridge.js';

export const MYTHIENCE_SCHEMA='wayglass.mythience-local-encounter/v1';
const listeners=new Set();
let last=null;
export function mythienceSnapshot(){return last;}
export function subscribeMythience(listener){
  if(typeof listener!=='function')throw new TypeError('Mythience listener required');
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
export function clearMythience(){
  last=null;
  for(const listener of [...listeners]){try{listener(last);}catch{}}
}
export async function proposeMythienceCrossing({request,seeds,signal,fetchImpl=fetch}={}){
  const response=await fetchImpl('/api/v1/wayglass/wyrdrune/mythience-crossing',{
    method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',signal,
    body:JSON.stringify({request,seeds}),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data.error||'Mythience route unavailable').slice(0,240));
  if(!['candidate-returned','denied'].includes(data.status))
    throw new Error('Unrecognised Mythience crossing result');
  // A WTL proposal is not a world crossing, a power grant or a canon update.
  last=Object.freeze({schema:MYTHIENCE_SCHEMA,observed_at:new Date().toISOString(),
    result:data,authority:'local-preview-only',physical_crossing:false,canon_commit:false});
  if(data.status==='candidate-returned'){
    publishWatercolorActivity({kind:'mythience:crossing',actor:'wayglass:mythience-client',
      receipt:{schema:data.schema,receipt_id:data.input_hash},intensity:data.candidate.permeability});
  }
  for(const listener of [...listeners]){try{listener(last);}catch{}}
  return data;
}
