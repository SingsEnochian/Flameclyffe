/**
 * Living Observer / Nikola N-008 · formally correct single-qubit two-path model.
 *
 * No quantum hardware, sensors, internet, cosmological claim, private data,
 * identity, model inference, or canon mutation. All outputs are conditional on
 * caller-declared ideal parameters; random draws are deterministic PRNG samples.
 */
export const QUANTUM_OBSERVER_SCHEMA = 'observer.quantum-density-instrument/v1';
export const QUANTUM_RECEIPT_SCHEMA = 'observer.quantum-synthetic-trial/v1';
const TAU = 2 * Math.PI;
const TOL = 1e-10;
const bounded = (x, lo, hi, name) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi) {
    throw new Error('Quantum Observer: '+name+' must be finite in ['+lo+', '+hi+']');
  }
  return x;
};
const freeze = obj => {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.values(obj).forEach(freeze);
    Object.freeze(obj);
  }
  return obj;
};
const clamp01 = x => Math.max(0,Math.min(1,x));
const binaryEntropy = probability => probability <= 0 || probability >= 1
  ? 0 : -probability*Math.log2(probability)-(1-probability)*Math.log2(1-probability);

export function quantumDensity({p0=0.5,phaseRad=0,dephasing=0}={}){
  bounded(p0,0,1,'p0');
  bounded(phaseRad,0,TAU,'phaseRad');
  bounded(dephasing,0,1,'dephasing');

  // Dephasing channel in the computational (which-path) basis.
  const coherence=(1-dephasing)*Math.sqrt(p0*(1-p0));
  const offRe=coherence*Math.cos(phaseRad);
  const offIm=-coherence*Math.sin(phaseRad); // rho_01, complex conjugate of rho_10
  const x=2*offRe, y=-2*offIm, z=2*p0-1;
  const radius=Math.min(1,Math.hypot(x,y,z));
  const eigenvalues=[(1+radius)/2,(1-radius)/2];
  const det=p0*(1-p0)-coherence*coherence;
  const pPlus=clamp01((1+x)/2);
  const pY=clamp01((1+y)/2);
  const visibility=2*coherence;
  const predictability=Math.abs(z);
  const purity=(1+radius*radius)/2;
  const result={
    schema:QUANTUM_OBSERVER_SCHEMA,
    input:{p0,phaseRad,dephasing},
    density_matrix:{
      basis:'|0⟩,|1⟩ computational/which-path basis',
      rho00:{re:p0,im:0},
      rho01:{re:offRe,im:offIm},
      rho10:{re:offRe,im:-offIm},
      rho11:{re:1-p0,im:0},
      trace:1,determinant:det,
    },
    bloch:{x,y,z,radius},
    born:{
      z0:p0,z1:1-p0,xPlus:pPlus,xMinus:1-pPlus,
      yPlus:pY,yMinus:1-pY,
      x_basis_equivalent:'ideal balanced final beam-splitter plus detector',
    },
    coherence:{
      fringe_visibility:visibility,
      which_path_predictability:predictability,
      complementarity_sum_squares:visibility*visibility+predictability*predictability,
      purity,von_neumann_entropy_bits:binaryEntropy(eigenvalues[0]),
      eigenvalues,
    },
    mathematical_invariants:{
      hermitian:true,trace_one:true,
      positive_semidefinite:det>=-TOL,
      valid_born_probabilities:[p0,1-p0,pPlus,1-pPlus,pY,1-pY].every(v=>v>=-TOL&&v<=1+TOL),
      bloch_ball:radius<=1+TOL,
      complementarity_bound:visibility*visibility+predictability*predictability<=1+TOL,
    },
    evidence_type:'analytic ideal two-path quantum-information model, computed on a classical processor',
    measurement_authenticity:'no quantum detector measurements, no decoherence calibration, no QPU connection',
    physical_cosmology_coupling:'not established',
    symbol_and_numerology_coupling:'none; the formal instrument is independent of interpretive traditions',
  };
  if(!Object.values(result.mathematical_invariants).every(Boolean)){
    throw new Error('Quantum Observer: mathematical invariant failure');
  }
  return freeze(result);
}

/** Conditional theoretical X+ probabilities across a complete phase cycle. */
export function quantumFringe({p0=0.5,dephasing=0,samples=97}={}){
  bounded(p0,0,1,'p0');
  bounded(dephasing,0,1,'dephasing');
  if(!Number.isInteger(samples)||samples<9||samples>513){
    throw new Error('Quantum Observer: samples must be an integer in [9, 513]');
  }
  const visibility=2*(1-dephasing)*Math.sqrt(p0*(1-p0));
  const points=Array.from({length:samples},(_,i)=>{
    const phaseRad=TAU*i/(samples-1);
    return freeze({phaseRad,probability_x_plus:clamp01((1+visibility*Math.cos(phaseRad))/2),
      fully_dephased_reference:0.5});
  });
  return freeze({schema:'observer.quantum-fringe/v1',
    definition:'P(X+ | phase) = [1+2(1-lambda)sqrt(p(1-p))cos(phi)]/2',
    points,reference_label:'fully dephased channel, phase-independent X+ probability 1/2',
    simulated_not_measured:true});
}

