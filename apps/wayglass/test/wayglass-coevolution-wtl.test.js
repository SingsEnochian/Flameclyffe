import test from 'node:test';
import assert from 'node:assert/strict';
import co from '../../../lib/wayglass-coevolution.cjs';
import Mobius from '../../../lib/wayglass-mobius.cjs';
import { readFileSync } from 'node:fs';

const seeds=()=>({
  infrastructure:{queue_capacity:24,timeout_ms:1200},
  intelligence:{concurrency:4,context_tokens:2048},
});
const principal=Object.freeze({id:'participant:fixture',authorized:true});
function measured({
 source='baseline:1',date='2026-11-13T20:00:00.000Z',kind='simulation',
 p95=800,error=0.20,success=0.70,fallback=true,
}={}) {
 return {source_ref:source,observed_at:date,kind,
  network:{p95_ms:p95,error_rate:error},
  intelligence:{success_rate:success},fallback_independent:fallback};
}
const improvement=(options={})=>measured({
 source:'candidate:1',date:'2026-11-13T20:01:00.000Z',
 p95:480,error:0.05,success:0.85,...options,
});
const repair=()=>({
 infrastructure:{queue_capacity:20,timeout_ms:1450},
 intelligence:{concurrency:3,context_tokens:1792},
});
const expand=()=>({
 infrastructure:{queue_capacity:28,timeout_ms:1150},
 intelligence:{concurrency:5,context_tokens:2176},
});
const trial=(baseline=measured(),candidate=improvement(),configuration=repair())=>
 ({baseline,candidate,configuration});
const create=(options={})=>co.createCoEvolution({seeds:seeds(),
 participant_ref:'participant:fixture',...options});
const run=(engine,options={})=>engine.cycle({
 mode:'repair',observation:measured(),trial:trial(),decision:'defer',
 principal,...options,
});

test('both profiles are real executable Wyrdrune scoped eightfold programmes',()=>{
 for(const mode of co.MODES){
  const ir=co.wtlProgramme(mode);
  assert.equal(ir.schema,'wyrdrune.ir/v0.1');
  assert.equal(ir.units.length,1);
  assert.equal(ir.units[0].scope,'carried');
  assert.deepEqual(ir.units[0].phases.map(x=>x.phase),Mobius.PHASES);
  const path=new URL('../../../lib/wyrdrune/coevolution-'+mode+'.wtl',import.meta.url);
  const native=readFileSync(path,'utf8');
  assert.match(native,/require next_p95 <= base_p95/);
  assert.match(native,/carry queue_capacity =/);
  assert.match(native,/carry context_tokens =/);
  assert.match(native,/withness_relation/);
 }
});

test('Wyrdrune computes a verified reciprocal proposal without changing sandbox state',async()=>{
 const engine=create(),before=structuredClone(engine.configuration);
 const r=await run(engine);
 assert.equal(r.status,'proposed-only');
 assert.equal(r.changed,false);
 assert.deepEqual(r.proposal,repair());
 assert.deepEqual(engine.configuration,before);
 assert.equal(r.evidence_kind,'simulation');
 assert.equal(r.wtl_receipts.length,8);
 assert.equal(r.host_receipts.length,8);
 assert.equal(r.wtl_checkpoint.face,'outer');
 assert.equal(r.checkpoint.face,'outer');
 assert.equal(r.production_mutation,false);
 assert.equal(r.external_effects,false);
 assert.equal(r.model_invoked,false);
 assert.equal(r.persisted,false);
 assert.equal(r.canon_commit,false);
 assert.equal(r.authority_grant,false);
 assert.equal(Mobius.verifyChain(engine.root,[r.checkpoint]).ok,true);
});

