import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Integrated from '../../../lib/wayglass-integrated-voyage.cjs';
import Mobius from '../../../lib/wayglass-mobius.cjs';
import {syntheticWayglassVoyage,runWayglassIntegratedVoyage} from '../src/integrated-voyage-client.js';
const principal={id:'house:steward',authorized:true};
const payload=(mythience=false)=>syntheticWayglassVoyage({includeFictionalMythience:mythience});
const options=(mythience=false)=>({...payload(mythience),principal});

test('Wyrdrune, tensor, mythience, Observer, autopoietic Octo and Return share a verified voyage',async()=>{
 const r=await Integrated.runIntegratedVoyage(options(true));
 assert.equal(r.status,'sandbox-return-verified');
 assert.equal(r.evolution.status,'proposed-only');
 assert.equal(r.evolution.wtl_receipts.length,8);
 assert.equal(r.evolution.host_receipts.length,8);
 assert.equal(r.tensor.backend,'cpu-reference');
 assert.equal(r.tensor.gpu_executed,false);
 assert.ok(Math.abs(r.tensor.baseline_minus_candidate[0]-320)<1e-12);
 assert.ok(Math.abs(r.tensor.baseline_minus_candidate[1]-0.15)<1e-12);
 assert.ok(Math.abs(r.tensor.baseline_minus_candidate[2]+0.15)<1e-12);
 assert.equal(r.mythience.status,'candidate-returned');
 assert.equal(r.mythience.phase_receipts.length,8);
 assert.equal(r.observer.phase_records,64);
 assert.ok(r.observer.source_state.every(x=>x.status==='unavailable'));
 assert.equal(r.autopoietic.outcome,'all-committed');
 assert.equal(r.return_verification.verdict,'accepted');
 assert.equal(r.departure.continuation_packet.participant_id,'house:steward');
 assert.equal(r.watercolor_event.receipt.receipt_id,r.receipt_id);
 assert.equal(r.production_mutation,false);
 assert.equal(r.model_invoked,false);
 assert.equal(r.canon_commit,false);
 assert.equal(r.persisted,false);
 assert.equal(Mobius.verifyChain(r.evolution.root,[r.evolution.checkpoint]).ok,true);
});

test('new FAEpunk controls select native repair or expansion and explicit sandbox carry',async()=>{
 const expanded=options();
 expanded.scenario=syntheticWayglassVoyage({mode:'expand'}).scenario;
 const proposal=await Integrated.runIntegratedVoyage(expanded);
 assert.equal(proposal.status,'sandbox-return-verified');
 assert.equal(proposal.evolution.proposal.infrastructure.queue_capacity,28);
 assert.equal(proposal.evolution.proposal.intelligence.concurrency,5);
 assert.equal(proposal.evolution.changed,false);
 const accepting=options();
 accepting.scenario=syntheticWayglassVoyage({mode:'expand',decision:'accept'}).scenario;
 const accepted=await Integrated.runIntegratedVoyage(accepting);
 assert.equal(accepted.status,'sandbox-return-verified');
 assert.equal(accepted.evolution.status,'accepted-sandbox-carry');
 assert.equal(accepted.evolution.changed,true);
 assert.equal(accepted.evolution.carry.infrastructure.queue_capacity,28);
 assert.equal(accepted.evolution.carry.intelligence.context_tokens,2176);
 assert.equal(accepted.persisted,false);
 const denied=options();
 denied.scenario=syntheticWayglassVoyage({mode:'repair',decision:'decline'}).scenario;
 const declined=await Integrated.runIntegratedVoyage(denied);
 assert.equal(declined.evolution.status,'declined');
 assert.equal(declined.evolution.changed,false);
});

test('uninvited Mythience is absent, rather than silently claimed',async()=>{
 const r=await Integrated.runIntegratedVoyage(options());
 assert.equal(r.status,'sandbox-return-verified');
 assert.equal(r.mythience,null);
 assert.equal(r.evolution.changed,false);
 assert.equal(r.evolution.carry.infrastructure.queue_capacity,24);
 assert.equal(r.evolution.carry.intelligence.concurrency,4);
});

test('regressions do not reach host scheduling or Return',async()=>{
 const input=options(true);
 input.scenario.trial.candidate.network.p95_ms=900;
 const r=await Integrated.runIntegratedVoyage(input);
 assert.equal(r.status,'refused');
 assert.equal(r.evolution.status,'rolled-back');
 assert.equal(r.autopoietic,null);
 assert.equal(r.observer,null);
 assert.equal(r.mythience,null);
 assert.equal(r.return_verification,null);
});

test('identity, evidence revocation, permission and Feather are effective',async()=>{
 const identity=options();
 identity.continuity.identity_declarations[0].participant_id='impostor';
 await assert.rejects(Integrated.runIntegratedVoyage(identity),/identity declaration/);
 await assert.rejects(Integrated.runIntegratedVoyage({...options(),principal:{id:'house:steward',authorized:false}}),/Authenticated/);
 const revoked=options();
 revoked.continuity.revoked_refs=['synthetic:wayglass-baseline:001'];
 await assert.rejects(Integrated.runIntegratedVoyage(revoked),/Revoked evidence/);
 const unapproved=options();
 unapproved.scenario.decision='accept';
 await assert.rejects(Integrated.runIntegratedVoyage(unapproved),/approval_ref/);
 assert.equal((await Integrated.runIntegratedVoyage({...options(),feather:()=>true})).status,'feather-stopped');
});

test('client paints only complete verified receipts and does not claim effects',async()=>{
 const result=await Integrated.runIntegratedVoyage(options());
 const painted=[];
 const data=await runWayglassIntegratedVoyage(payload(),{
  fetchImpl:async()=>({ok:true,json:async()=>result}),paint:event=>painted.push(event),
 });
 assert.equal(data.receipt_id,result.receipt_id);
 assert.equal(painted.length,1);
 assert.equal(painted[0].kind,'fold:witness');
 await assert.rejects(runWayglassIntegratedVoyage(payload(),{
  fetchImpl:async()=>({ok:true,json:async()=>({...result,return_verification:{verdict:'rejected'}})}),
  paint:event=>painted.push(event),
 }),/receipt is incomplete/);
 assert.equal(painted.length,1);
});

test('ship host binds verified Steward rather than accepting a caller-supplied principal',()=>{
 const router=readFileSync(new URL('../../starwell-server/wayglass/router.js',import.meta.url),'utf8');
 const stage=readFileSync(new URL('../server-stage.cjs',import.meta.url),'utf8');
 const systems=readFileSync(new URL('../src/surfaces/systems.js',import.meta.url),'utf8');
 const route=router.slice(router.indexOf("router.post('/wyrdrune/integrated-voyage'"),
  router.indexOf("router.post('/wyrdrune/mythience-hybrid'"));
 assert.match(route,/griffStewardAuthorized\(req\)/);
 assert.match(route,/principal:\{id:'house:steward',authorized:true\}/);
 assert.match(stage,/coevolution-repair\.wtl/);
 assert.match(stage,/coevolution-expand\.wtl/);
 assert.match(systems,/data-voyage-action/);
 assert.match(systems,/data-voyage-orbit/);
 assert.match(systems,/data-voyage-mode/);
 assert.match(systems,/data-voyage-voice/);
 assert.match(systems,/wayglassSomaticSound\.feather\(\)/);
});
