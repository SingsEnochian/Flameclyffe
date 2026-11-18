// Pure, deterministic projection for an authenticated durable receipt store.
// This module does not persist, authenticate or execute events.
export const WITHNESS_RECEIPT_SCHEMA='wayglass.withness-receipt/v1';
const stages=new Set(['requested','executed','observed','accepted','revoked']);
const dispositions=new Set(['pending','observed-not-adopted','adopted','revoked']);
export function projectWithnessReceipts(receipts){
  if(!Array.isArray(receipts))throw new TypeError('Receipts must be an array');
  const byId=new Map();
  for(const input of receipts){
    if(!input||input.schema!==WITHNESS_RECEIPT_SCHEMA)throw new TypeError('Unknown receipt schema');
    const {receipt_id,event_id,stage,disposition,observed_at}=input;
    if(typeof receipt_id!=='string'||!receipt_id||receipt_id.length>128||
       typeof event_id!=='string'||!event_id||event_id.length>128||
       !stages.has(stage)||!dispositions.has(disposition)||
       typeof observed_at!=='string'||!Number.isFinite(Date.parse(observed_at)))
      throw new TypeError('Invalid Withness receipt');
    const existing=byId.get(receipt_id);
    // Duplicate receipt IDs must be byte-for-byte equivalent; conflicts fail closed.
    if(existing){
      if(JSON.stringify(existing)!==JSON.stringify(input))
        throw new Error('Conflicting Withness receipt identity: '+receipt_id);
      continue;
    }
    byId.set(receipt_id,Object.freeze({...input}));
  }
  const events=new Map();
  for(const receipt of byId.values()){
    const group=events.get(receipt.event_id)||[];
    group.push(receipt);events.set(receipt.event_id,group);
  }
  return Object.freeze([...events].map(([event_id,items])=>Object.freeze({
    event_id,
    receipts:Object.freeze(items.slice()),
    observed:items.some(x=>x.stage==='observed'),
    accepted:items.some(x=>x.stage==='accepted'&&x.disposition==='adopted'),
    revoked:items.some(x=>x.stage==='revoked'),
    // A revocation supersedes acceptance; observation alone never implies consent.
    effective_adoption:items.some(x=>x.stage==='accepted'&&x.disposition==='adopted')&&
      !items.some(x=>x.stage==='revoked'),
  })));
}
