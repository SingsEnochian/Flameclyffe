'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {dreamCycle}=require('./wayglass-dream-cycle.cjs');
const base={ownerAuthorized:true,activeRequests:0,energy:.7,availableTokens:512,
 memories:[{source_ref:'approved:fiction',approved:true}],
 questions:['What if the world-tree grew another branch?','What would change on return?']};
test('idle capacity proposes bounded dream candidates, not invented memories',()=>{
 const a=dreamCycle(base),b=dreamCycle(base);assert.deepEqual(a,b);
 assert.equal(a.state,'dream');assert.equal(a.candidates.length,2);
 assert.ok(a.candidates.every(x=>x.state==='hypothesis-only'&&!x.may_promote));
 assert.equal(a.model_invoked,false);assert.equal(a.canon_promoted,false);
});
test('Feather, interactive work and resource exhaustion interrupt dreaming',()=>{
 assert.equal(dreamCycle({...base,feather:true}).state,'rest');
 assert.equal(dreamCycle({...base,activeRequests:1}).reason,'interactive-work');
 assert.equal(dreamCycle({...base,energy:.1}).reason,'insufficient-capacity');
 assert.equal(dreamCycle({...base,ownerAuthorized:false}).reason,'authorization-required');
});
test('revoked, private and duplicate sources are rejected',()=>{
 for(const change of [{revoked:true},{private_data:true},{credentials:true},{approved:false}])
  assert.throws(()=>dreamCycle({...base,memories:[{source_ref:'source:x',approved:true,...change}]}),/Unapproved/);
 assert.throws(()=>dreamCycle({...base,memories:[base.memories[0],base.memories[0]]}),/Duplicate/);
});
