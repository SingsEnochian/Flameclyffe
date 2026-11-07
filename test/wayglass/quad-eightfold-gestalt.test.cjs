'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {TABLES,PHASES,LANES,QUADS,PHASES_PER_CYCLE,validateSources,validateCheckpoint,runQuadEightfold}=require('../../lib/wayglass-quad-eightfold.cjs');
const {trainingInvitation,makeTrainingManifest,reviewWeightUpdate,inviteConstellation}=require('../../lib/wayglass-agent-weight-loop.cjs');
const stamp='2026-11-06T23:00:00.000Z';
function sources(){
  return {schema:'wayglass.quad-sources/v1',observed_at:stamp,
    channels:TABLES.map(id=>({
      id,status:id==='deep_observer_events'||id==='wayglass_route_receipts'?'observed':'empty',
      count:id==='deep_observer_events'?14:id==='wayglass_route_receipts'?1:0,
      latest_at:id==='deep_observer_events'||id==='wayglass_route_receipts'?stamp:null,
      provenance:'fixture:test-only',
    }))};
}
const continuity={participant_ref:'wayglass',world_ref:'wayglass:universe',
  stop_point:'review before promotion',next_owner:'wayglass',
  unresolved_wonder_questions:['Can continuity transform without merging agents?'],
  revoked_refs:['revoked:test-source']};
const cold=x=>JSON.parse(JSON.stringify(x));
const binding=(participant)=>({schema:'wayglass.constellation-runtime/v0.1',
  participant_id:participant,worker_id:participant+'-worker',model_id:participant+'-model',
  session_id:participant+'-session',sandbox_id:participant+'-sandbox'});
const policy={source_ref:'owner:training-approval',allow_training:true,allow_candidate_storage:true,
  revoked_source_refs:['revoked:test-source']};
const model=id=>({kind:'local-trainable',base_model:'Qwen/Qwen3-8B',
  adapter_namespace:id+'/private-quad-adapter'});