/** Xorshift32: reproducible browser-side pseudo-random numbers, NOT hardware randomness. */
function xorshift(seed){
  let state=seed>>>0;
  return ()=>{
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)/4294967296;
  };
}
export function sampleQuantumDetector({p0=0.5,phaseRad=0,dephasing=0,shots=512,seed=104729}={}){
  if(!Number.isInteger(shots)||shots<16||shots>10000){
    throw new Error('Quantum Observer: shots must be an integer in [16, 10000]');
  }
  if(!Number.isInteger(seed)||seed<1||seed>0xffffffff){
    throw new Error('Quantum Observer: seed must be nonzero uint32');
  }
  const calculated=quantumDensity({p0,phaseRad,dephasing});
  const probability=calculated.born.xPlus;
  const random=xorshift(seed);
  let plus=0;
  for(let i=0;i<shots;i++){
    if(random()<probability)plus++;
  }
  const minus=shots-plus;
  return freeze({schema:'observer.quantum-seeded-detector/v1',
    seed,shots,plus,minus,
    predicted_p_plus:probability,
    sampled_frequency_plus:plus/shots,
    expected_plus:shots*probability,
    nominal_standard_error:Math.sqrt(probability*(1-probability)/shots),
    source:'deterministic local xorshift32 pseudorandom simulation',
    physical_detector_used:false,
    quantum_randomness_used:false,
  });
}

/**
 * Generalised synthetic measurement sampler for the X/Y/Z basis.
 * This is still a classical seeded PRNG; no actual QPU or photon record.
 */
export function sampleQuantumBasis({p0=0.5,phaseRad=0,dephasing=0,basis='X',shots=512,seed=104729}={}){
  if(!['X','Y','Z'].includes(basis))throw new Error('Quantum Observer: invalid measurement basis');
  if(!Number.isInteger(shots)||shots<16||shots>10000){
    throw new Error('Quantum Observer: shots must be an integer in [16, 10000]');
  }
  if(!Number.isInteger(seed)||seed<1||seed>0xffffffff){
    throw new Error('Quantum Observer: seed must be nonzero uint32');
  }
  const state=quantumDensity({p0,phaseRad,dephasing});
  const probability=basis==='X'?state.born.xPlus:basis==='Y'?state.born.yPlus:state.born.z0;
  const rand=xorshift(seed);
  let plus=0;
  for(let i=0;i<shots;i++){if(rand()<probability)plus++;}
  return freeze({
    schema:'observer.quantum-basis-sample/v1',
    source:'seeded local xorshift32 Monte Carlo, no independent detector',basis,
    seed,shots,plus,minus:shots-plus,model_probability_plus:probability,
    physical_detector_used:false,
    independence:'Repeated runs with identical seed are exact duplicates, not independent observations',
  });
}

/** Canonical hash protects local replay consistency, NOT source authenticity. */
async function digest(packet){
  const cryptoAPI=globalThis.crypto?.subtle;
  if(!cryptoAPI)throw new Error('Quantum Observer: SHA-256 WebCrypto unavailable');
  const bytes=new TextEncoder().encode(JSON.stringify(packet));
  const hash=await cryptoAPI.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function makeQuantumReceipt({p0=0.5,phaseRad=0,dephasing=0,shots=512,seed=104729}={}){
  const input=freeze({p0,phaseRad,dephasing,shots,seed});
  const calculated=quantumDensity(input);
  const trial=sampleQuantumDetector(input);
  const body={
    schema:QUANTUM_RECEIPT_SCHEMA,
    inputs:input,calculated,trial,
    provenance:{
      origin:'caller-declared parameters and deterministic classical CPU computation',
      independence:'not an independent experiment or astrophysical instrument',
      consent:'explicit user-invoked local action, no data transmitted',
      mathematical_reference:'IBM Quantum density matrices, Hermiticity, Born rule and Bloch ball',
      no_canon_or_identity_authority:true,
    },
  };
  const sha256=await digest(body);
  return freeze({...body,sha256});
}
export async function replayQuantumReceipt(record){
  if(!record||record.schema!==QUANTUM_RECEIPT_SCHEMA||typeof record.sha256!=='string'){
    throw new Error('Quantum Observer: unsupported receipt');
  }
  const expected=await makeQuantumReceipt(record.inputs);
  if(JSON.stringify(record)!==JSON.stringify(expected)){
    throw new Error('Quantum Observer: receipt differs from independent deterministic replay');
  }
  return freeze({matched:true,sha256:expected.sha256,
    evidence:'reproduced local calculation and seeded synthetic detector counts; no measured quantum hardware'});
}
