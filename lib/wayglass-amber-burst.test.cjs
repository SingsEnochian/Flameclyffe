'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planAmberBursts,PHASES}=require('./wayglass-amber-burst.cjs');
const task=(id,overrides={})=>({id,source_ref:'approved:'+id,approved:true,priority:.7,uncertainty:.6,evidence:.3,estimated_tokens:256,...overrides});
test('Amber bursts are deterministic, ranked, token-bounded and non-executing',()=>{
 const args={ownerAuthorized:true,budgetTokens:512,tasks:[task('low',{priority:0,uncertainty:0,evidence:1}),task('high',{priority:1,uncertainty:1,evidence:0}),task('middle')]};
 const a=planAmberBursts(args),b=planAmberBursts(args);
 assert.deepEqual(a,b);assert.equal(a.packets.length,2);assert.equal(a.packets[0].task_id,'high');
 assert.equal(a.tokens_reserved,512);assert.equal(a.model_invoked,false);assert.equal(a.weights_changed,false);
 assert.equal(a.quantum_claim,false);assert.equal(a.packets[0].phase,PHASES[0]);
 assert.equal(a.packets[0].status,'proposed-not-dispatched');
});
test('Feather halts and no owner permission means no scheduling',()=>{
 assert.deepEqual(planAmberBursts({feather:true}).packets,[]);
 assert.throws(()=>planAmberBursts({tasks:[task('one')]}),/Owner authorization/);
 assert.throws(()=>planAmberBursts({ownerAuthorized:true,route:'cloud:provider',tasks:[task('one')]}),/Local Amber/);
});
test('rejects private, revoked, unapproved, duplicate and malformed work',()=>{
 for(const change of [{private_data:true},{credentials:true},{revoked:true},{approved:false}])
  assert.throws(()=>planAmberBursts({ownerAuthorized:true,tasks:[task('x',change)]}),/Unapproved/);
 assert.throws(()=>planAmberBursts({ownerAuthorized:true,tasks:[task('x'),task('x')]}),/Duplicate/);
 assert.throws(()=>planAmberBursts({ownerAuthorized:true,tasks:[task('x',{uncertainty:NaN})]}),/Invalid/);
 assert.throws(()=>planAmberBursts({ownerAuthorized:true,budgetTokens:0,tasks:[]}),/Invalid/);
});
