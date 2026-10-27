'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {listNikolaBlindCases,BENCHMARK_SCHEMA}=require('../wayglass/nikola-benchmark-questions.cjs');
const {freezeNikolaResponse,revealNikolaRubric}=require('../wayglass/nikola-benchmark-rubrics.cjs');

test('12 independent examiner questions have balanced domain coverage and unique identities',()=>{
 const items=listNikolaBlindCases();
 assert.equal(items.length,12);
 assert.equal(new Set(items.map(x=>x.id)).size,12);
 for(const domain of ['mechanics','quantum','mathematics','computing'])
   assert.equal(items.filter(x=>x.domain===domain).length,3);
 assert.ok(items.every(x=>x.schema===BENCHMARK_SCHEMA && x.evaluation_key_included===false && x.source_class==='human-authored-synthetic'));
});
test('candidate-facing question module contains no key or grading rubrics',()=>{
 const cases=listNikolaBlindCases();
 assert.ok(cases.every(x=>Object.keys(x).sort().join(',')==='domain,evaluation_key_included,id,question,schema,source_class'));
 const client=readFileSync(join(__dirname,'../../wayglass/src/nikola-trials.js'),'utf8');
 const host=readFileSync(join(__dirname,'../wayglass/router.js'),'utf8');
 assert.doesNotMatch(client,/nikola-benchmark-rubrics/);
 assert.doesNotMatch(host,/nikola-benchmark-rubrics/);
});
test('answer must be frozen before the independent human-review key is accessible through the evaluator',()=>{
 assert.throws(()=>revealNikolaRubric({case_id:'MATH-03'}),/freeze receipt/);
 assert.throws(()=>freezeNikolaResponse({id:'bad',answer:'abc'}),/unknown/);
 assert.throws(()=>freezeNikolaResponse({id:'MATH-03',answer:''}),/bounded answer/);
 const frozen=freezeNikolaResponse({id:'MATH-03',answer:'The likelihood ratio is four.',modelReported:'local candidate'});
 assert.match(frozen.answer_sha256,/^[a-f0-9]{64}$/);
 assert.equal(frozen.status,'response-frozen-not-graded');
 const grade=revealNikolaRubric(frozen);
 assert.equal(grade.machine_verdict,null);
 assert.equal(grade.grading,'independent-human-review-required');
 assert.equal(grade.case_id,'MATH-03');
 assert.equal(grade.criteria.length,3);
 assert.equal(grade.candidate_answer_sha256,frozen.answer_sha256);
});
test('review cannot silently convert a model identifier or response into external proof',()=>{
 const receipt=freezeNikolaResponse({id:'QUANT-02',answer:'The outcome is underdetermined.'});
 const grader=revealNikolaRubric(receipt);
 assert.equal(receipt.independent_model_attestation,false);
 assert.match(grader.caveat,/not a cryptographic secret/);
 assert.equal(grader.machine_verdict,null);
});
