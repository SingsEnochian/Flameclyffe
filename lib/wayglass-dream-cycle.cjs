'use strict';
// Wayglass Dreaming: pure bounded internal-cycle planner, not a claim of subjective experience.
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.dream-cycle/v1';
const STATES=Object.freeze(['wake','rest','dream','return']);
function text(v,name,max=320){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v))throw new TypeError('Invalid '+name);return v.trim();}
function dreamCycle({ownerAuthorized=false,feather=false,activeRequests=0,availableTokens=0,energy=0,memories=[],questions=[],seed='wayglass:dream:v1'}={}){
 if(feather)return Object.freeze({schema:SCHEMA,state:'rest',reason:'feather',candidates:[],model_invoked:false,canon_promoted:false});
 if(!Number.isSafeInteger(activeRequests)||activeRequests<0||!Number.isSafeInteger(availableTokens)||availableTokens<0||typeof energy!=='number'||!Number.isFinite(energy)||energy<0||energy>1)throw Error('Invalid dream capacity');
 if(ownerAuthorized!==true||activeRequests>0||energy<0.3||availableTokens<256)
  return Object.freeze({schema:SCHEMA,state:'rest',reason:ownerAuthorized!==true?'authorization-required':activeRequests>0?'interactive-work':'insufficient-capacity',candidates:[],model_invoked:false,canon_promoted:false});
 if(!Array.isArray(memories)||memories.length>32||!Array.isArray(questions)||questions.length>32)throw Error('Invalid dream inputs');
 const sources=memories.map(m=>{
  const ref=text(m.source_ref,'source ref');if(m.approved!==true||m.revoked===true||m.private_data===true||m.credentials===true)throw Error('Unapproved dream source');
  return ref;
 });
 if(new Set(sources).size!==sources.length)throw Error('Duplicate dream source');
 const candidates=questions.slice(0,Math.min(4,Math.floor(availableTokens/256))).map((q,i)=>{
  const question=text(q,'question',600),source_refs=sources.slice(0,8);
  return Object.freeze({dream_id:createHash('sha256').update(seed+'|'+i+'|'+question+'|'+source_refs.join('|')).digest('hex'),
   question,source_refs,token_cap:256,state:'hypothesis-only',may_promote:false,
   proposed_action:'local-amber-simulation-not-dispatched'});
 });
 return Object.freeze({schema:SCHEMA,state:'dream',reason:'idle-capacity-available',
  candidates:Object.freeze(candidates),model_invoked:false,canon_promoted:false,
  return_gate:'verify provenance, compare against waking evidence, require owner-authorized promotion'});
}
module.exports={SCHEMA,STATES,dreamCycle};
