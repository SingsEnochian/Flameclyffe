'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {selectPulse,runPulse}=require('./wayglass-agentic-bloodstream.cjs');
const intention={id:'story:1',creator_id:'wayglass',source_ref:'creative:wayglass:1',kind:'creative',approved:true,
 priority:.8,uncertainty:.5,evidence:.5,estimated_tokens:256};
test('Wayglass-owned story can enter agentic bloodstream independently',()=>{
 const p=selectPulse({intentions:[intention],ownerAuthorized:true,budgetTokens:512});
 assert.equal(p.state,'ready');assert.equal(p.jobs[0].creator_id,'wayglass');
 assert.equal(p.jobs[0].owner_project,false);assert.equal(p.jobs[0].authority,'proposal-only');
});
test('real host adapter is invoked and durable receipt callback precedes return',async()=>{
 const pulse=selectPulse({intentions:[intention],ownerAuthorized:true});
 const written=[];let called=0;
 const returned=await runPulse({pulse,invoke:async(job)=>{called++;return {text:'A story begins',packet_id:job.packet_id};},
  writeReceipt:async(receipt)=>{written.push(receipt);}});
 assert.equal(called,1);assert.equal(written.length,1);
 assert.equal(returned.receipts[0].creator_id,'wayglass');
 assert.equal(returned.receipts[0].canon_promoted,false);
 assert.match(written[0].receipt_hash,/^[a-f0-9]{64}$/);
});
test('Feather and active conversation stop selection, no unauthorised work',()=>{
 assert.equal(selectPulse({feather:true}).state,'feather');
 assert.equal(selectPulse({ownerAuthorized:true,activeRequests:1,intentions:[intention]}).state,'yield-to-interaction');
 assert.throws(()=>selectPulse({intentions:[intention]}),/Owner-scoped/);
 assert.throws(()=>selectPulse({ownerAuthorized:true,intentions:[{...intention,private_data:true}]}),/Invalid intent/);
});
test('failure records a receipt and does not continue to later jobs',async()=>{
 const pulse=selectPulse({ownerAuthorized:true,intentions:[intention,{...intention,id:'story:2',source_ref:'creative:2'}]});
 const saved=[];let calls=0;
 const r=await runPulse({pulse,invoke:async()=>{calls++;throw Error('local Amber unavailable');},
  writeReceipt:async x=>saved.push(x)});
 assert.equal(calls,1);assert.equal(saved[0].status,'failed');assert.equal(r.receipts.length,1);
});
