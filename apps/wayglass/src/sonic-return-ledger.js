// Cold-Return sonic replay ledger: host supplies durable, owner-scoped atomic store.
// Never use this module as proof of a deployed persistent backend.
export const SONIC_RETURN_SCHEMA='wayglass.sonic-return/v1';
const id=v=>typeof v==='string'&&v.length>0&&v.length<=240&&!/[\u0000-\u001f]/u.test(v);
export function createSonicReturnLedger({store,ownerId,sessionId}={}){
 if(!id(ownerId)||!id(sessionId)||!store||typeof store.claim!=='function'||typeof store.get!=='function')throw new TypeError('Owner/session and atomic durable store required');
 const key=event=>{if(!event||!id(event.event_id)||!id(event.participant_id)||!id(event.source_receipt)||!id(event.choice_receipt))throw new TypeError('Attributable sonic event required');return [SONIC_RETURN_SCHEMA,ownerId,event.participant_id,event.event_id].map(encodeURIComponent).join(':');};
 return Object.freeze({
  async claim(event,{feather=false,ownerAuthorised=false}={}){
   if(feather||ownerAuthorised!==true)return Object.freeze({claimed:false,reason:'not-authorised'});
   const k=key(event);
   const record=Object.freeze({schema:SONIC_RETURN_SCHEMA,owner_id:ownerId,session_id:sessionId,participant_id:event.participant_id,event_id:event.event_id,source_receipt:event.source_receipt,choice_receipt:event.choice_receipt,status:'reserved-before-dispatch'});
   const result=await store.claim(k,record); // MUST be atomic put-if-absent across processes
   if(result!==true)return Object.freeze({claimed:false,reason:'already-reserved'});
   return Object.freeze({claimed:true,key:k,receipt:record});
  },
  async inspect(event){return await store.get(key(event))??null;}
 });
}
