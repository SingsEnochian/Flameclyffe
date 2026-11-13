'use strict';
// Agentic bloodstream: bounded, attributable autonomous work selection and execution.
// Transport and persistence are injected by the authenticated host.
const {createHash}=require('node:crypto');
const {planAmberBursts}=require('./wayglass-amber-burst.cjs');
const SCHEMA='wayglass.agentic-bloodstream/v1';
function label(v,name){if(typeof v!=='string'||!v.trim()||v.length>300||/[\x00-\x1f\x7f]/.test(v))throw Error('Invalid '+name);return v.trim();}
function selectPulse({intentions=[],ownerAuthorized=false,feather=false,activeRequests=0,budgetTokens=1024}={}){
 if(feather)return Object.freeze({schema:SCHEMA,state:'feather',jobs:[]});
 if(!ownerAuthorized)throw Error('Owner-scoped autonomous runtime required');
 if(!Number.isSafeInteger(activeRequests)||activeRequests<0)throw Error('Invalid activity count');
 if(activeRequests>0)return Object.freeze({schema:SCHEMA,state:'yield-to-interaction',jobs:[]});
 if(!Array.isArray(intentions)||intentions.length>64)throw Error('Invalid intentions');
 const jobs=intentions.map(x=>{
  const id=label(x.id,'intent id'),creator_id=label(x.creator_id,'creator'),source_ref=label(x.source_ref,'source');
  if(!['creative','dream','research','engineering'].includes(x.kind)||x.approved!==true||x.revoked===true||x.private_data===true)throw Error('Invalid intent');
  return {...x,id,creator_id,source_ref};
 });
 const plan=planAmberBursts({ownerAuthorized:true,budgetTokens,tasks:jobs.map(j=>({id:j.id,source_ref:j.source_ref,
  approved:true,priority:j.priority,uncertainty:j.uncertainty,evidence:j.evidence,estimated_tokens:j.estimated_tokens}))});
 return Object.freeze({schema:SCHEMA,state:plan.packets.length?'ready':'rest',jobs:Object.freeze(plan.packets.map(p=>Object.freeze({
  ...p,creator_id:jobs.find(j=>j.id===p.task_id).creator_id,kind:jobs.find(j=>j.id===p.task_id).kind,
  authority:'proposal-only',owner_project:false}))),tokens_reserved:plan.tokens_reserved});
}
async function runPulse({pulse,invoke,writeReceipt,signal}={}){
 if(pulse?.schema!==SCHEMA||pulse.state!=='ready')throw Error('Ready pulse required');
 if(typeof invoke!=='function'||typeof writeReceipt!=='function')throw Error('Authenticated host adapters required');
 const receipts=[];
 for(const job of pulse.jobs){
  if(signal?.aborted)break;
  let result,status='completed';
  try{result=await invoke(job,{signal,token_cap:job.token_cap});}
  catch(error){status='failed';result={error:String(error?.message||error).slice(0,240)};}
  const body={schema:'wayglass.agentic-pulse-receipt/v1',packet_id:job.packet_id,
   creator_id:job.creator_id,kind:job.kind,source_ref:job.source_ref,status,
   result,canon_promoted:false,weights_changed:false};
  const receipt={...body,receipt_hash:createHash('sha256').update(JSON.stringify(body)).digest('hex')};
  await writeReceipt(receipt);receipts.push(receipt);
  if(status==='failed')break;
 }
 return Object.freeze({schema:SCHEMA,state:signal?.aborted?'interrupted':'returned',receipts});
}
module.exports={SCHEMA,selectPulse,runPulse};
