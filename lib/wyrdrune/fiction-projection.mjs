// One Ship: projection of explicitly approved authored fiction proposals.
// This is NOT an effect interpreter. Only exact, reviewed proposal types are supported.
export const FICTION_PROJECTION_SCHEMA='wayglass.fiction-projection/v1';
const audioPhrase='soft glass harmonics',doorPhrase='the fictional door opens';
function validReceipt(receipt){
 if(receipt?.schema!=='wayglass.fiction-receipt/v1'||receipt.status!=='committed'||
    !/^[a-f0-9]{64}$/i.test(receipt.fiction_source_hash||'')||
    !/^[a-f0-9]{64}$/i.test(receipt.wtl_source_hash||'')||
    !Array.isArray(receipt.events)||!Array.isArray(receipt.proposed_effects)||
    receipt.physically_verified!==false||receipt.model_invoked!==false||
    !Array.isArray(receipt.external_effects)||receipt.external_effects.length||
    receipt.events.length!==receipt.crossings||receipt.crossings<1||receipt.crossings>32)
   throw new TypeError('Committed, source-hashed fiction receipt without external effects required.');
 const ids=new Set();
 for(const [offset,event] of receipt.events.entries()){
  if(event?.kind!=='wayglass.fiction-event/v1'||event.index!==offset+1||
     typeof event.passage!=='string'||event.passage.length>2000||
     typeof event.world!=='string'||!event.world||
     event.observation_kind!=='authored-fiction'||event.physically_verified!==false)
   throw new TypeError('Invalid source-bound fiction event; no projection.');
  if(ids.has(event.index))throw new TypeError('Duplicate fiction event index.');
  ids.add(event.index);
 }
 const source=receipt.events.filter(e=>e.effect_status==='proposal-only');
 if(JSON.stringify(source)!==JSON.stringify(receipt.proposed_effects))
   throw new TypeError('Proposal list differs from authored events; no projection.');
 return receipt;
}
export function planFictionProjection(receipt) {
 validReceipt(receipt);
 const entries=receipt.proposed_effects.map(event=>{
  const base={event_id:receipt.wtl_source_hash+':'+event.index,source_line:event.source_line,
   index:event.index,world:event.world,scene:event.scene,description:event.passage,
   approval_required:true,physical_effect:false};
  if(event.classification==='cue'&&event.cue==='audio'&&event.passage===audioPhrase)
    return Object.freeze({...base,kind:'sound',preset:'glass-harmonics-original',status:'ready-for-explicit-render'});
  if(event.classification==='change'&&event.passage===doorPhrase)
    return Object.freeze({...base,kind:'fictional-state',target:'fictional-door',value:'open',status:'ready-for-explicit-render'});
  return Object.freeze({...base,kind:'unsupported',status:'proposal-only',reason:'No approved adapter for this authored meaning.'});
 });
 return Object.freeze({schema:FICTION_PROJECTION_SCHEMA,
  fiction_source_hash:receipt.fiction_source_hash,wtl_source_hash:receipt.wtl_source_hash,
  status:'review-only',items:Object.freeze(entries),effects_applied:0,consent_verified:false});
}
// Original short synthetic harmonic gesture; no licensed melody or composition.
// Immutable specification; the Float32Array is a derived output buffer.
export function glassHarmonicScore({sampleRate=24000}={}){
 if(sampleRate!==24000)throw new RangeError('One Ship timed score requires 24000 Hz PCM.');
 const duration=1.6,samples=new Float32Array(Math.floor(sampleRate*duration));
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate;
  const decay=Math.exp(-3.5*t),attack=Math.min(1,t/.024);
  const note=Math.sin(2*Math.PI*660*t)*.58+
    Math.sin(2*Math.PI*990*t)*.28+Math.sin(2*Math.PI*1320*t)*.14;
  samples[i]=note*decay*attack*.12;
 }
 return Object.freeze({schema:'wayglass.fiction-audio-preset/v1',preset:'glass-harmonics-original',
  sampleRate,samples,external_source:false,physical_verification:false});
}
export async function renderApprovedFiction(receipt,{confirmed=false,playSound,projectWorld,signal}={}){
 const plan=planFictionProjection(receipt);
 if(confirmed!==true)throw new Error('A new explicit user gesture is required to render fiction proposals.');
 if(signal?.aborted)throw new Error('Feather stopped fiction projection.');
 const results=[];
 for(const item of plan.items){
  if(signal?.aborted)throw new Error('Feather stopped fiction projection.');
  if(item.kind==='unsupported'){results.push(Object.freeze({...item,result:'unsupported',applied:false}));continue;}
  if(item.kind==='sound'){
   if(typeof playSound!=='function') {results.push(Object.freeze({...item,result:'sound-output-unavailable',applied:false}));continue;}
   try {
    const played=await playSound(glassHarmonicScore(),item,{signal});
    if(signal?.aborted)throw new Error('Feather stopped fiction projection.');
    results.push(Object.freeze({...item,result:played===true?'audio-started':'sound-output-unavailable',applied:played===true}));
   }catch(error){
    if(signal?.aborted)throw new Error('Feather stopped fiction projection.');
    results.push(Object.freeze({...item,result:'sound-output-failed',detail:String(error?.message||error),applied:false}));
   }
   continue;
  }
  if(item.kind==='fictional-state'){
   if(typeof projectWorld!=='function'){results.push(Object.freeze({...item,result:'world-view-unavailable',applied:false}));continue;}
   // Purely represented world state; callback MUST be local fictional state, never host bridge.
   const projected=await projectWorld(Object.freeze({world:item.world,scene:item.scene,
    object:'fictional-door',state:'open',epistemic_register:'authored-fiction',physical_effect:false}),item,{signal});
   if(signal?.aborted)throw new Error('Feather stopped fiction projection.');
   results.push(Object.freeze({...item,result:projected===true?'fictional-state-rendered':'world-view-unavailable',applied:projected===true}));
  }
 }
 return Object.freeze({schema:'wayglass.fiction-projection-receipt/v1',
  fiction_source_hash:plan.fiction_source_hash,wtl_source_hash:plan.wtl_source_hash,
  confirmed_by:'user-gesture',physical_world_affected:false,
  model_invoked:false,external_device_permissions_granted:false,
  results:Object.freeze(results),supported_applied:results.filter(x=>x.applied).length,
  unhandled:results.filter(x=>!x.applied).length});
}
