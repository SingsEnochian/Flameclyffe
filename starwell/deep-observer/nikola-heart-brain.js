/**
 * Nikola N-009 Heart → Brain inquiry.
 *
 * HEART: source-bound mathematical quantum state + philosophical/spiritual
 * questions as *interpretive lenses*, not fabricated physical measurements.
 *
 * BRAIN: mutually competing, falsifiable model hypotheses; candidate
 * measurement axes and expected information gains; explicit synthetic
 * observation; Bayes update only for these conditional hypotheses.
 *
 * No general probability of "truth", metaphysical reality, consciousness,
 * real astrophysics or identity. No network, provider, persistent memory.
 */
import {
 quantumDensity,sampleQuantumBasis,
} from './living-observer-quantum-core.js';

export const NIKOLA_HEART_BRAIN_SCHEMA='wayglass.nikola-heart-brain/v1';
export const NIKOLA_HEART_BRAIN_RECEIPT='wayglass.nikola-heart-brain-receipt/v1';
const MEASUREMENTS=Object.freeze(['X','Y','Z']);
const PHILOSOPHY={
  falsifiability:{
    title:'Falsifiability',
    question:'What result would count against each candidate model, and what assumptions would remain?',
  },
  phenomenology:{
    title:'Phenomenology',
    question:'What is given in observation, and what is constructed through an interpretive account?',
  },
  process:{
    title:'Process philosophy',
    question:'What remains stable through changes of state, measurement context and representation?',
  },
};
const SPIRITUALITY={
  wonder:{
    title:'Wonder First',
    question:'What meaning might these patterns invite, without promoting personal symbolism into experimental physics?',
  },
  hermetic:{
    title:'Hermetic correspondence',
    question:'Which analogies of number, harmony and form are valuable to explore historically, and which would require independent physical testing?',
  },
  contemplative:{
    title:'Contemplative reflection',
    question:'What does the experience of examining an unresolved possibility contribute that is distinct from instrument readings?',
  },
};
const assert=(ok,text)=>{if(!ok)throw new Error('Nikola Heart/Brain: '+text);};
const finite=(x,min,max,name)=>{assert(typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max,name+' must be finite within its domain');return x;};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freeze);Object.freeze(x);
}return x;};
const H=p=>p<=0||p>=1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
const logTerm=(count,p)=>{
  if(count===0)return 0;
  if(p===0)return -Infinity;
  return count*Math.log(p);
};
const sampleBelief=(n0,n1,p)=>{
  // n0: plus observations, n1: minus. Shared binomial coefficient cancels
  // in the hypothesis posterior, so no need to compute factorials.
  return logTerm(n0,p)+logTerm(n1,1-p);
};
const probability=(state,basis)=>basis==='X'?state.born.xPlus:
  basis==='Y'?state.born.yPlus:state.born.z0;
