'use strict';
// Academy-to-Eightfold worker generation. Uses existing eightfold lanes and
// curriculum evidence; never confuses worker packets with instantiated models.
const {createHash}=require('node:crypto');
const LANES=['perceive','compress','release','verify','integrate','choose','return','transcend'];
const SCHEMA='wayglass.academy-worker-generation/v1';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function generateAcademyWorkers({academy,lessons=[],generation=1,capacity=8,feather=false,sourceSha}={}){
 if(feather)return Object.freeze({schema:SCHEMA,state:'feather',workers:[],discovery_reward:0});
 if(!/^[0-9a-f]{40}$/.test(sourceSha||''))throw Error('Exact source revision required');
 if(typeof academy!=='string'||!academy.trim()||academy.length>128)throw Error('Academy identity required');
 if(!Number.isInteger(generation)||generation<1||!Number.isInteger(capacity)||capacity<1||capacity>64)throw Error('Invalid worker capacity');
 if(!Array.isArray(lessons)||lessons.length>256)throw Error('Invalid curriculum');
 const candidates=lessons.map((lesson,i)=>{
  if(!lesson||typeof lesson.id!=='string'||!lesson.id||!LANES.includes(lesson.lane)
   ||lesson.approved!==true||lesson.revoked===true||!Number.isFinite(lesson.uncertainty)
   ||!Number.isFinite(lesson.novelty)||!Number.isFinite(lesson.evidence)
   ||[lesson.uncertainty,lesson.novelty,lesson.evidence].some(v=>v<0||v>1))throw Error('Invalid curriculum evidence');
  return {...lesson,index:i,score:.45*lesson.uncertainty+.4*lesson.novelty+.15*(1-lesson.evidence)};
 });
 if(new Set(candidates.map(x=>x.id)).size!==candidates.length)throw Error('Duplicate lesson');
 candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const chosen=candidates.slice(0,capacity);
 const workers=chosen.map((lesson,i)=>Object.freeze({
  schema:'wayglass.academy-worker-packet/v1',worker_id:hash([academy,sourceSha,generation,lesson.id,i]),
  academy,lesson_id:lesson.id,lane:lesson.lane,source_sha:sourceSha,generation,
  role:'bounded-curriculum-experiment',question:lesson.question||null,
  score:Math.round(lesson.score*10000)/10000,discovery_status:'unverified',
  model_instance_id:null,model_invoked:false,provenance_required:true,
  verification_required:true,return_receipt_required:true,may_spawn_children:false
 }));
 return Object.freeze({schema:SCHEMA,state:workers.length?'planned':'rest',generation,
  workers:Object.freeze(workers),discovery_reward:0,
  feedback:'Measure novel verified findings, not worker count; next generation uses receipts and held-out evaluations.'});
}
function scoreDiscovery({worker,receipt,heldOutPass=false}={}){
 if(worker?.schema!=='wayglass.academy-worker-packet/v1'||receipt?.worker_id!==worker.worker_id
  ||receipt?.source_sha!==worker.source_sha||receipt?.verified!==true)throw Error('Verified matched worker receipt required');
 const novelty=Number(receipt.novelty),replication=Number(receipt.replication);
 if(!Number.isFinite(novelty)||!Number.isFinite(replication)||novelty<0||novelty>1||replication<0||replication>1)throw Error('Invalid discovery evidence');
 return Object.freeze({worker_id:worker.worker_id,discovery_reward:heldOutPass?novelty*replication:0,
  promoted:heldOutPass&&replication>=.8,held_out_verified:heldOutPass});
}
module.exports={SCHEMA,LANES,generateAcademyWorkers,scoreDiscovery};
