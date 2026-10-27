import test from 'node:test';
import assert from 'node:assert/strict';
import {quantumDensity,sampleQuantumBasis} from '../../../starwell/deep-observer/living-observer-quantum-core.js';
import {
  NIKOLA_HEART_BRAIN_SCHEMA,NIKOLA_HEART_BRAIN_RECEIPT,
  buildNikolaHeart,reasonNikolaBrain,updateNikolaBelief,deriveNikolaHeartBrain,
  runNikolaHeartBrainTrial,replayNikolaHeartBrain,
} from '../../../starwell/deep-observer/nikola-heart-brain.js';

const near=(a,b,eps=1e-11)=>assert.ok(Math.abs(a-b)<eps,'Expected '+a+' near '+b);
const start=()=>deriveNikolaHeartBrain({p0:.5,phaseRad:0,dephasing:.1,priorCoherent:.5});

test('heart drives a separate conditional brain without converting interpretation to evidence',()=>{
 const p=start();
 assert.equal(p.schema,NIKOLA_HEART_BRAIN_SCHEMA);
 assert.equal(p.heart.driver,'formal-quantum-mathematics');
 assert.equal(p.brain.schema,'wayglass.nikola-brain/v1');
 assert.equal(p.heart.quantum.schema,quantumDensity().schema);
 assert.equal(p.heart.spirituality.status,'interpretive, no numeric likelihood');
 assert.equal(p.heart.philosophy.status,'interpretive, no numeric likelihood');
 assert.equal(p.independent_observation,false);
 assert.equal(p.canon_authority,false);
 assert.equal(p.brain.prior.source.includes('NOT derived'),true);
});

test('brain selects X for phase=0, Y for phase=π/2; Z cannot distinguish path dephasing',()=>{
 const a=deriveNikolaHeartBrain({p0:.5,phaseRad:0,dephasing:.05});
 const b=deriveNikolaHeartBrain({p0:.5,phaseRad:Math.PI/2,dephasing:.05});
 assert.equal(a.brain.recommended_basis,'X');
 assert.equal(b.brain.recommended_basis,'Y');
 const z=a.brain.candidates.find(v=>v.basis==='Z');
 near(z.expected_information_gain_bits,0);
 assert.ok(a.brain.maximum_information_gain_bits>0.3);
 assert.ok(b.brain.maximum_information_gain_bits>0.3);
});

test('no fake gain when path eigenstate is already phase-invariant',()=>{
 const r=deriveNikolaHeartBrain({p0:1,phaseRad:.5,dephasing:.8});
 near(r.brain.maximum_information_gain_bits,0);
 assert.ok(r.brain.candidates.every(v=>v.discrimination<1e-10));
});

test('complete dephasing and coherent model predict distinct X outcomes with labelled assumptions',()=>{
 const {brain}=start();
 const x=brain.candidates.find(c=>c.basis==='X');
 near(x.p_plus_given_coherent,1);
 near(x.p_plus_given_dephased,.5);
 assert.deepEqual(brain.hypotheses.map(x=>x.id),['coherent','dephased']);
 assert.match(brain.alternatives[0],/partial dephasing/);
});

test('Bayes update with fully ideal simulated X+ counts favours coherent over dephased',()=>{
 const {brain}=start();
 const u=updateNikolaBelief(brain,{basis:'X',plus:100,minus:0});
 assert.equal(u.status,'conditional-on-specified-models');
 assert.ok(u.posterior[0]>.9999);
 near(u.posterior[0]+u.posterior[1],1);
});

test('outcomes incompatible with both endpoint hypotheses remain unresolved',()=>{
 const b=deriveNikolaHeartBrain({p0:1,phaseRad:0,dephasing:0}).brain;
 // both ideal models predict Z+ with probability one
 const u=updateNikolaBelief(b,{basis:'Z',plus:0,minus:64});
 assert.equal(u.posterior,null);
 assert.equal(u.status,'both-endpoint-models-rejected-by-observed-pattern');
});