test('owner-authorised sandbox carry changes both systems, returns and restores after interruption',async()=>{
 const engine=create();
 const accepted=await run(engine,{decision:'accept',approval_ref:'test:explicit-approval'});
 assert.equal(accepted.status,'accepted-sandbox-carry');
 assert.equal(accepted.changed,true);
 assert.deepEqual(engine.configuration,repair());
 assert.deepEqual(accepted.carry,repair());
 const resumed=create({previous:accepted.checkpoint});
 assert.deepEqual(resumed.configuration,repair());
 const baseline=measured({source:'baseline:calm',date:'2026-11-13T20:10:00.000Z',
   p95:300,error:0.02,success:0.85});
 const candidate=measured({source:'candidate:calm',date:'2026-11-13T20:11:00.000Z',
   p95:250,error:0.01,success:0.90});
 const configuration={infrastructure:{queue_capacity:24,timeout_ms:1400},
   intelligence:{concurrency:4,context_tokens:1920}};
 const second=await run(resumed,{mode:'expand',observation:baseline,
   trial:trial(baseline,candidate,configuration),
   decision:'accept',approval_ref:'test:restore-approval'});
 assert.equal(second.status,'accepted-sandbox-carry');
 assert.deepEqual(resumed.configuration,configuration);
 assert.equal(second.checkpoint.cycle,2);
 assert.equal(second.checkpoint.face,'inner');
 assert.equal(Mobius.verifyChain(engine.root,[accepted.checkpoint,second.checkpoint]).ok,true);
});

test('Wyrdrune declines ineligible or regressive trials before any host commit',async()=>{
 const cases=[
  {name:'no stress',options:{observation:measured({p95:100,error:0.01})}},
  {name:'regression',options:{trial:trial(measured(),improvement({p95:900}))}},
  {name:'failed fallback',options:{trial:trial(measured(),improvement({fallback:false}))}},
  {name:'different evidence kind',options:{trial:trial(measured(),improvement({kind:'instrument'}))}},
  {name:'incorrect configuration',options:{trial:trial(measured(),improvement(),expand())}},
  {name:'wrong baseline',options:{trial:trial(measured({source:'other'}),improvement())}},
  {name:'duplicate ref',options:{trial:trial(measured(),improvement({source:'baseline:1'}))}},
  {name:'candidate older than baseline',options:{trial:trial(measured(),improvement({date:'2026-11-13T19:01:00.000Z'}))}},
 ];
 for(const c of cases) {
  const engine=create();
  const r=await run(engine,c.options);
  assert.equal(r.status,'rolled-back',c.name);
  assert.equal(r.checkpoint,null,c.name);
  assert.deepEqual(engine.configuration,seeds(),c.name);
 }
});

test('explicit verified participant binding, bounded values, and mode are required',async()=>{
 const e=create();
 await assert.rejects(run(e,{principal:{id:'participant:fixture',authorized:false}}),/authority/);
 await assert.rejects(run(e,{principal:{id:'stranger',authorized:true}}),/authority/);
 await assert.rejects(run(e,{mode:'unauthorised'}),/mode/);
 await assert.rejects(run(e,{decision:'accept',approval_ref:null}),/approval_ref/);
 await assert.rejects(run(e,{trial:trial(measured(),improvement(),
   {...repair(),intelligence:{concurrency:900,context_tokens:1792}})}),/out of range/);
 assert.throws(()=>co.createCoEvolution({
  seeds:{infrastructure:{queue_capacity:10,timeout_ms:600},
   intelligence:{concurrency:22,context_tokens:512}},
  participant_ref:'participant:fixture'}),/out of range|exceeds/);
});

test('Feather stops before Wyrdrune execution, never starts a model or commits state',async()=>{
 const engine=create({feather:()=>true});
 const r=await run(engine,{decision:'accept',approval_ref:'test:yes'});
 assert.equal(r.status,'feather-stopped');
 assert.equal(engine.head,null);
 assert.deepEqual(engine.configuration,seeds());
 assert.equal(r.external_effects,false);
});

test('different participant cannot adopt restored checkpoint',async()=>{
 const original=create();
 const r=await run(original,{decision:'accept',approval_ref:'test:yes'});
 assert.throws(()=>co.createCoEvolution({seeds:seeds(),previous:r.checkpoint,
 participant_ref:'other:participant'}),/lineage/i);
});

test('read-only Wyrdrune bridge cannot silently claim FAA evidence or deploy externally',async()=>{
 const e=create();
 const r=await run(e,{decision:'accept',approval_ref:'test:only'});
 assert.equal(r.evidence_kind,'simulation');
 assert.equal(r.production_mutation,false);
 assert.equal(r.external_effects,false);
 assert.equal(r.weights_changed,undefined);
 assert.deepEqual(r.source_refs,['baseline:1','candidate:1']);
 assert.equal(r.wtl_execution_lineage.startsWith('wce1:'),true);
});
