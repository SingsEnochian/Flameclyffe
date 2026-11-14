'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runIntegratedVoyage, tensorDiagnostics, SCHEMA } = require('../../lib/wayglass-integrated-voyage.cjs');
const { verifyChain } = require('../../lib/wayglass-mobius.cjs');
const { digest } = require('../../lib/wyrdrune/canonical.cjs');

const principal = {id:'participant:integration-fixture',authorized:true};
const seeds = {
  infrastructure:{queue_capacity:24,timeout_ms:1200},
  intelligence:{concurrency:4,context_tokens:2048},
};
const baseline = {
  kind:'simulation',source_ref:'fixture:baseline',observed_at:'2026-11-13T20:00:00Z',
  network:{p95_ms:800,error_rate:0.2},intelligence:{success_rate:0.7},
  fallback_independent:true,
};
const candidate = {
  kind:'simulation',source_ref:'fixture:trial',observed_at:'2026-11-13T20:01:00Z',
  network:{p95_ms:480,error_rate:0.05},intelligence:{success_rate:0.85},
  fallback_independent:true,
};
const configuration = {
  infrastructure:{queue_capacity:20,timeout_ms:1450},
  intelligence:{concurrency:3,context_tokens:1792},
};
const crossing = () => ({
  traveller_id:'traveller:fixture',origin_universe:'universe:verdant',
  destination_universe:'universe:aurora',
  ability:{id:'ability:light',origin_universe:'universe:verdant',modality:'magic'},
  history:[],field:{intention:0.9,shifting:0.9,porosity:0.9,resonance:0.9,compatibility:0.9},
  consent:{traveller:true,origin:true,destination:true},event_id:'event:fixture',
});
const input = () => ({
  principal, world_id:'wayglass:integration-fixture',next_owner:principal.id,
  identity_declarations:[{participant_id:principal.id,declaration:'caller-supplied fixture identity'}],
  coevolution:{mode:'repair',seeds,observation:baseline,
    trial:{baseline,candidate,configuration}},
  mythience:{request:crossing()},
  recorded_at:'2026-11-13T20:02:00Z',
});

test('one ship joins four distinct engines and holds identity, source and Return boundaries',async()=>{
  const r=await runIntegratedVoyage(input());
  assert.equal(r.schema,SCHEMA);
  assert.equal(r.status,'connected-sandbox-preview');
  assert.equal(r.coevolution.status,'proposed-only');
  assert.deepEqual(r.coevolution.proposed_configuration,configuration);
  assert.equal(r.mythience.status,'candidate-returned');
  assert.equal(r.mythience.candidate.ability.id,'ability:light');
  assert.equal(r.tensor.backend,'cpu-reference');
  assert.equal(r.tensor.gpu_executed,false);
  assert.deepEqual(r.tensor.delta,[320,0.15000000000000002,-0.15000000000000002]);
  assert.equal(r.runtime.participant_count,1);
  assert.equal(r.runtime.center,'withness');
  assert.equal(r.runtime.checkpoint.carry.completed_voyages,1);
  assert.equal(r.observer.source_status.length,6);
  assert.ok(r.observer.source_status.every(s=>s.status==='unavailable'));
  assert.equal(r.visualisation_proposal.kind,'fold:witness');
  assert.equal(r.visualisation_proposal.autoplay,false);
  assert.equal(r.departure.continuation_packet.participant_id,principal.id);
  assert.equal(r.return_verification.verdict,'accepted');
  assert.equal(r.production_mutation,false);
  assert.equal(r.model_weight_updates,false);
  assert.equal(r.hardware_invoked,false);
  assert.equal(r.model_invoked,false);
  assert.equal(r.persisted,false);
  assert.equal(r.canon_commit,false);
  assert.equal(r.identity_commit,false);
  assert.equal(r.authority_grant,false);
  assert.match(r.runtime.receipt_hash,/^wce1:/);
  assert.match(r.coevolution.native_wtl,/^[a-f0-9]{64}$/);
  assert.match(r.mythience.native_wtl,/^[a-f0-9]{64}$/);
});

test('tensor diagnostics actually execute native numerical graph; not hardcoded scoring',()=>{
 const first=tensorDiagnostics(baseline,candidate);
 const second=tensorDiagnostics(baseline,{
   ...candidate,network:{...candidate.network,p95_ms:700},
 });
 assert.deepEqual(first.delta,[320,0.15000000000000002,-0.15000000000000002]);
 assert.equal(second.delta[0],100);
 assert.equal(first.program_fingerprint,second.program_fingerprint);
 assert.notEqual(first.input_fingerprint,second.input_fingerprint);
});

test('WTL failure prevents downstream observer, visualisation, and Return artifacts',async()=>{
 const x=input();
 x.coevolution.trial={...x.coevolution.trial,candidate:{
   ...candidate,network:{...candidate.network,error_rate:0.9},
 }};
 const r=await runIntegratedVoyage(x);
 assert.equal(r.status,'refused-or-feather-stopped');
 assert.equal(r.coevolution_status,'rolled-back');
 assert.equal(r.departure,null);
 assert.equal(r.production_mutation,false);
});

test('Mythience refusal never becomes a fake physical crossing or a voyage checkpoint',async()=>{
 const x=input();x.mythience.request.consent.destination=false;
 const r=await runIntegratedVoyage(x);
 assert.equal(r.status,'refused-or-feather-stopped');
 assert.equal(r.mythience_status,'denied');
 assert.equal(r.departure,null);
});

test('Feather and false credentials prevent any Wyrdrune integration',async()=>{
 assert.deepEqual((await runIntegratedVoyage({...input(),feather:()=>true})).status,'feather-stopped');
 await assert.rejects(runIntegratedVoyage({...input(),principal:{...principal,authorized:false}}),/Authenticated principal/);
 await assert.rejects(runIntegratedVoyage({...input(),identity_declarations:[]}),/identity declarations/);
});

test('Observer source metadata stays independent and never becomes invented observed telemetry',async()=>{
 const x=input();
 const sourceRows = [
   'deep_observer_events','observer_measurements','wayglass_route_receipts',
   'house_runtime_events','math_spine_packets','source_library_query_receipts',
 ].map(id=>({id,status:'unavailable',count:null,latest_at:null,provenance:'fixture:not-configured'}));
 x.observer={
   sources:{schema:'wayglass.quad-sources/v1',observed_at:x.recorded_at,channels:sourceRows},
   continuity:{participant_ref:principal.id,world_ref:x.world_id,
     next_owner:principal.id,stop_point:'Hold the return',
     unresolved_wonder_questions:['What persists?'],revoked_refs:[]},
 };
 const r=await runIntegratedVoyage(x);
 assert.equal(r.status,'connected-sandbox-preview');
 assert.deepEqual(r.departure.continuation_packet.unresolved_wonder_questions,['What persists?']);
 assert.equal(r.return_verification.verdict,'accepted');
 assert.equal(r.observer.derived_visual_only,true);
});
