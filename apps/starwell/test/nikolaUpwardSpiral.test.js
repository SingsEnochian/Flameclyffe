import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NIKOLA_SPIRAL_SCHEMA, deriveOscillatorInvariant, createNikolaSpiral,
  advanceNikolaSpiral, replayNikolaSpiral, witnessMathSpine,
} from '../src/math-spine/nikola-upward-spiral.js';
import { createMathSpinePacket } from '../src/math-spine/math-spine-packet.js';

const baseline={stiffness:12,stiffness_unit:'N/m',mass:3,mass_unit:'kg'};
const origin={id:'synthetic-frequency',family:'fixture-frequency',kind:'synthetic'};
const measurement=(kind,value)=>({kind,value,unit:kind==='stiffness'?'N/m':'kg'});
const source=(id,family=id)=>({id,family,kind:'synthetic'});
const start=()=>createNikolaSpiral({baseline,frequencyRatio:1.5,source:origin});

test('compression derives exact dimensioned invariant and releases an infinite solution family',()=>{
 const r=deriveOscillatorInvariant(baseline,1.5);
 assert.equal(r.compression.stiffness_to_mass_ratio_factor,2.25);
 assert.equal(r.compression.target_stiffness_per_mass,9);
 assert.equal(r.release.stiffness_only.stiffness_N_per_m,27);
 assert.ok(Math.abs(r.release.mass_only.mass_kg-4/3)<1e-12);
 assert.ok(Math.abs(r.observation.final_frequency_hz-1.5/Math.PI)<1e-12);
 assert.match(r.release.mixed_family,/infinite continuum/);
 assert.equal(r.physical_measurement_claim,false);
});

test('invalid units, zero, NaN and infinity fail before inference',()=>{
 assert.throws(()=>deriveOscillatorInvariant({...baseline,mass_unit:'g'},1.5),/SI unit/);
 assert.throws(()=>deriveOscillatorInvariant({...baseline,mass:0},1.5),/positive/);
 assert.throws(()=>deriveOscillatorInvariant({...baseline,stiffness:Infinity},1.5),/positive/);
 assert.throws(()=>deriveOscillatorInvariant(baseline,NaN),/positive/);
 assert.throws(()=>deriveOscillatorInvariant(baseline,1e11),/derived/);
});

test('no independent measurement leaves stiffness and mass underdetermined',async()=>{
 const s=await start();
 assert.equal(s.schema,NIKOLA_SPIRAL_SCHEMA);
 assert.equal(s.projection.conditional_state,null);
 assert.equal(s.projection.evidence_state,'frequency-alone-underdetermined');
 const replay=await replayNikolaSpiral(s);
 assert.equal(replay.matched,true);assert.equal(replay.rounds,0);
});

test('release admits a new independent stiffness reading and infers joint change',async()=>{
 const s=await start();
 const next=await advanceNikolaSpiral(s,{measurement:measurement('stiffness',24),source:source('k-independent','k-lab')});
 assert.equal(s.rounds.length,0);
 assert.equal(next.rounds.length,1);
 assert.equal(next.projection.conditional_state.stiffness_N_per_m,24);
 assert.ok(Math.abs(next.projection.conditional_state.mass_kg-8/3)<1e-12);
 assert.equal(next.projection.conditional_state.classification,'requires-joint-change-under-model');
 assert.equal(next.projection.conditional_state.independent_measurement_authenticated,false);
 assert.equal(next.rounds[0].next_operation,'compression-of-release');
 assert.equal((await replayNikolaSpiral(next)).head_fingerprint,next.head_fingerprint);
});

test('mass reading infers stiffness and identifies stiffness-only or mass-only limit',async()=>{
 const startState=await start();
 const a=await advanceNikolaSpiral(startState,{measurement:measurement('mass',3),source:source('mass-a')});
 assert.equal(a.projection.conditional_state.classification,'compatible-with-stiffness-only');
 assert.equal(a.projection.conditional_state.stiffness_N_per_m,27);
 const b=await advanceNikolaSpiral(startState,{measurement:measurement('stiffness',12),source:source('k-a')});
 assert.equal(b.projection.conditional_state.classification,'compatible-with-mass-only');
});

