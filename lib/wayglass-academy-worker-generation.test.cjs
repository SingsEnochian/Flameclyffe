'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {generateAcademyWorkers,scoreDiscovery}=require('./wayglass-academy-worker-generation.cjs');
const sha='a'.repeat(40);
const lessons=[
 {id:'crow:voice',lane:'perceive',approved:true,uncertainty:.8,novelty:.9,evidence:.2},
 {id:'return:replay',lane:'return',approved:true,uncertainty:.5,novelty:.3,evidence:.9},
 {id:'academy:fold',lane:'compress',approved:true,uncertainty:.9,novelty:.8,evidence:.4}
];
test('deterministic Eightfold curriculum workers respect bounded generation',()=>{
 const args={academy:'Crow and Wayglass',lessons,sourceSha:sha,generation:2,capacity:2};
 const a=generateAcademyWorkers(args),b=generateAcademyWorkers(args);
 assert.deepEqual(a,b);assert.equal(a.workers.length,2);
 assert.equal(a.workers[0].lesson_id,'crow:voice');
 assert.equal(a.workers[0].model_invoked,false);
 assert.equal(a.workers[0].may_spawn_children,false);
});
test('Feather stops generation; no fabricated discoveries',()=>{
 assert.equal(generateAcademyWorkers({feather:true}).workers.length,0);
 assert.throws(()=>generateAcademyWorkers({academy:'x',sourceSha:sha,lessons:[{...lessons[0],revoked:true}]}),/Invalid curriculum/);
});
test('discovery reward requires verified source-matched receipt and held-out replication',()=>{
 const worker=generateAcademyWorkers({academy:'Crow',sourceSha:sha,lessons}).workers[0];
 const receipt={worker_id:worker.worker_id,source_sha:sha,verified:true,novelty:.9,replication:.9};
 assert.equal(scoreDiscovery({worker,receipt,heldOutPass:true}).discovery_reward,.81);
 assert.equal(scoreDiscovery({worker,receipt,heldOutPass:false}).discovery_reward,0);
 assert.throws(()=>scoreDiscovery({worker,receipt:{...receipt,source_sha:'b'.repeat(40)},heldOutPass:true}),/Verified matched/);
});