const meaningful=state=>({
  basis_predictions:{
    X:state.born.xPlus,Y:state.born.yPlus,Z:state.born.z0,
  },
  assumptions:'Two-path qubit, ideal Born-rule predictions and a user-selected dephasing channel',
  provenance:'formal quantum mathematics on a classical CPU, not quantum sensor telemetry',
});
async function digest(value){
  const c=globalThis.crypto?.subtle;
  assert(c,'WebCrypto SHA-256 unavailable');
  const buf=await c.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
}
export function buildNikolaHeart({
  p0=0.5,phaseRad=0,dephasing=0,
  philosophy='falsifiability',spirituality='wonder',
}={}){
  assert(Object.hasOwn(PHILOSOPHY,philosophy),'unsupported philosophical lens');
  assert(Object.hasOwn(SPIRITUALITY,spirituality),'unsupported spiritual lens');
  const state=quantumDensity({p0,phaseRad,dephasing});
  return freeze({
    schema:'wayglass.nikola-heart/v1',
    driver:'formal-quantum-mathematics',
    source_kind:'caller-declared ideal mathematical inputs',
    quantum:state,
    physics:meaningful(state),
    thought:{
      hypothesis_question:'Given the same path populations and phase, is this state more compatible with an ideal coherent model or a fully dephased one?',
      distinction:'A prediction is not an observed outcome; a simulated outcome is not independent evidence',
    },
    philosophy:{id:philosophy,...PHILOSOPHY[philosophy],status:'interpretive, no numeric likelihood'},
    spirituality:{id:spirituality,...SPIRITUALITY[spirituality],status:'interpretive, no numeric likelihood'},
    separation:'Neither reflection lens changes the density matrix, the probability model or the physical-world evidence status',
  });
}
export function reasonNikolaBrain(heart,{priorCoherent=0.5}={}){
  assert(heart?.schema==='wayglass.nikola-heart/v1','heart is required');
  // Reconstruct from declared inputs; do not trust a forged cached density
  // or any user-modified spiritual interpretation.
  const original=buildNikolaHeart({...heart.quantum.input,
    philosophy:heart.philosophy?.id,spirituality:heart.spirituality?.id});
  assert(JSON.stringify(heart)===JSON.stringify(original),'heart must match deterministic reconstruction');
  finite(priorCoherent,.001,.999,'priorCoherent');
  const {p0,phaseRad}=original.quantum.input;
  const coherent=quantumDensity({p0,phaseRad,dephasing:0});
  const dephased=quantumDensity({p0,phaseRad,dephasing:1});
  const candidateAxes=MEASUREMENTS.map(basis=>{
    const pCoherent=probability(coherent,basis),pDephased=probability(dephased,basis);
    const mixture=priorCoherent*pCoherent+(1-priorCoherent)*pDephased;
    const expectedGain=H(mixture)-priorCoherent*H(pCoherent)-
      (1-priorCoherent)*H(pDephased);
    assert(expectedGain>=-1e-10&&expectedGain<=1+1e-10,'information gain is outside Shannon bounds');
    return freeze({basis,p_plus_given_coherent:pCoherent,p_plus_given_dephased:pDephased,
      expected_information_gain_bits:Math.max(0,expectedGain),
      discrimination:Math.abs(pCoherent-pDephased)});
  });
  candidateAxes.sort((a,b)=>b.expected_information_gain_bits-a.expected_information_gain_bits);
  return freeze({
    schema:'wayglass.nikola-brain/v1',
    engine:'two-model Bayesian experiment design, ideal conditional probabilities',
    prior:{coherent:priorCoherent,dephased:1-priorCoherent,
      source:'declared trial prior, NOT derived from physical observation'},
    source_parameters:{p0,phaseRad},
    hypotheses:[
      {id:'coherent',meaning:'ideal λ=0 coherence at selected path distribution and phase',
        endpoint_dephasing:0},
      {id:'dephased',meaning:'ideal λ=1 complete path-basis dephasing at same distribution and phase',
        endpoint_dephasing:1},
    ],
    alternatives:['partial dephasing is an unmodelled intermediate possibility',
      'state preparation/measurement error or wrong ideal assumptions remain possible'],
    candidates:candidateAxes,
    recommended_basis:candidateAxes[0].expected_information_gain_bits>1e-12?
      candidateAxes[0].basis:null,
    identifiability:candidateAxes[0].expected_information_gain_bits>1e-12?
      'one of X/Y/Z can conditionally discriminate the two endpoint models':
      'these models are indistinguishable by X/Y/Z for this preparation; change the preparation or propose a new model',
    maximum_information_gain_bits:candidateAxes[0].expected_information_gain_bits,
    interpretation_boundary:'Probabilities are conditional on the two declared models. Spiritual and philosophical perspectives are NOT given fabricated posterior scores.',
    next_question:'Which basis would distinguish coherent and fully dephased models best, and what independent measurement could challenge both?',
  });
}
export function updateNikolaBelief(brain,{basis,plus,minus}){
  assert(brain?.schema==='wayglass.nikola-brain/v1','valid brain required');
  assert(MEASUREMENTS.includes(basis),'measurement basis must be X, Y or Z');
  assert(Number.isInteger(plus)&&Number.isInteger(minus)&&plus>=0&&minus>=0&&plus+minus>0&&plus+minus<=10000,
    'detector counts must be bounded nonnegative integers');
  // Reconstruct conditional predictions from the original mathematical
  // source parameters; never admit a tampered likelihood as a valid brain.
  const {p0,phaseRad}=brain.source_parameters||{};
  const rebuilt=reasonNikolaBrain(
    buildNikolaHeart({p0,phaseRad,dephasing:0}),
    {priorCoherent:brain.prior?.coherent});
  assert(JSON.stringify(brain)===JSON.stringify(rebuilt),
    'brain predictions are inconsistent with canonical quantum equations');
  const axis=brain.candidates.find(a=>a.basis===basis);
  assert(axis && axis.p_plus_given_coherent>=0&&axis.p_plus_given_coherent<=1&&
    axis.p_plus_given_dephased>=0&&axis.p_plus_given_dephased<=1,'invalid conditional probabilities');
  const log0=Math.log(brain.prior.coherent)+sampleBelief(plus,minus,axis.p_plus_given_coherent);
  const log1=Math.log(brain.prior.dephased)+sampleBelief(plus,minus,axis.p_plus_given_dephased);
  const high=Math.max(log0,log1);
  const scaled=Number.isFinite(high)?[Math.exp(log0-high),Math.exp(log1-high)]:[0,0];
  const denom=scaled[0]+scaled[1];
  return freeze({
    schema:'wayglass.nikola-posterior/v1',
    observation:{basis,plus,minus,shots:plus+minus},
    posterior:denom?[scaled[0]/denom,scaled[1]/denom]:null,
    status:denom?'conditional-on-specified-models':'both-endpoint-models-rejected-by-observed-pattern',
    calculation:'Bayes in log-likelihood space; binomial combinatorial factor cancels across hypotheses',
    meaningful_scope:'relative support for precisely two ideal models under a supplied trial',
    unsupported:['This does not estimate the probability that spirituality, consciousness or a cosmological interpretation is true',
      'Synthetic detector counts are not evidence of any real quantum apparatus',
      'Partial dephasing or other models are outside this two-hypothesis comparison'],
  });
}
export function deriveNikolaHeartBrain(settings={}){
  const {priorCoherent=0.5,...heartInputs}=settings;
  const heart=buildNikolaHeart(heartInputs);
  const brain=reasonNikolaBrain(heart,{priorCoherent});
  return freeze({schema:NIKOLA_HEART_BRAIN_SCHEMA,heart,brain,
    topology:'HEART quantum dynamics + reflection → BRAIN conditional probabilities → discriminating experiment → return unresolved alternatives',
    independent_observation:false,
    canon_authority:false});
}
/** User-invoked counterfactual trial, never disguised as quantum hardware. */
export async function runNikolaHeartBrainTrial({
  p0=0.5,phaseRad=0,dephasing=0,priorCoherent=0.5,
  philosophy='falsifiability',spirituality='wonder',
  basis='auto',shots=512,seed=104729,
}={}){
  const frame=deriveNikolaHeartBrain({p0,phaseRad,dephasing,priorCoherent,philosophy,spirituality});
  assert(basis==='auto'||MEASUREMENTS.includes(basis),'unsupported measurement basis');
  const selected=basis==='auto'?frame.brain.recommended_basis:basis;
  assert(selected!==null,'there is no discriminating X/Y/Z measurement for the two candidate models');
  const detector=sampleQuantumBasis({p0,phaseRad,dephasing,basis:selected,shots,seed});
  const update=updateNikolaBelief(frame.brain,{
    basis:selected,plus:detector.plus,minus:detector.minus});
  const body={
    schema:NIKOLA_HEART_BRAIN_RECEIPT,
    inputs:{p0,phaseRad,dephasing,priorCoherent,philosophy,spirituality,basis,shots,seed},
    frame,detector,update,
    provenance:{
      physics:'mathematical 2×2 density matrix on classical CPU',
      thought:'Bayesian comparison of two explicitly ideal endpoint models',
      philosophy:'questions, not numerical likelihoods',
      spirituality:'interpretive traditions/questions, not physical data',
      source:'synthetic deterministic local seeded trial',
      no_live_qpu_or_sky_measurements:true,
      no_independent_corrobation:true,
      no_private_data_or_external_network:true,
      no_identity_or_canon_authority:true,
    },
  };
  return freeze({...body,sha256:await digest(body)});
}
export async function replayNikolaHeartBrain(record){
  assert(record?.schema===NIKOLA_HEART_BRAIN_RECEIPT,'receipt schema required');
  const candidate=await runNikolaHeartBrainTrial(record.inputs);
  assert(JSON.stringify(candidate)===JSON.stringify(record),'deterministic receipt replay mismatch');
  return freeze({matched:true,sha256:candidate.sha256,
    evidence:'verified mathematical process and seeded simulation, not real-world quantum proof'});
}
