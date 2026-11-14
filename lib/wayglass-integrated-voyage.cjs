'use strict';
// One authenticated, reversible, evidence-bounded Wayglass integration voyage.
// This is an adapter over native Wyrdrune, Tensor, Mythience, autopoietic,
// Quad Observer, and Return Engine. None is copied into a second kernel.
const { createCoEvolution, measurement } = require('./wayglass-coevolution.cjs');
const { proposeCrossing } = require('./wayglass-mythience-crossing.cjs');
const { createAutopoieticRuntime } = require('./wayglass-autopoietic-runtime.cjs');
const { runQuadEightfold, TABLES } = require('./wayglass-quad-eightfold.cjs');
const { createWayglassDeparture } = require('./wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('./wayglass-return-trial.cjs');
const { executeTensorIR } = require('./wyrdrune/tensor-engine.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.integrated-voyage/v0.1';
const TENSOR_GRAPH = Object.freeze({
  schema: 'wyrdrune.tensor-ir/v0.1',
  inputs: [
    { id: 'baseline', shape: [3], dtype: 'f64' },
    { id: 'candidate', shape: [3], dtype: 'f64' },
  ],
  nodes: [{ id: 'delta', op: 'sub', args: ['baseline', 'candidate'] }],
  outputs: ['delta'],
});
function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 ||
    /[\u0000-\u001f]/u.test(value)) throw new TypeError(field + ' must be bounded text');
  return value.trim();
}
function checkPlain(value, keys, field) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).sort().join('|') !== keys.slice().sort().join('|')) {
    throw new TypeError(field + ' has an unsupported or missing field');
  }
}
function defaultUnavailableSources(timestamp) {
  return Object.freeze({
    schema: 'wayglass.quad-sources/v1',
    observed_at: timestamp,
    channels: TABLES.map(id => ({
      id, status: 'unavailable', count: null, latest_at: null,
      provenance: 'no-authorised-source-adapter',
    })),
  });
}
function continuityEnvelope(continuity, participantId) {
  checkPlain(continuity, [
    'world_id', 'identity_declarations', 'stop_point', 'next_owner',
    'unresolved_wonder_questions', 'revoked_refs',
  ], 'continuity');
  const world = requiredString(continuity.world_id,'world_id');
  const identity=continuity.identity_declarations;
  if (!Array.isArray(identity) || identity.length<1 || identity.length>8 ||
      !identity.some(r=>r && r.participant_id===participantId && typeof r.declaration==='string' && r.declaration.trim())) {
    throw new Error('Return identity declaration must identify authenticated participant');
  }
  if (!Array.isArray(continuity.unresolved_wonder_questions) ||
      continuity.unresolved_wonder_questions.length>16 ||
      !continuity.unresolved_wonder_questions.every(x=>typeof x==='string' && x.length<=1000) ||
      !Array.isArray(continuity.revoked_refs) || continuity.revoked_refs.length>64 ||
      !continuity.revoked_refs.every(x=>typeof x==='string' && x.length<=500)) {
    throw new TypeError('Invalid wonder or revocation lineage');
  }
  return Object.freeze({
    world_id: world,
    identity_declarations: identity.map(x=>Object.freeze({...x})),
    stop_point: requiredString(continuity.stop_point,'stop_point'),
    next_owner: requiredString(continuity.next_owner,'next_owner'),
    unresolved_wonder_questions:[...continuity.unresolved_wonder_questions],
    revoked_refs:[...continuity.revoked_refs],
  });
}
function tensorComparison(baseline, candidate, feather) {
  if (feather()) throw new Error('Feather: tensor comparison stopped');
  const values = measurement(baseline), next = measurement(candidate);
  const coords = v => [v.network.p95_ms,v.network.error_rate,v.intelligence.success_rate];
  const result = executeTensorIR(TENSOR_GRAPH, {
    baseline: coords(values), candidate: coords(next),
  },{signal:{get aborted(){return Boolean(feather());}}});
  return Object.freeze({
    schema:result.schema,backend:result.execution.backend,
    program_fingerprint:result.programFingerprint,
    feeds_digest:result.feedsDigest,
    // Elementwise differences with separately labelled and differently scaled axes.
    axes:['p95_latency_ms','network_error_fraction','intelligence_success_fraction'],
    baseline_minus_candidate:result.outputs.delta.values,
    authorisation:'measurement-only; native Wyrdrune Verify decides acceptance',
    assurance:'CPU reference, no independent backend or physical hardware attestation',
    gpu_executed:false,
  });
}
async function runIntegratedVoyage({
  principal, scenario, continuity, observer_sources=null, feather=()=>false,
}={}) {
  if (!principal || principal.authorized!==true ||
      typeof principal.id!=='string') throw new Error('Authenticated House Steward principal required');
  const id=requiredString(principal.id,'principal.id');
  if (typeof feather!=='function') throw new TypeError('Feather must be a callable local gate');
  checkPlain(scenario, [
    'mode','seeds','observation','trial','decision','approval_ref','mythience_request',
  ],'scenario');
  if (feather()) return Object.freeze({schema:SCHEMA,status:'feather-stopped',production_mutation:false});
  const packet=continuityEnvelope(continuity,id);
  const observed=measurement(scenario.observation);
  // Never build a new measurement or claim a real source from an inference.
  if (!scenario.trial || !scenario.trial.candidate) throw new TypeError('Explicit paired candidate trial required');
  const candidate=measurement(scenario.trial.candidate);
  const tensor=tensorComparison(observed,candidate,feather);

  const engine=createCoEvolution({seeds:scenario.seeds,participant_ref:id,feather});
  const evolution=await engine.cycle({
    mode:scenario.mode,observation:observed,trial:scenario.trial,
    decision:scenario.decision,approval_ref:scenario.approval_ref,principal:{id,authorized:true},
  });
  if (evolution.status==='rolled-back' || evolution.status==='feather-stopped') {
    return Object.freeze({
      schema:SCHEMA,status:'refused',participant_ref:id,reason:evolution.reason||evolution.status,
      evolution,tensor,observer:null,mythience:null,autopoietic:null,return_verification:null,
      production_mutation:false,canon_commit:false,model_invoked:false,
    });
  }
  if (feather()) return Object.freeze({schema:SCHEMA,status:'feather-stopped',production_mutation:false});
  // Mythience is an independent native WTL proposal; no permission is synthesized.
  const mythience=scenario.mythience_request===null ? null :
    await proposeCrossing(scenario.mythience_request,{
      principal:{id,authorized:true},
      signal:{get aborted(){return Boolean(feather());}},
    });
  if (feather()) return Object.freeze({schema:SCHEMA,status:'feather-stopped',production_mutation:false});
  const observer=runQuadEightfold({
    sources:observer_sources || defaultUnavailableSources(observed.observed_at),
    continuity:{
      participant_ref:id,world_ref:packet.world_id,
      stop_point:packet.stop_point,next_owner:packet.next_owner,
      unresolved_wonder_questions:packet.unresolved_wonder_questions,
      revoked_refs:packet.revoked_refs,
    },cycles:1,
  });
  if (feather()) return Object.freeze({schema:SCHEMA,status:'feather-stopped',production_mutation:false});
  const autonomy=createAutopoieticRuntime({feather:()=>feather()});
  autonomy.register({
    participant_id:id, world_id:packet.world_id,
    // The authenticated participant is the owner; the worker is an instrument.
    worker_id:'worker:integrated-voyage',model_id:null,session_id:null,
    seeds:{cycles:0},intent:'observe native-Wyrdrune reciprocal voyage',
    phases:{
      perceive:async ctx=>{ctx.possibility('gathered',3);return {
        observed_source:observed.source_ref,wtl:evolution.wtl_source_hash,
        tensor:tensor.program_fingerprint,observer:observer.gestalt_hash};},
      compress:async()=>({source_kind:observed.kind,projection:'bounded'}),
      release:async ctx=>{ctx.possibility('generated',1);return {
        evolution:evolution.status,mythience:mythience?.status||'not-invited'};},
      verify:async()=>[{ok:Boolean(evolution.wtl_checkpoint)&&Boolean(evolution.checkpoint),
        reason:'WTL co-evolution checkpoint absent'}],
      integrate:async()=>({observer_hash:observer.hash,
        mythience_source:mythience?.source_hash||null}),
      choose:async()=>({proposal_only:true,permission_granted:false}),
      transcend:async ctx=>({cycles:ctx.carried.cycles+1}),
    },
  });
  const scheduler=await autonomy.run({cycles:1});
  if (scheduler.outcome!=='all-committed') {
    return Object.freeze({
      schema:SCHEMA,status:'scheduler-refused',
      reason:scheduler.outcome,evolution,tensor,observer,mythience,
      autopoietic:scheduler,return_verification:null,production_mutation:false,
    });
  }
  if (feather()) return Object.freeze({schema:SCHEMA,status:'feather-stopped',production_mutation:false});
  const provenance=[
    observed.source_ref,candidate.source_ref,
    'wyrdrune-coevolution:'+evolution.wtl_source_hash,
    'wyrdrune-tensor:'+tensor.program_fingerprint,
    'wayglass-quad:'+observer.hash,
    'wayglass-autopoietic:'+scheduler.receipt_hash,
    ...(mythience?['wyrdrune-mythience:'+mythience.source_hash]:[]),
  ];
  if (packet.revoked_refs.some(x=>provenance.includes(x)))
    throw new Error('Revoked evidence cannot enter a new Return packet');
  const stopId=digest({schema:SCHEMA,id,provenance,checkpoint:evolution.checkpoint});
  const marker=stopId.slice(5,37);
  const departure=createWayglassDeparture({
    receipt_id:'integrated-voyage-stop:'+marker,
    packet_id:'integrated-voyage-return:'+marker,
    participant_id:id,world_id:packet.world_id,stopped_at:observed.observed_at,
    reason:'integrated-sandbox-voyage',
    identity_declarations:packet.identity_declarations,
    active_work:[{
      work_id:'wayglass:integrated-voyage',
      status:'sandbox-evaluated',co_evolution_root:evolution.root,
      autopoietic_receipt:scheduler.receipt_hash,
    }],
    unresolved_wonder_questions:packet.unresolved_wonder_questions,
    revoked_refs:packet.revoked_refs,
    provenance_refs:provenance,
    stop_point:packet.stop_point,next_owner:packet.next_owner,
    alternatives:[{
      source_ref:observed.source_ref,perspective:'baseline',
      kind:observed.kind,status:'unresolved-real-world-causation',
    },{
      source_ref:candidate.source_ref,perspective:'candidate-trial',
      kind:candidate.kind,status:'simulation-or-instrument-evidence',
    }],
  });
  const returned=evaluateReturnAttempt({
    attempt_id:'integrated-voyage-check:'+marker,
    recorded_at:observed.observed_at,
    stop_receipt:departure.stop_receipt,
    continuation_packet:departure.continuation_packet,
  });
  if (returned.verdict!=='accepted') throw new Error('Return verification failed');
  const body={
    schema:SCHEMA,status:'sandbox-return-verified',participant_ref:id,
    world_ref:packet.world_id,evidence_kind:observed.kind,
    evolution,tensor,
    mythience,observer: {
      schema:observer.schema,hash:observer.hash,gestalt_hash:observer.gestalt_hash,
      phase_records:observer.entries.length,
      source_state:observer.source_packet.channels.map(c=>({id:c.id,status:c.status})),
      asserted_by:'caller; host has not verified adapter origin',
    },
    autopoietic:{
      schema:scheduler.schema,receipt_hash:scheduler.receipt_hash,
      outcome:scheduler.outcome,participants:scheduler.participants.map(p=>({
        participant_id:p.participant_id,world_id:p.world_id,
        status:p.status,checkpoint:p.checkpoint,
      })),
      peak_concurrency:scheduler.concurrency,
    },
    departure,
    return_verification:returned,
    source_refs:provenance,
    external_effects:false,production_mutation:false,
    model_invoked:false,model_weight_updates:false,
    canon_commit:false,identity_commit:false,authority_grant:false,
    persisted:false,
  };
  const receiptId=digest(body);
  return Object.freeze({
    ...body,receipt_id:receiptId,
    watercolor_event:{
      kind:'fold:witness',actor:'wayglass:integrated-voyage',
      receipt:{schema:SCHEMA,receipt_id:receiptId},
      intensity:0.65,source_register:observed.kind,
      authority:'render-only; no automatic playback',
    },
  });
}
module.exports={SCHEMA,TENSOR_GRAPH,defaultUnavailableSources,tensorComparison,
  continuityEnvelope,runIntegratedVoyage};
