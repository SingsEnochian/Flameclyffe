import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDreamReceiptJournal} from '../src/dream-receipt-journal.js';
function fixture(){
 const rows=new Map();let allowed=true;
 const authorise=async()=>allowed;
 const store={
  appendAtomic:async({owner_id,dream_id,receipt,authorise:check})=>{
   if(await check({owner_id,dream_id,action:'record'})!==true)throw new Error('revoked in transaction');
   const key=owner_id+':'+dream_id;const list=rows.get(key)||[];
   const prior=list.find(r=>r.event_id===receipt.event_id);
   if(prior){if(JSON.stringify(prior)!==JSON.stringify(receipt))throw new Error('conflicting event');return prior;}
   rows.set(key,[...list,receipt]);return receipt;
  },
  readScoped:async({owner_id,dream_id,authorise:check})=>{
   if(await check({owner_id,dream_id,action:'read'})!==true)throw new Error('revoked on read');
   return rows.get(owner_id+':'+dream_id)||[];
  }
 };
 const make=()=>createDreamReceiptJournal({dream_id:'voyage-1',owner_id:'rowan',authorise,store});
 return {make,revoke:()=>{allowed=false;},rows};
}
const event={event_id:'frame-1',stage:'captured',at_ms:100,asset:{asset_id:'video-1',kind:'video',sha256:'a'.repeat(64),secret:'must-not-persist'},transcript:'private text'};
test('cold replay and duplicate retry preserve one redacted receipt',async()=>{
 const f=fixture(),first=f.make();
 await first.append(event);await first.append(event);
 const result=await f.make().replay();
 assert.equal(result.receipts.length,1);assert.equal(result.asset_count,1);
 assert.equal(JSON.stringify(result).includes('private text'),false);
 assert.equal(JSON.stringify(result).includes('must-not-persist'),false);
 assert.equal(Object.isFrozen(result.receipts),true);
});
test('revocation blocks append and replay',async()=>{
 const f=fixture(),journal=f.make();await journal.append(event);f.revoke();
 await assert.rejects(journal.append({...event,event_id:'frame-2'}),/revoked/);
 await assert.rejects(journal.replay(),/revoked/);
});
test('Feather stops further writes',async()=>{
 const f=fixture(),journal=f.make();journal.feather();
 await assert.rejects(journal.append(event),/Feather/);
});
test('conflicting retry is rejected',async()=>{
 const f=fixture(),journal=f.make();await journal.append(event);
 await assert.rejects(journal.append({...event,at_ms:101}),/conflicting/);
});
