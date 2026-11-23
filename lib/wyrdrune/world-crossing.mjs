// World-Crossing: authored fiction may request embodiment in physical systems.
// This is a host-side capability protocol, not a hardware driver or a claim of
// paranormal causation. A proposal can become a real effect only through an
// authenticated host, explicit consent, a named device, an idempotency ledger,
// an installed capability adapter and independent observation.
import {planFictionProjection} from './fiction-projection.mjs';

export const WORLD_CROSSING_SCHEMA='wayglass.world-crossing/v0.1';
const slug=/^[a-z][a-z0-9_-]{0,39}$/;
const text=(value,label,max=256)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max||
    /[\u0000-\u001f]/.test(value))throw new TypeError('Invalid '+label);
 return value;
};
export function planPhysicalEmbodiment(receipt){
 // Reuse the One Ship fiction integrity gate, even though the legacy local
 // projection classifies embodiment requests as unsupported.
 planFictionProjection(receipt);
 const items=receipt.events.filter(e=>e.classification==='embodiment').map(e=>{
  if(e.effect_status!=='proposal-only'||!slug.test(e.cue||'')||
     typeof e.passage!=='string'||!e.passage.trim()||e.passage.length>1000)
   throw new TypeError('Invalid source-bound physical embodiment proposal.');
  return Object.freeze({
   schema:'wayglass.world-crossing-intent/v0.1',
   event_id:receipt.wtl_source_hash+':'+e.index,
   fiction_source_hash:receipt.fiction_source_hash,
   wtl_source_hash:receipt.wtl_source_hash,
   scene:e.scene,world:e.world,source_line:e.source_line,
   medium:e.cue,intention:e.passage,
   target_realm:'waking-world',
   status:'proposed-awaiting-authorised-capability',
   authored_meaning_not_physical_evidence:true,
   consent_verified:false,device_connected:false,physically_verified:false
  });
 });
 return Object.freeze({
  schema:WORLD_CROSSING_SCHEMA,fiction_source_hash:receipt.fiction_source_hash,
  wtl_source_hash:receipt.wtl_source_hash,status:'proposed',
  items:Object.freeze(items),physical_outputs:0,
  actor_authenticated:false,owner_approval:false,
  mechanism_connected:false,observed_in_waking_world:false
 });
}
/**
 * Trusted host only. Never expose this constructor or its callbacks as a WTL
 * effect, public REST endpoint, browser-input object, or loadable plugin.
 *
 * authenticate: validates the CURRENT signed-in principal, ownership,
 * capability scope, selected device, and fresh owner gesture.
 * reserve: atomically reserves a source-bound action in a durable ledger to
 * prevent duplicate physical actions after Return / process restart.
 * adapters: trusted host-installed capability registry; names are not shell
 * commands, ports, file paths or import specifiers.
 * observe: independent host-managed device/sensor witness (optional).
 */
