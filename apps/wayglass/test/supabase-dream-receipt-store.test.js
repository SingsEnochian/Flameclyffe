import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseDreamReceiptStore} from '../src/supabase-dream-receipt-store.js';
import {createDreamReceiptJournal} from '../src/dream-receipt-journal.js';
test('session-scoped adapter integrates with journal and survives a cold instance',async()=>{
 const rows=new Map();const calls=[];let valid=true,consent=true;
 const client={rpc:async(name,args)=>{
  calls.push(name);
  if(!valid||!consent)return {data:null,error:{message:'denied'}};
  if(name==='wayglass_dream_receipt_append_v1'){
   const list=rows.get(args.p_dream_id)||[];
   const match=list.find(x=>x.event_id===args.p_receipt.event_id);
   if(match)return {data:match,error:null};
   rows.set(args.p_dream_id,[...list,args.p_receipt]);return {data:args.p_receipt,error:null};
  }
  if(name==='wayglass_dream_receipt_read_v1')return {data:rows.get(args.p_dream_id)||[],error:null};
  throw new Error('Unexpected RPC');
 }};
 const store=createSupabaseDreamReceiptStore({client,assertOwnerSession:async()=>valid});
 const make=()=>createDreamReceiptJournal({dream_id:'voyage-1',owner_id:'owner-1',authorise:async()=>consent,store});
 const receipt={event_id:'audio-1',stage:'captured',at_ms:42,asset:{asset_id:'audio-1',kind:'audio',sha256:'b'.repeat(64)}};
 await make().append(receipt);
 assert.equal((await make().replay()).receipts.length,1);
 assert.deepEqual(calls,['wayglass_dream_receipt_append_v1','wayglass_dream_receipt_read_v1']);
 consent=false;
 await assert.rejects(make().append({...receipt,event_id:'audio-2'}),/revoked/);
 assert.equal(calls.length,2);
 valid=false;
 await assert.rejects(make().replay(),/invalid|revoked/);
});
test('RPC error and mismatched response fail closed',async()=>{
 const store=createSupabaseDreamReceiptStore({client:{rpc:async()=>({data:{event_id:'wrong'},error:null})},assertOwnerSession:async()=>true});
 await assert.rejects(store.appendAtomic({owner_id:'owner-1',dream_id:'voyage-1',receipt:{dream_id:'voyage-1',event_id:'one'},authorise:async()=>true}),/mismatch/);
});
