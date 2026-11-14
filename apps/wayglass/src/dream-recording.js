// Dreaming recording manifest. Store only authorised, content-addressed references.
// Persistence is supplied by the server. This module does not claim durable storage.
const MAX_EVENTS=4096;
const ID=/^[a-zA-Z0-9._:-]{1,128}$/;
const validId=(value,name)=>{if(typeof value!=='string'||!ID.test(value))throw new TypeError(name+' invalid');return value;};
const safeAsset=a=>{
 if(!a||typeof a!=='object')throw new TypeError('asset required');
 const kind=validId(a.kind,'kind');
 if(!['video','audio','spatial','image','telemetry'].includes(kind))throw new TypeError('unsupported asset kind');
 const sha256=typeof a.sha256==='string'&&/^[a-f0-9]{64}$/i.test(a.sha256)?a.sha256.toLowerCase():null;
 if(!sha256)throw new TypeError('content hash required');
 return Object.freeze({asset_id:validId(a.asset_id,'asset_id'),kind,sha256,bytes:Number.isSafeInteger(a.bytes)&&a.bytes>=0?a.bytes:null});
};
export function createDreamRecording({dream_id,universe_id,permission,write,read}={}){
 validId(dream_id,'dream_id');validId(universe_id,'universe_id');
 if(permission!==true)throw new Error('Recording requires explicit permission');
 if(typeof write!=='function'||typeof read!=='function')throw new TypeError('Durable write and read adapters required');
 let closed=false;
 async function append(event){
  if(closed)throw new Error('Recording closed');
  if(!event||typeof event!=='object')throw new TypeError('Event required');
  const event_id=validId(event.event_id,'event_id');
  const stage=validId(event.stage,'stage');
  const asset=event.asset?safeAsset(event.asset):null;
  // Never accept raw frames, prompts, audio buffers, credentials or arbitrary event properties.
  const entry=Object.freeze({schema:'wayglass.dream-recording-event/v1',dream_id,universe_id,event_id,stage,asset,disposition:'dream-local-only'});
  const prior=await read(dream_id);
  if(!Array.isArray(prior))throw new TypeError('read must return event array');
  const match=prior.find(e=>e.event_id===event_id);
  if(match){if(JSON.stringify(match)!==JSON.stringify(entry))throw new Error('Conflicting event identity');return match;}
  if(prior.length>=MAX_EVENTS)throw new Error('Recording event limit reached');
  await write(dream_id,Object.freeze([...prior,entry]));
  return entry;
 }
 async function manifest(){
  const events=await read(dream_id);
  if(!Array.isArray(events))throw new TypeError('read must return event array');
  return Object.freeze({schema:'wayglass.dream-recording-manifest/v1',dream_id,universe_id,events:Object.freeze(events.slice()),asset_count:events.filter(e=>e.asset).length});
 }
 function feather(){closed=true;}
 return Object.freeze({append,manifest,feather});
}
