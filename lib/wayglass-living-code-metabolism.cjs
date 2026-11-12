'use strict';
// Living code: variation -> isolated verification -> selection -> inheritance.
// No source mutation, training, or deployment without an external executor.
const {createHash}=require('node:crypto');
const {generateAcademyWorkers,scoreDiscovery}=require('./wayglass-academy-worker-generation.cjs');
const SCHEMA='wayglass.living-code-metabolism/v1';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function breathe({academy,lessons,sourceSha,generation=1,capacity=8,feather=false,previous=null}={}){
 if(previous&&previous.schema!==SCHEMA)throw Error('Invalid ancestral metabolism');
 if(previous&&generation!==previous.generation+1)throw Error('Generations must advance by one');
 if(previous&&previous.source_sha!==sourceSha)throw Error('Source changed: require explicit lineage migration');
 const seed=generateAcademyWorkers({academy,lessons,sourceSha,generation,capacity,feather});
 const inherited=previous?.accepted_discoveries||[];
 const core={schema:SCHEMA,generation,source_sha:sourceSha,
  parent_hash:previous?.metabolism_hash||null,
  compression:{curriculum_candidates:lessons?.length||0,inherited_discoveries:inherited.length},
  release:{worker_packets:seed.workers},
  accepted_discoveries:inherited,
  heartbeat:'3:3 / 6:6 / 9:9',state:seed.state,
  next:'verify worker receipts; select replicable discoveries; release next generation',
  code_changed:false,model_weights_changed:false};
 return Object.freeze({...core,metabolism_hash:digest(core)});
}
function assimilate({cycle,observations=[],feather=false}={}){
 if(feather)throw Error('Feather stopped assimilation');
 if(cycle?.schema!==SCHEMA)throw Error('Metabolism required');
 const {metabolism_hash,...core}=cycle;
 if(digest(core)!==metabolism_hash)throw Error('Ancestral integrity failure');
 if(!Array.isArray(observations)||observations.length>cycle.release.worker_packets.length)throw Error('Invalid observations');
 const accepted=[...cycle.accepted_discoveries],seen=new Set(accepted.map(x=>x.worker_id));
 for(const observation of observations){
  const worker=cycle.release.worker_packets.find(w=>w.worker_id===observation?.receipt?.worker_id);
  if(!worker||seen.has(worker.worker_id))throw Error('Unknown or duplicate worker');
  const outcome=scoreDiscovery({worker,receipt:observation.receipt,heldOutPass:observation.heldOutPass===true});
  seen.add(worker.worker_id);
  if(outcome.promoted)accepted.push(Object.freeze({...outcome,lesson_id:worker.lesson_id,lane:worker.lane,source_sha:worker.source_sha}));
 }
 const next={...core,accepted_discoveries:accepted,compression:{...core.compression,verified_observations:observations.length},state:'evaluated'};
 return Object.freeze({...next,metabolism_hash:digest(next)});
}
module.exports={SCHEMA,breathe,assimilate};