test('same origin family cannot promote duplicate into independent evidence',async()=>{
 const one=await advanceNikolaSpiral(await start(),{measurement:measurement('stiffness',24),source:source('k-first','same-origin')});
 const two=await advanceNikolaSpiral(one,{measurement:measurement('stiffness',27),source:source('k-echo','same-origin')});
 assert.equal(two.rounds[1].status,'held-shared-source-origin');
 assert.equal(two.projection.conditional_state.stiffness_N_per_m,24);
 assert.equal((await replayNikolaSpiral(two)).rounds,2);
});

test('identical provenance as frequency origin cannot masquerade as new observation',async()=>{
 const s=await advanceNikolaSpiral(await start(),{measurement:measurement('stiffness',27),source:source('echo-frequency','fixture-frequency')});
 assert.equal(s.rounds[0].status,'held-shared-source-origin');
 assert.equal(s.projection.conditional_state,null);
});

test('replay rejects forged observations, changed physics, and rewritten receipts',async()=>{
 const s=await advanceNikolaSpiral(await start(),{measurement:measurement('stiffness',24),source:source('k-a')});
 const forged=structuredClone(s);forged.rounds[0].measurement.value=27;
 await assert.rejects(replayNikolaSpiral(forged),/fingerprint mismatch/);
 const edited=structuredClone(s);edited.projection.conditional_state.mass_kg=1;
 await assert.rejects(replayNikolaSpiral(edited),/differs/);
 const altered=structuredClone(s);altered.origin.baseline.mass=10;
 await assert.rejects(replayNikolaSpiral(altered),/fingerprint mismatch|differs/);
 await assert.rejects(advanceNikolaSpiral(forged,{measurement:measurement('mass',3),source:source('mass-b')}),/fingerprint mismatch/);
});

test('bounded recursion is explicit and capped at 12 rounds',async()=>{
 let s=await start();
 for(let i=0;i<12;i++) s=await advanceNikolaSpiral(s,{
   measurement:measurement('mass',3+i/100),source:source('source-'+i)});
 assert.equal(s.rounds.length,12);
 await assert.rejects(advanceNikolaSpiral(s,{measurement:measurement('mass',5),source:source('source-13')}),/cycle limit/);
});

function component(value,derivative=0){
 return {value,derivative,uncertainty:.05,confidence:.9,contributors:[]};
}
const premaq={
 schema_version:'2.0.0',id:'nikola-premaq-fixture',observed_at:'2026-08-11T18:00:00.000Z',
 registry_version:'premaq-registry/2.0',receipt_id:'nikola-premaq-receipt',sequence:913,
 prior_state_ref:null,model_version:'observer/2.0',provenance_refs:['nikola:synthetic-fixture'],
 qualia:{schema:'premaqc.qualia-report/v1',present:null,authority:'unresolved',inferred:false,report_receipt_id:null,observed_at:null,report:null},
 state:{
   P:component(.78,.02),C:component(.82,.01),R:component(.88,.03),
   E:component(.31,.01),M:component(.71,.02),A:component(.79,.01),
   Q:component(0,0),
 },
};
const jacobian=[[1,0,0,0,0,0,0],[0,1,0,0,0,0,0],[0,0,1,0,0,0,0],
 [0,0,0,1,0,0,0],[0,0,0,0,1,0,0],[0,0,0,0,0,1e-10,0],[0,0,0,0,0,0,1]];
