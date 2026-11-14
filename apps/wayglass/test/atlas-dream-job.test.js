import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAtlasDreamJob} from '../src/atlas-dream-job.js';
test('Atlas dream idempotency and dream-local result',async()=>{
 const receipts=[];let submitted=0;
 const job=createAtlasDreamJob({record:x=>receipts.push(x),transport:{
  submit:async()=>{submitted++;return {id:'op-one'};},
  wait:async()=>({done:true,response:{frames:[{imageAsset:{assetId:'asset-one'}}]}}),
 }});
 await job.start({dream_id:'dream-1',idempotency_key:'same'});
 await job.start({dream_id:'dream-1',idempotency_key:'same'});
 assert.equal(submitted,1);
 const result=await job.wait('same');
 assert.equal(result.status,'dream-local-available');
 assert.deepEqual(result.asset_ids,['asset-one']);
 assert.equal(receipts.some(x=>x.stage==='available'),true);
});
test('Feather preserves a late completion without adoption',async()=>{
 const receipts=[];let resolveWait;let cancelCalls=0;
 const job=createAtlasDreamJob({record:x=>receipts.push(x),transport:{
  submit:async()=>({id:'op-two'}),
  wait:()=>new Promise(resolve=>{resolveWait=resolve;}),
  cancel:async()=>{cancelCalls++;},
 }});
 await job.start({dream_id:'dream-2',idempotency_key:'second'});
 const pending=job.wait('second');
 await job.feather('second');
 resolveWait({done:true,response:{frames:[{imageAsset:{assetId:'should-not-adopt'}}]}});
 const result=await pending;
 assert.equal(result.status,'observed-not-adopted');
 assert.equal(result.asset_ids,undefined);
 assert.equal(cancelCalls,1);
 assert.equal(receipts.at(-1).stage,'late-completion');
 assert.equal(receipts.at(-1).upstream_execution,'unknown');
});
