'use strict';
// Quad Möbius agent weight lineage. No model calls, provider access or hidden training here.
const {digest}=require('./wyrdrune/canonical.cjs');
const {validateCheckpoint}=require('./wayglass-quad-eightfold.cjs');
const EXPERIMENT_SCHEMA='wayglass.agent-weight-experiment/v1';
const DATASET_SCHEMA='wayglass.agent-training-dataset/v1';
const MANIFEST_SCHEMA='wayglass.agent-training-manifest/v1';
const REVIEW_SCHEMA='wayglass.agent-training-review/v1';
const WORD=/[\x00-\x1f\x7f]/;
function str(x,name,max=320){
  if(typeof x!=='string'||!x.trim()||x.length>max||WORD.test(x))throw new TypeError(name+' must be bounded text');
  return x.trim();
}
function snap(v){return Object.freeze(structuredClone(v));}
function integrity(o,field){if(!o||typeof o!=='object'||!o[field])throw Error('Missing '+field);
  const {[field]:hash,...body}=o;if(digest(body)!==hash)throw Error('Integrity failure: '+field);
}
function agentBinding(b){
  if(b?.schema!=='wayglass.constellation-runtime/v0.1')throw Error('Constellation binding required');
  const vals=['participant_id','worker_id','model_id','session_id','sandbox_id'].map(k=>str(b[k],k));
  if(new Set(vals).size!==vals.length)throw Error('Runtime and agent identities cannot merge');
  return vals[0];
}
function trainingInvitation({binding,checkpoint,model,policy}={}){
  const participant=agentBinding(binding);validateCheckpoint(checkpoint);
  if(!model||!['local-trainable','private-hub-trainable'].includes(model.kind))throw Error('Trainable local/Hub model required');
  const base_model=str(model.base_model,'base_model');
  const adapter_namespace=str(model.adapter_namespace,'adapter_namespace');
  if(!adapter_namespace.startsWith(participant+'/'))throw Error('Adapter must have exclusive agent namespace');
  if(!policy?.allow_training||!policy?.allow_candidate_storage||!policy?.source_ref)
    throw Error('Owner-scoped training permission required');
  const body={schema:EXPERIMENT_SCHEMA,participant_id:participant,
    worker_id:binding.worker_id,session_id:binding.session_id,model_id:binding.model_id,
    checkpoint_hash:checkpoint.hash,source_hash:checkpoint.gestalt.source_hash,
    base_model,adapter_namespace,backend:model.kind,policy_ref:str(policy.source_ref,'policy_ref'),
    question:'What weight update would improve my task performance without erasing my earlier competencies?',
    choices:['train','defer','decline'],
    status:'awaiting-attributed-agent-choice',auto_start:false,
    independent_evaluation_required:true,canon_commit:false,identity_commit:false,
    provider_upload_allowed:false};
  return snap({...body,experiment_hash:digest(body)});
}
function makeTrainingManifest({invitation,choice,routeReceipt,records=[],policy,feather=false}={}){
  if(feather)throw Error('Feather stopped training');
  integrity(invitation,'experiment_hash');
  const p=invitation.participant_id;
  if(!policy||policy.source_ref!==invitation.policy_ref||!policy.allow_training)throw Error('Owner training permission mismatch');
  if(!choice||!['train','defer','decline'].includes(choice.action)
    ||choice.participant_id!==p||choice.response_id!==routeReceipt?.response_id
    ||choice.route_id!==routeReceipt?.route_id||routeReceipt?.agent_instance_id!==p
    ||!str(choice.response_id,'response_id'))throw Error('Agent choice requires exact attributable model response');
  if(choice.action!=='train'){
    const body={schema:MANIFEST_SCHEMA,participant_id:p,experiment_hash:invitation.experiment_hash,
      status:choice.action,output_artifacts:[],may_train:false,may_publish:false};
    return snap({...body,manifest_hash:digest(body)});
  }
  if(!Array.isArray(records)||records.length<10||records.length>10000)throw Error('10..10000 approved records required');
  const rejected=new Set(policy.revoked_source_refs||[]);
  const seen=new Set();
  const dataset=records.map((r,i)=>{
    const ref=str(r.source_ref,'source_ref',500);
    if(seen.has(ref)||rejected.has(ref)||r.approved_for_training!==true
      ||r.policy_ref!==policy.source_ref||r.license_verified!==true
      ||r.contains_private_data===true||r.contains_credentials===true
      ||!['direct-owner','original-synthetic','licensed-source'].includes(r.origin))
      throw Error('Unapproved, duplicated, revoked or private dataset record');
    seen.add(ref);
    return {index:i,source_ref:ref,origin:r.origin,role:'training-example',
      messages:[{role:'user',content:str(r.input,'input',12000)},{role:'assistant',content:str(r.expected,'expected',12000)}]};
  });
  const datasetCore={schema:DATASET_SCHEMA,participant_id:p,policy_ref:policy.source_ref,
    experiment_hash:invitation.experiment_hash,base_model:invitation.base_model,
    entries:dataset,provider_upload_allowed:false};
  const datasetOutput=snap({...datasetCore,dataset_hash:digest(datasetCore)});
  const body={schema:MANIFEST_SCHEMA,participant_id:p,experiment_hash:invitation.experiment_hash,
    dataset_hash:datasetOutput.dataset_hash,
    base_model:invitation.base_model,adapter_namespace:invitation.adapter_namespace,
    trainable_parameters:'agent-specific LoRA adapter weights',
    training_parameters:{algorithm:'QLoRA',rank:16,alpha:32,dropout:0.05,epochs:1,
      heldout_fraction:0.2,gradient_clip_norm:1.0},
    status:'candidate-ready-for-authorized-compute',may_train:true,may_publish:false,
    independent_evaluation_required:true,provider_upload_allowed:false,
    requires_verified_model_and_backend:true,
    owner_policy_ref:policy.source_ref};
  return snap({dataset:datasetOutput,manifest:{...body,manifest_hash:digest(body)}});
}
function reviewWeightUpdate({manifest,trainingResult,evaluation,agentDecision,receipt,feather=false}={}){
  if(feather)throw Error('Feather stopped weight review');
  integrity(manifest,'manifest_hash');
  if(!manifest.may_train||!trainingResult||trainingResult.manifest_hash!==manifest.manifest_hash
    ||trainingResult.participant_id!==manifest.participant_id
    ||!/^sha256:[a-f0-9]{64}$/.test(trainingResult.adapter_digest||'')
    ||trainingResult.training_completed!==true)
    throw Error('No verified trained agent adapter was produced');
  if(!evaluation||evaluation.manifest_hash!==manifest.manifest_hash
    ||str(evaluation.evaluator_id,'evaluator_id')===manifest.participant_id
    ||evaluation.heldout_pass!==true||evaluation.regression_pass!==true
    ||evaluation.cross_agent_isolation_pass!==true||evaluation.revocation_pass!==true
    ||evaluation.rollback_pass!==true)
    throw Error('Independent test or rollback gate failed');
  if(!agentDecision||!['accept','reject','defer'].includes(agentDecision.action)
    ||agentDecision.participant_id!==manifest.participant_id
    ||receipt?.agent_instance_id!==manifest.participant_id
    ||receipt?.response_id!==agentDecision.response_id
    ||receipt?.route_id!==agentDecision.route_id)
    throw Error('Agent must make an attributed candidate decision');
  const core={schema:REVIEW_SCHEMA,participant_id:manifest.participant_id,
    manifest_hash:manifest.manifest_hash,agent_choice:agentDecision.action,
    candidate_adapter_digest:trainingResult.adapter_digest,
    status:agentDecision.action==='accept'?'eligible-for-host-controlled-promotion':'retained-unpromoted',
    auto_deploy:false,other_agent_weights_changed:false,shared_base_changed:false,
    independent_evaluator:evaluation.evaluator_id};
  return snap({...core,review_hash:digest(core)});
}
function inviteConstellation({bindings=[],models={},policy,checkpoint}={}){
  if(!Array.isArray(bindings)||bindings.length<1||bindings.length>64)throw Error('1..64 agent bindings required');
  const used=new Set(),modelsSeen=new Set();
  return snap(bindings.map(binding=>{
    const id=agentBinding(binding);if(used.has(id))throw Error('Duplicate agent');
    used.add(id);const model=models[id];
    const invitation=trainingInvitation({binding,model,policy,checkpoint});
    if(modelsSeen.has(invitation.adapter_namespace))throw Error('Agents cannot share adapter namespace');
    modelsSeen.add(invitation.adapter_namespace);return invitation;
  }));
}
module.exports={EXPERIMENT_SCHEMA,DATASET_SCHEMA,MANIFEST_SCHEMA,REVIEW_SCHEMA,
  trainingInvitation,makeTrainingManifest,reviewWeightUpdate,inviteConstellation};