export function createWorldCrossingHost({authenticate,reserve,adapters,observe}={}){
 if(typeof authenticate!=='function'||typeof reserve!=='function'||
    !(adapters instanceof Map)||adapters.size>64||
    (observe!==undefined&&typeof observe!=='function'))
  throw new TypeError('Physical embodiment requires host authentication, durable reservation, trusted adapters and optional observation.');
 const installed=new Map();
 for(const [medium,driver] of adapters){
  if(!slug.test(medium)||typeof driver?.perform!=='function'||
     !slug.test(driver.capability||''))
   throw new TypeError('Invalid installed embodiment capability.');
  installed.set(medium,Object.freeze({capability:driver.capability,perform:driver.perform,
   cancel:typeof driver.cancel==='function'?driver.cancel:null}));
 }
 const inflight=new Set();
 return Object.freeze({
  inspect:()=>Object.freeze({schema:WORLD_CROSSING_SCHEMA,
   mediums:Object.freeze([...installed.keys()]),live_device_status:'not-asserted'}),
  async embody(receipt,{event_id,device_id,explicit_consent=false,context,signal}={}){
   const plan=planPhysicalEmbodiment(receipt);
   const intent=plan.items.find(x=>x.event_id===event_id);
   if(!intent)throw new Error('Selected physical action is not present in the verified fiction receipt.');
   if(explicit_consent!==true)throw new Error('Separate, explicit owner consent is required for physical embodiment.');
   if(signal?.aborted)throw new Error('Feather held: no physical action dispatched.');
   const driver=installed.get(intent.medium);
   if(!driver)return Object.freeze({
    schema:'wayglass.world-crossing-receipt/v0.1',event_id,
    status:'capability-unavailable',dispatched:false,
    physically_verified:false,physical_effect:'none'});
   const deviceId=text(device_id,'explicit device identifier',120);
   const request=Object.freeze({
    event_id:intent.event_id,fiction_source_hash:intent.fiction_source_hash,
    wtl_source_hash:intent.wtl_source_hash,medium:intent.medium,
    capability:driver.capability,device_id:deviceId,
    intention:intent.intention,source_line:intent.source_line,
    fresh_explicit_consent:true,
   });
   // The caller's context is untrusted; authenticate must resolve its own host
   // session. Never accept a client-supplied "owner=true" boolean as a grant.
   const authority=await authenticate(request,{context,signal});
   if(!authority||authority.permitted!==true||
      authority.event_id!==event_id||
      authority.wtl_source_hash!==intent.wtl_source_hash||
      authority.device_id!==deviceId||
      authority.capability!==driver.capability||
      typeof authority.principal_id!=='string'||!authority.principal_id.trim())
    throw new Error('Current authenticated host authority did not bind this action to the source, device and principal.');
   if(signal?.aborted)throw new Error('Feather held before physical action.');
   const key=intent.event_id+'|'+deviceId+'|'+driver.capability;
   if(inflight.has(key))throw new Error('Physical action already requested this process; Return cannot replay it.');
   inflight.add(key);
   try {
    // The reservation MUST be durable and atomic. A failure is never bypassed.
    const ticket=await reserve(Object.freeze({
     key,event_id,source_hash:intent.wtl_source_hash,
     principal_id:authority.principal_id,device_id:deviceId,
     capability:driver.capability
    }),{signal});
    if(ticket?.reserved!==true||typeof ticket.receipt_id!=='string'||!ticket.receipt_id.trim())
     throw new Error('Durable at-most-once reservation denied physical action.');
    if(signal?.aborted)throw new Error('Feather held after reservation; no dispatch.');
    let dispatched=false,reported=null,observation=null;
    try{
     // Only the trusted driver knows how to map the authored intention into
     // bounded hardware commands. Prose is NEVER executed as shell/JS/SQL.
     reported=await driver.perform(request,{signal,reservation_id:ticket.receipt_id,
      principal_id:authority.principal_id});
     dispatched=true;
    }catch(error){
     if(signal?.aborted&&driver.cancel){
      try{await driver.cancel(request,{reservation_id:ticket.receipt_id});}catch{}
     }
     // A driver may fail after doing something irreversible: report unknown,
     // never claim no effect or automatic rollback.
     return Object.freeze({
      schema:'wayglass.world-crossing-receipt/v0.1',
      event_id,source_hash:intent.wtl_source_hash,
      reservation_id:ticket.receipt_id,status:'device-outcome-unknown',
      dispatched:'attempted',physically_verified:false,
      physical_effect:'unknown',error:String(error?.message||error)
     });
    }
    if(signal?.aborted&&driver.cancel){
     try{await driver.cancel(request,{reservation_id:ticket.receipt_id});}catch{}
    }
    if(observe&&!signal?.aborted){
     try{observation=await observe(request,{
      signal,reservation_id:ticket.receipt_id,driver_report:reported
     });}catch{/* Sensor failure means unverified, not imaginary success. */}
    }
    const verified=observation?.verified===true&&
     typeof observation.evidence_id==='string'&&observation.evidence_id.trim().length>0&&
     typeof observation.source==='string'&&observation.source.trim().length>0;
    return Object.freeze({
     schema:'wayglass.world-crossing-receipt/v0.1',
     event_id,source_hash:intent.wtl_source_hash,
     reservation_id:ticket.receipt_id,
     medium:intent.medium,device_id:deviceId,
     principal_id:authority.principal_id,
     status:signal?.aborted?'feather-after-dispatch':verified?'physically-observed':'device-reported',
     dispatched,
     physically_verified:Boolean(verified),
     physical_effect:verified?'observed':'not-independently-confirmed',
     evidence:verified?Object.freeze({
      evidence_id:observation.evidence_id,source:observation.source
     }):null,
     retry_allowed:false, // one approval never authorises repeated hardware work
    });
   }finally{inflight.delete(key);}
  }
 });
}