test('posterior rejects forged likelihoods, forged priors, invalid counts and unsupported basis',()=>{
 const brain=start().brain;
 const forged=structuredClone(brain);forged.candidates[0].p_plus_given_coherent=.3;
 assert.throws(()=>updateNikolaBelief(forged,{basis:'X',plus:4,minus:2}),/inconsistent/);
 const forgedPrior=structuredClone(brain);forgedPrior.prior.dephased=.8;
 assert.throws(()=>updateNikolaBelief(forgedPrior,{basis:'X',plus:4,minus:2}),/inconsistent/);
 assert.throws(()=>updateNikolaBelief(brain,{basis:'Q',plus:4,minus:2}),/basis/);
 assert.throws(()=>updateNikolaBelief(brain,{basis:'X',plus:-1,minus:2}),/bounded/);
 assert.throws(()=>updateNikolaBelief(brain,{basis:'X',plus:0,minus:0}),/bounded/);
});

test('philosophical and spiritual choices can change question but not Born probabilities',()=>{
 const a=deriveNikolaHeartBrain({p0:.4,phaseRad:1,dephasing:.3,
  philosophy:'falsifiability',spirituality:'wonder'});
 const b=deriveNikolaHeartBrain({p0:.4,phaseRad:1,dephasing:.3,
  philosophy:'phenomenology',spirituality:'hermetic'});
 assert.deepEqual(a.heart.quantum,b.heart.quantum);
 assert.deepEqual(a.brain,b.brain);
 assert.notEqual(a.heart.spirituality.question,b.heart.spirituality.question);
 assert.notEqual(a.heart.philosophy.question,b.heart.philosophy.question);
 assert.throws(()=>buildNikolaHeart({spirituality:'certitude'}),/unsupported/);
});

test('basis-specific synthetic trial is seeded, reproducible, and never becomes an empirical observation',()=>{
 const a=sampleQuantumBasis({p0:.6,phaseRad:.9,dephasing:.25,basis:'Y',shots:512,seed:13});
 const b=sampleQuantumBasis({p0:.6,phaseRad:.9,dephasing:.25,basis:'Y',shots:512,seed:13});
 assert.deepEqual(a,b);
 assert.equal(a.plus+a.minus,512);
 assert.equal(a.physical_detector_used,false);
 assert.throws(()=>sampleQuantumBasis({basis:'magic'}),/invalid measurement basis/);
});

test('receipt contains heart, model comparison, detector and posterior, and replays exactly',async()=>{
 const settings={p0:.5,phaseRad:Math.PI/2,dephasing:.25,priorCoherent:.55,
  philosophy:'process',spirituality:'contemplative',shots:512,seed:104729};
 const r=await runNikolaHeartBrainTrial(settings);
 assert.equal(r.schema,NIKOLA_HEART_BRAIN_RECEIPT);
 assert.equal(r.detector.basis,'Y');
 assert.equal(r.detector.shots,512);
 assert.ok(r.update.posterior===null||Math.abs(r.update.posterior[0]+r.update.posterior[1]-1)<1e-10);
 assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.equal(r.provenance.no_live_qpu_or_sky_measurements,true);
 const replay=await replayNikolaHeartBrain(r);
 assert.equal(replay.matched,true);
 const rerun=await runNikolaHeartBrainTrial(settings);
 assert.deepEqual(r,rerun);
 const forged=structuredClone(r);forged.detector.plus++;
 await assert.rejects(replayNikolaHeartBrain(forged),/replay mismatch/);
 const altered=structuredClone(r);altered.frame.brain.maximum_information_gain_bits=0;
 await assert.rejects(replayNikolaHeartBrain(altered),/replay mismatch/);
 await assert.rejects(replayNikolaHeartBrain({schema:'wrong'}),/schema/);
});

test('broad phase, dephasing and priors remain mathematically well bounded',()=>{
 for(const p0 of [0,.15,.5,.85,1]){
  for(const phaseRad of [0,Math.PI/3,Math.PI/2,Math.PI,2*Math.PI]){
   for(const dephasing of [0,.1,.55,1]){
    for(const priorCoherent of [.001,.5,.999]){
      const {heart,brain}=deriveNikolaHeartBrain({p0,phaseRad,dephasing,priorCoherent});
      assert.equal(heart.quantum.density_matrix.trace,1);
      assert.ok(brain.candidates.every(v=>
        v.expected_information_gain_bits>=0&&v.expected_information_gain_bits<=1+1e-10));
    }
   }
  }
 }
});
