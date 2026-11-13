'use strict';
// Amber / Wayglass burst planning. Pure deterministic scheduling, never invokes or trains a model.
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.amber-burst/v1';
const PHASES=Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const finite=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError('Invalid '+name);return v;};
const bounded=(v,name,max=160)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw new TypeError('Invalid '+name);return v.trim();};
function planAmberBursts({tasks=[],budgetTokens=2048,maxPackets=8,ownerAuthorized=false,feather=false,route='local:amber',seed='wayglass:amber:v1'}={}){
 if(feather)return Object.freeze({schema:SCHEMA,status:'feather-stopped',packets:[],tokens_reserved:0,model_invoked:false,weights_changed:false});
 if(ownerAuthorized!==true)throw Error('Owner authorization required for Amber burst scheduling');
 if(route!=='local:amber')throw Error('Local Amber route only');
 finite(budgetTokens,128,32768,'budgetTokens');finite(maxPackets,1,8,'maxPackets');
 if(!Number.isSafeInteger(budgetTokens)||!Number.isSafeInteger(maxPackets)||!Array.isArray(tasks)||tasks.length>64)throw Error('Invalid bounded packet request');
 const unique=new Set();
 const ranked=tasks.map((t,i)=>{
  const id=bounded(t.id,'task id');if(unique.has(id))throw Error('Duplicate task');unique.add(id);
  const source_ref=bounded(t.source_ref,'source ref',300);
  if(t.approved!==true||t.private_data===true||t.credentials===true||t.revoked===true)throw Error('Unapproved or revoked source');
  const priority=finite(t.priority,0,1,'priority'),uncertainty=finite(t.uncertainty,0,1,'uncertainty');
  const evidence=finite(t.evidence,0,1,'evidence'),cost=finite(t.estimated_tokens,64,4096,'estimated_tokens');
  if(!Number.isSafeInteger(cost))throw Error('Token cost must be integer');
  // Possibility weights are computational heuristics, not quantum-state measurements.
  const score=Number((0.45*priority+0.35*uncertainty+0.20*(1-evidence)).toFixed(6));
  return {id,source_ref,priority,uncertainty,evidence,estimated_tokens:cost,score,index:i};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const packets=[];let tokens=0;
 for(const t of ranked){
  if(packets.length>=maxPackets)break;
  if(tokens+t.estimated_tokens>budgetTokens)continue;
  tokens+=t.estimated_tokens;
  const packet={packet_id:createHash('sha256').update(seed+'|'+t.id+'|'+t.source_ref).digest('hex'),task_id:t.id,source_ref:t.source_ref,route,
   phase:PHASES[packets.length],token_cap:t.estimated_tokens,possibility_weight:t.score,
   required_result:['output','source_ref','model_id','session_id','elapsed_ms','tokens_used','receipt_hash'],
   status:'proposed-not-dispatched'};
  packets.push(Object.freeze(packet));
 }
 return Object.freeze({schema:SCHEMA,status:'awaiting-authorized-local-dispatch',packets:Object.freeze(packets),
  tokens_reserved:tokens,budget_tokens:budgetTokens,model_invoked:false,weights_changed:false,
  quantum_claim:false,training_manifest_required:true,withness:'verify provenance and Return before any next burst'});
}
module.exports={SCHEMA,PHASES,planAmberBursts};
