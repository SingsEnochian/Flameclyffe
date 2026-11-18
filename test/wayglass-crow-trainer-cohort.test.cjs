'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {prepareCohort,assessWyrdrune}=require('../lib/wayglass-crow-trainer-cohort.cjs');
const {readFileSync}=require('node:fs');
const principal={authorized:true};
test('cohort retains four independent agents and three native Wyrdrune lessons',()=>{
 const cohort=prepareCohort({principal,modelRoute:'local:amber'});
 assert.equal(cohort.agents.length,4);
 assert.equal(new Set(cohort.agents.map(x=>x.id)).size,4);
 assert.equal(cohort.lessons.length,3);
 assert.equal(cohort.model_calls_authorized,false);
 assert.ok(cohort.agents.every(x=>x.state==='declared-not-spawned'));
});
test('Crow Trainer accepts native Wyrdrune and rejects arbitrary JavaScript',async()=>{
 const source=readFileSync('lib/wyrdrune/with-002-amber.wtl','utf8');
 const assessment=await assessWyrdrune(source,{principal});
 assert.equal(assessment.valid,true);
 assert.equal(assessment.executed,false);
 await assert.rejects(assessWyrdrune('console.log(1)',{principal}));
});
test('owner and route are mandatory',()=>{
 assert.throws(()=>prepareCohort({modelRoute:'local:amber'}),/Owner/);
 assert.throws(()=>prepareCohort({principal}),/Amber model route/);
});
