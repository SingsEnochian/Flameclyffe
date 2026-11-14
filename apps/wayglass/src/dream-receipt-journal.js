// Server-side Dreaming receipt boundary: atomic append, revocable authority, cold replay.
// Storage adapter MUST enforce owner scope, uniqueness and transactionality.
// This module deliberately never accepts raw audiovisual bytes, prompts or transcripts.
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
const HASH=/^[a-f0-9]{64}$/i;
const KINDS=new Set(['video','audio','transcription','spatial','image','telemetry']);
const STAGES=new Set(['requested','started','captured','transcribed','verified','interrupted','late-observation','returned']);
function id(value,label){if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' invalid');return value;}
function normalise(event,dream_id){
 if(!event||typeof event!=='object'||Array.isArray(event))throw new TypeError('Event required');
 const event_id=id(event.event_id,'event_id'),stage=id(event.stage,'stage');
 if(!STAGES.has(stage))throw new TypeError('Unknown stage');
 let asset=null;
 if(event.asset!==undefined&&event.asset!==null){
  const a=event.asset;
  if(!a||typeof a!=='object'||!KINDS.has(a.kind)||typeof a.sha256!=='string'||!HASH.test(a.sha256))throw new TypeError('Invalid content-addressed asset');
  asset={asset_id:id(a.asset_id,'asset_id'),kind:a.kind,sha256:a.sha256.toLowerCase()};
 }
 const at_ms=event.at_ms;
 if(!Number.isSafeInteger(at_ms)||at_ms<0)throw new TypeError('Monotonic timestamp required');
 return Object.freeze({schema:'wayglass.dream-receipt/v1',dream_id,event_id,stage,at_ms,asset:Object.freeze(asset),disposition:stage==='late-observation'||stage==='interrupted'?'observed-not-adopted':'dream-local-only'});
}
export function createDreamReceiptJournal({dream_id,owner_id,authorise,store}={}){
 id(dream_id,'dream_id');id(owner_id,'owner_id');
 if(typeof authorise!=='function')throw new TypeError('Authorisation callback required');
 if(!store||typeof store.appendAtomic!=='function'||typeof store.readScoped!=='function')throw new TypeError('Atomic append and scoped read required');
 let feathered=false;
 async function permitted(action){
  if(feathered)throw new Error('Feather: journal closed');
  if(await authorise({owner_id,dream_id,action})!==true)throw new Error('Recording permission denied or revoked');
 }
 async function append(event){
  await permitted('record');
  const receipt=normalise(event,dream_id);
  // Adapter must recheck authority INSIDE its transaction, not trust this preflight.
  const saved=await store.appendAtomic({owner_id,dream_id,receipt,authorise});
  if(feathered)throw new Error('Feather during append: storage outcome uncertain; reconcile by event_id');
  // A late acknowledgement is not permission to adopt a revoked result.\n  if(await authorise({owner_id,dream_id,action:'record'})!==true)throw new Error('Recording revoked after append: storage outcome uncertain; reconcile by event_id');\n  if(!saved||saved.event_id!==receipt.event_id||JSON.stringify(saved)!==JSON.stringify(receipt))throw new Error('Atomic store returned mismatched receipt');
  return saved;
 }
 async function replay(){
  await permitted('read');
  const rows=await store.readScoped({owner_id,dream_id,authorise});
  if(feathered)throw new Error('Feather during replay');\n  if(await authorise({owner_id,dream_id,action:'read'})!==true)throw new Error('Reading revoked during replay');\n  if(!Array.isArray(rows))throw new TypeError('Scoped read must return an array');
  const seen=new Set();
  const receipts=rows.map(row=>{
   const expected=normalise(row,dream_id);
   if(JSON.stringify(expected)!==JSON.stringify(row)||seen.has(row.event_id))throw new Error('Corrupt or duplicated receipt');
   seen.add(row.event_id);return expected;
  });
  return Object.freeze({schema:'wayglass.dream-replay/v1',dream_id,receipts:Object.freeze(receipts),asset_count:receipts.filter(r=>r.asset).length});
 }
 function feather(){feathered=true;}
 return Object.freeze({append,replay,feather});
}