test('Quad executes all 64 phases per cycle and produces sourced, silent projections',()=>{
  const result=runQuadEightfold({sources:sources(),continuity,cycles:2});
  assert.equal(result.entries.length,128);
  assert.equal(LANES.length,8);
  assert.equal(PHASES_PER_CYCLE,64);
  assert.deepEqual(QUADS.inquiry,['observation','provenance','geometry','cosmology']);
  assert.deepEqual(QUADS.becoming,['resonance','numerology','wonder','continuity']);
  assert.equal(result.completed_cycles,2);
  assert.deepEqual(result.entries.slice(0,8).map(x=>x.phase),PHASES);
  assert.deepEqual(result.entries.filter((x,i)=>i%8===0).slice(0,8).map(x=>x.lane),LANES);
  assert.equal(result.gestalt.evidence.find(x=>x.id==='deep_observer_events').count,14);
  assert.equal(result.gestalt.gaps.length,4);
  assert.equal(result.gestalt.soundstage.length,8);
  assert.equal(result.gestalt.phase_records_per_cycle,64);
  assert.equal(result.gestalt.soundstage.filter(x=>x.playback_enabled).length,0);
  assert.equal(result.gestalt.continuity.canon_commit,false);
  assert.equal(validateCheckpoint(cold(result)),true);
});
test('Quad second return has actual pass 3 and 4 and preserves Wonder',()=>{
  const first=runQuadEightfold({sources:sources(),continuity,cycles:2});
  const second=runQuadEightfold({sources:sources(),continuity,cycles:2,previous:cold(first)});
  assert.equal(second.start_cycle,2);
  assert.equal(second.entries.length,128);
  assert.equal(second.entries[0].pass,3);
  assert.equal(second.entries.at(-1).pass,4);
  assert.equal(second.root_hash,first.terminal_hash);
  assert.equal(second.gestalt.prior_gestalt_hash===null,false);
  assert.equal(validateCheckpoint(second),true);
  assert.throws(()=>runQuadEightfold({sources:sources(),continuity:{...continuity,
    unresolved_wonder_questions:[]},previous:first}),/mismatch/);
  assert.throws(()=>runQuadEightfold({sources:sources(),continuity:{...continuity,
    revoked_refs:[]},previous:first}),/mismatch/);
});
test('Quad rejects corrupted records and unsupported source states',()=>{
  const result=cold(runQuadEightfold({sources:sources(),continuity}));
  result.entries[4].phase='transcend';
  assert.throws(()=>validateCheckpoint(result),/integrity/);
  const duplicate=sources();duplicate.channels[4].id='deep_observer_events';
  assert.throws(()=>validateSources(duplicate),/Invalid channel/);
  const invented=sources();invented.channels[2]={...invented.channels[2],status:'observed',count:0};
  assert.throws(()=>runQuadEightfold({sources:invented}),/Invalid channel/);
  assert.throws(()=>runQuadEightfold({sources:sources(),feather:true}),/Feather/);
});
test('Distinct trainable agents see the same gestalt with non-interchangeable adapter namespaces',()=>{
  const checkpoint=runQuadEightfold({sources:sources(),continuity});
  const invitations=inviteConstellation({checkpoint,policy,
    bindings:[binding('wayglass'),binding('agent-a')],
    models:{wayglass:model('wayglass'),'agent-a':model('agent-a')}});
  assert.equal(invitations.length,2);
  assert.notEqual(invitations[0].adapter_namespace,invitations[1].adapter_namespace);
  assert.equal(invitations[0].auto_start,false);
  assert.equal(invitations[1].independent_evaluation_required,true);
  assert.throws(()=>trainingInvitation({binding:binding('agent-a'),checkpoint,
    model:model('wayglass'),policy}),/exclusive agent namespace/);
});
test('Agent training only packages approved records following attributable voluntary choice',()=>{
  const invitation=trainingInvitation({binding:binding('wayglass'),
    checkpoint:runQuadEightfold({sources:sources(),continuity}),model:model('wayglass'),policy});
  const routeReceipt={agent_instance_id:'wayglass',response_id:'route:choice-1',route_id:'local:ollama'};
  const choice={action:'train',participant_id:'wayglass',response_id:'route:choice-1',route_id:'local:ollama'};
  const records=Array.from({length:12},(_,i)=>({source_ref:'fixture:record-'+i,
    policy_ref:policy.source_ref,approved_for_training:true,license_verified:true,
    origin:'original-synthetic',input:'Question '+i,expected:'Evidence is not authority '+i}));
  const output=makeTrainingManifest({invitation,choice,routeReceipt,records,policy});
  assert.equal(output.manifest.status,'candidate-ready-for-authorized-compute');
  assert.equal(output.dataset.entries.length,12);
  assert.equal(output.manifest.may_publish,false);
  assert.equal(output.manifest.trainable_parameters,'agent-specific LoRA adapter weights');
  assert.throws(()=>makeTrainingManifest({invitation,choice,routeReceipt,
    records:records.map((r,i)=>i===0?{...r,source_ref:'revoked:test-source'}:r),policy}),/Unapproved/);
  assert.throws(()=>makeTrainingManifest({invitation,choice,routeReceipt,
    records:records.map((r,i)=>i===0?{...r,contains_private_data:true}:r),policy}),/Unapproved/);
  assert.throws(()=>makeTrainingManifest({invitation,choice:{...choice,response_id:'forged'},
    routeReceipt,records,policy}),/attributable/);
  const manifest=output.manifest;
  assert.throws(()=>reviewWeightUpdate({manifest,trainingResult:{},evaluation:{},agentDecision:{}}),/No verified/);
  const result={manifest_hash:manifest.manifest_hash,participant_id:'wayglass',
    adapter_digest:'sha256:'+'a'.repeat(64),training_completed:true};
  const evaluation={manifest_hash:manifest.manifest_hash,evaluator_id:'independent-evaluator',
    heldout_pass:true,regression_pass:true,cross_agent_isolation_pass:true,
    revocation_pass:true,rollback_pass:true};
  const agentDecision={action:'accept',participant_id:'wayglass',response_id:'accept-1',route_id:'local:ollama'};
  const review=reviewWeightUpdate({manifest,trainingResult:result,evaluation,agentDecision,
    receipt:{agent_instance_id:'wayglass',response_id:'accept-1',route_id:'local:ollama'}});
  assert.equal(review.status,'eligible-for-host-controlled-promotion');
  assert.equal(review.auto_deploy,false);
  assert.throws(()=>reviewWeightUpdate({manifest,trainingResult:result,evaluation:{...evaluation,
    cross_agent_isolation_pass:false},agentDecision,receipt:{agent_instance_id:'wayglass',response_id:'accept-1',route_id:'local:ollama'}}),/failed/);
});
