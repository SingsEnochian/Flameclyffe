'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {breathe,assimilate,compressionOfRelease,releaseNext}=require('./wayglass-living-code-metabolism.cjs');
const sha='a'.repeat(40);
const lesson={id:'academy:novelty',lane:'perceive',approved:true,uncertainty:.8,novelty:.9,evidence:.2};
const args={academy:'Crow',lessons:[lesson],sourceSha:sha};
test('breath inherits verified discovery into the next generation without modifying source',()=>{
 const first=breathe(args),worker=first.release.worker_packets[0];
 const receipt={worker_id:worker.worker_id,source_sha:sha,verified:true,novelty:.8,replication:.9};
 const evaluated=assimilate({cycle:first,observations:[{receipt,heldOutPass:true}]});
 assert.equal(evaluated.accepted_discoveries.length,1);
 const second=breathe({...args,generation:2,previous:evaluated});
 assert.equal(second.parent_hash,evaluated.metabolism_hash);
 assert.equal(second.motion.parent_hash,first.motion.motion_hash);
 assert.equal(second.motion.engines.flatMap(e=>e.lanes).length,8);
 assert.equal(second.compression.inherited_discoveries,1);
 assert.equal(second.code_changed,false);
 assert.equal(second.model_weights_changed,false);
});
test('unverified novelty cannot reproduce or enter inheritance',()=>{
 const cycle=breathe(args),w=cycle.release.worker_packets[0];
 assert.throws(()=>assimilate({cycle,observations:[{receipt:{worker_id:w.worker_id,source_sha:sha,verified:false,novelty:1,replication:1},heldOutPass:true}]}),/Verified matched/);
 assert.equal(assimilate({cycle,observations:[{receipt:{worker_id:w.worker_id,source_sha:sha,verified:true,novelty:1,replication:1},heldOutPass:false}]}).accepted_discoveries.length,0);
});
test('Feather, source drift and altered ancestor fail closed',()=>{
 const first=breathe(args);
 assert.equal(breathe({...args,feather:true}).release.worker_packets.length,0);
 assert.throws(()=>assimilate({cycle:first,feather:true}),/Feather/);
 assert.throws(()=>breathe({...args,sourceSha:'b'.repeat(40),generation:2,previous:first}),/Source changed/);
 assert.throws(()=>assimilate({cycle:{...first,state:'tampered'}}),/integrity/);
});

test('compression of release becomes the next compression indefinitely without resetting ancestry',()=>{
 let cycle=breathe(args);
 for(let generation=1;generation<=12;generation++){
  const worker=cycle.release.worker_packets[0];
  const receipt={worker_id:worker.worker_id,source_sha:sha,verified:true,novelty:.8,replication:.9};
  const {evaluated,next_compression}=compressionOfRelease({cycle,observations:[{receipt,heldOutPass:true}]});
  assert.equal(next_compression.ancestor_hash,evaluated.metabolism_hash);
  assert.equal(next_compression.discovery_count,generation);
  cycle=releaseNext({compression:next_compression,academy:'Crow',lessons:[lesson]});
  assert.equal(cycle.generation,generation+1);
  assert.equal(cycle.parent_hash,evaluated.metabolism_hash);
  assert.equal(cycle.motion.parent_hash,evaluated.motion.motion_hash);
  assert.equal(cycle.motion.step,generation);
  assert.equal(cycle.compression.inherited_discoveries,generation);
 }
 assert.equal(cycle.code_changed,false);
 assert.equal(cycle.model_weights_changed,false);
});

test('a moving Eightfold is embedded in each breath and integrity protects its topology',()=>{
 const first=breathe(args);
 assert.equal(first.motion.link.shared_center,'withness');
 assert.deepEqual(first.motion.engines.map(e=>e.name),['inquiry','becoming']);
 assert.throws(()=>assimilate({cycle:{...first,motion:{...first.motion,step:900}}}),/integrity/);
 const evaluated=assimilate({cycle:first});
 const next=breathe({...args,generation:2,previous:evaluated});
 assert.notDeepEqual(first.motion.engines[0].lanes[0].coordinate,next.motion.engines[0].lanes[0].coordinate);
});
