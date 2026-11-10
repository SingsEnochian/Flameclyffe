const {test}=require('node:test');const assert=require('node:assert/strict');
const fake=()=>({source_unchanged:true,lanes:['authority','wyrdrune','mobius','body','observer','agency','return','host'].map(id=>({id,status:id==='wyrdrune'?'incomplete':'passed',tests:id==='wyrdrune'?114:1,pass:id==='wyrdrune'?95:1,todo:id==='wyrdrune'?19:0,fail:0,skipped:0,exit_code:0,timed_out:false}))});
test('known unclaimed language fixtures pass development but never release',async()=>{
 const {classifyShipVerification}=await import('../../lib/wayglass-verification-status.mjs');
 assert.deepEqual(classifyShipVerification(fake(),{baselineMatched:true,expectedLanguageTodos:19}),{development_status:'passed-with-known-language-gaps',release_status:'incomplete',release_ready:false});
});
test('new TODOs, changed fixtures, test failures and changed source cannot pass development',async()=>{
 const {classifyShipVerification}=await import('../../lib/wayglass-verification-status.mjs');
 for(const mutate of [r=>r.source_unchanged=false,r=>r.lanes[1].todo=20,r=>r.lanes[0].fail=1,r=>r.lanes[0].exit_code=1,r=>r.lanes[2].skipped=1,r=>r.lanes[0].tests=0,r=>r.lanes.pop()]){
  const r=fake();mutate(r);assert.equal(classifyShipVerification(r,{baselineMatched:true,expectedLanguageTodos:19}).development_status,'failed');
 }
 assert.equal(classifyShipVerification(fake(),{baselineMatched:false,expectedLanguageTodos:19}).development_status,'failed');
});
test('only all eight completed lanes become release-ready',async()=>{
 const {classifyShipVerification}=await import('../../lib/wayglass-verification-status.mjs');const r=fake();r.lanes[1].todo=0;r.lanes[1].status='passed';
 assert.deepEqual(classifyShipVerification(r),{development_status:'passed',release_status:'passed',release_ready:true});
});