const worldProfile={
 worldId:'terra-aeterna',focusAxis:'R',enterThreshold:.82,releaseThreshold:.68,
 compressionGain:1,releaseFraction:.35,derivativeRelease:.08,memoryRelease:.04,
 phaseReleaseGain:Math.PI/4,radialGain:.5,entropyGain:.1,angularGain:Math.PI/3,
 temporalWeights:{fold:.55,derivative:.2,entropy:.15,phase:.1},
 tone:{worldId:'terra-aeterna',toneLayerId:'fixture-unapproved',rootHz:220,
 excursion:5,approvalState:'pending',approvalReceiptId:null},
};
const canonical=()=>createMathSpinePacket({premaq,jacobian,worldProfile,generatedAt:'2026-08-11T18:01:00.000Z'});

test('canonical PREMAQC Math Spine read-only witness verifies a real replay',async()=>{
 const packet=await canonical();
 const w=await witnessMathSpine(packet);
 assert.equal(w.matched,true);
 assert.equal(w.replay_fingerprint,packet.packet_fingerprint);
 assert.equal(w.source_fingerprint,packet.source_fingerprint);
 assert.equal(w.compression_cycle,1);
 assert.equal(w.next_operation,'compression-of-release');
 assert.equal(w.evidence_is_not_auto_admitted,true);
 assert.equal(w.no_physical_measurement_or_participant_authority_claim,true);
 assert.deepEqual(w.source_provenance_refs,['nikola:synthetic-fixture']);
});

test('canonical bridge rejects source mutations and derived change even with intact schema',async()=>{
 const p=await canonical();
 const tampered=structuredClone(p);tampered.input.world_profile.compressionGain=3;
 await assert.rejects(witnessMathSpine(tampered),/replay mismatch/);
 const altered=structuredClone(p);altered.source.provenance_refs.push('forged');
 await assert.rejects(witnessMathSpine(altered),/source fingerprint mismatch/);
 await assert.rejects(witnessMathSpine({schema:'alternative',packet_id:'x'}),/canonical Math Spine packet/);
});

test('upward spiral retains compatible independent k and m measurements',async()=>{
 let p=await start();
 p=await advanceNikolaSpiral(p,{measurement:measurement('stiffness',24),source:source('ind-k')});
 p=await advanceNikolaSpiral(p,{measurement:measurement('mass',8/3),source:source('ind-m')});
 assert.equal(p.projection.evidence_state,'conditional-on-caller-declared-independent-measurement');
 assert.equal(p.projection.conditional_state.stiffness_directly_measured,true);
 assert.equal(p.projection.conditional_state.mass_directly_measured,true);
 assert.deepEqual(p.projection.conditional_state.measurement_sources,['ind-k','ind-m']);
 assert.equal((await replayNikolaSpiral(p)).matched,true);
});

test('contradictory independent measurements are never silently superseded',async()=>{
 let p=await start();
 p=await advanceNikolaSpiral(p,{measurement:measurement('stiffness',24),source:source('ind-k')});
 p=await advanceNikolaSpiral(p,{measurement:measurement('mass',3),source:source('ind-m')});
 assert.equal(p.projection.evidence_state,'inconsistent-independent-measurements');
 assert.equal(p.projection.conditional_state.classification,'conflicting-under-ideal-model');
 assert.match(p.projection.conditional_state.conflicts.join(' '),/disagrees/);
 assert.deepEqual(p.projection.conditional_state.measurement_sources,['ind-k','ind-m']);
 assert.equal((await replayNikolaSpiral(p)).matched,true);
});

test('conflicting repeat of same type is retained as disagreement, not replacement',async()=>{
 let p=await start();
 p=await advanceNikolaSpiral(p,{measurement:measurement('stiffness',24),source:source('ind-k1')});
 p=await advanceNikolaSpiral(p,{measurement:measurement('stiffness',27),source:source('ind-k2')});
 assert.equal(p.projection.evidence_state,'inconsistent-independent-measurements');
 assert.ok(p.projection.conditional_state.conflicts.some(x=>x.includes('stiffness measurements disagree')));
});
