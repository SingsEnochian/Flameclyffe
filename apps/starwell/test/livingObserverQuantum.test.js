import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUANTUM_OBSERVER_SCHEMA, QUANTUM_RECEIPT_SCHEMA,
  quantumDensity,quantumFringe,sampleQuantumDetector,
  makeQuantumReceipt,replayQuantumReceipt,
} from '../../../starwell/deep-observer/living-observer-quantum-core.js';

const nearly=(a,b,tol=1e-11)=>assert.ok(Math.abs(a-b)<=tol,
  'expected '+a+' ≈ '+b);

test('density operator is normalised, Hermitian and positive for broad qubit and channel parameters',()=>{
  for(const p0 of [0,.01,.13,.5,.75,.99,1]){
    for(const phaseRad of [0,Math.PI/3,Math.PI/2,Math.PI,2*Math.PI]){
      for(const dephasing of [0,.1,.47,1]){
        const r=quantumDensity({p0,phaseRad,dephasing});
        assert.equal(r.schema,QUANTUM_OBSERVER_SCHEMA);
        assert.equal(r.density_matrix.trace,1);
        nearly(r.density_matrix.rho00.re+r.density_matrix.rho11.re,1);
        nearly(r.density_matrix.rho01.re,r.density_matrix.rho10.re);
        nearly(r.density_matrix.rho01.im,-r.density_matrix.rho10.im);
        assert.ok(r.density_matrix.determinant>=-1e-10);
        assert.ok(r.coherence.complementarity_sum_squares<=1+1e-10);
        assert.ok(r.bloch.radius<=1+1e-10);
        Object.values(r.mathematical_invariants).forEach(v=>assert.equal(v,true));
        assert.ok(Object.isFrozen(r));
      }
    }
  }
});

test('constructive and destructive interference at balanced ideal phase endpoints',()=>{
  const pos=quantumDensity({p0:.5,phaseRad:0,dephasing:0});
  const neg=quantumDensity({p0:.5,phaseRad:Math.PI,dephasing:0});
  nearly(pos.born.xPlus,1);
  nearly(neg.born.xPlus,0);
  nearly(pos.coherence.fringe_visibility,1);
  nearly(pos.coherence.purity,1);
  nearly(neg.coherence.von_neumann_entropy_bits,0);
  nearly(pos.born.z0,.5);
});

test('relative phase changes Y basis and cannot change path populations',()=>{
  const at0=quantumDensity({p0:.5,phaseRad:0,dephasing:0});
  const at90=quantumDensity({p0:.5,phaseRad:Math.PI/2,dephasing:0});
  nearly(at90.born.yPlus,1);
  nearly(at90.born.xPlus,.5);
  nearly(at0.born.z0,at90.born.z0);
  nearly(at0.born.z1,at90.born.z1);
});

test('complete computational-basis dephasing removes interference, not path predictability',()=>{
  const d0=quantumDensity({p0:.77,phaseRad:0,dephasing:1});
  const d1=quantumDensity({p0:.77,phaseRad:Math.PI,dephasing:1});
  nearly(d0.born.xPlus,.5);
  nearly(d1.born.xPlus,.5);
  nearly(d0.born.z0,.77);
  nearly(d0.coherence.fringe_visibility,0);
  nearly(d0.bloch.x,0);
  nearly(d0.bloch.y,0);
  nearly(d0.coherence.which_path_predictability,.54);
});

test('maximally mixed state has unit entropy, half purity and vanishing Bloch vector',()=>{
  const m=quantumDensity({p0:.5,phaseRad:2,dephasing:1});
  nearly(m.bloch.radius,0);
  nearly(m.coherence.purity,.5);
  nearly(m.coherence.von_neumann_entropy_bits,1);
  nearly(m.coherence.eigenvalues[0],.5);
  nearly(m.coherence.eigenvalues[1],.5);
});

test('eigenstate remains pure when channel removes only off-diagonal elements',()=>{
  for(const p0 of [0,1]){
    const r=quantumDensity({p0,phaseRad:1.123,dephasing:1});
    nearly(r.coherence.purity,1);
    nearly(r.coherence.von_neumann_entropy_bits,0);
    nearly(r.born.xPlus,.5);
  }
});

test('fringe is a full conditional phase sweep and fully dephased reference stays 1/2',()=>{
  const f=quantumFringe({p0:.5,dephasing:.2,samples:101});
  assert.equal(f.points.length,101);
  nearly(f.points[0].probability_x_plus,.9);
  nearly(f.points[50].probability_x_plus,.1);
  nearly(f.points[100].probability_x_plus,.9);
  f.points.forEach(p=>nearly(p.fully_dephased_reference,.5));
  const d=quantumFringe({p0:.5,dephasing:1});
  d.points.forEach(p=>nearly(p.probability_x_plus,.5));
});

test('explicit invalid parameters fail closed rather than silently clamp hidden inputs',()=>{
  for(const input of [{p0:-.01},{p0:1.01},{p0:Infinity},{phaseRad:-.1},
    {phaseRad:7},{dephasing:-.2},{dephasing:1.2},{dephasing:NaN}]){
    assert.throws(()=>quantumDensity(input),/Quantum Observer:/);
  }
  assert.throws(()=>quantumFringe({samples:5}),/samples/);
  assert.throws(()=>sampleQuantumDetector({shots:10001}),/shots/);
  assert.throws(()=>sampleQuantumDetector({seed:0}),/seed/);
});

test('seeded synthetic trials reproducibly sum to shot count, never claim QPU',()=>{
  const input={p0:.52,phaseRad:.6,dephasing:.35,shots:2048,seed:104729};
  const a=sampleQuantumDetector(input),b=sampleQuantumDetector(input);
  assert.deepEqual(a,b);
  assert.equal(a.plus+a.minus,2048);
  assert.equal(a.physical_detector_used,false);
  assert.equal(a.quantum_randomness_used,false);
  assert.match(a.source,/pseudorandom simulation/);
  const c=sampleQuantumDetector({...input,seed:104731});
  assert.notEqual(a.plus,c.plus);
});

test('certain outcomes remain exactly certain in seeded local detector sample',()=>{
  const all=sampleQuantumDetector({p0:.5,phaseRad:0,dephasing:0,shots:512,seed:7});
  const none=sampleQuantumDetector({p0:.5,phaseRad:Math.PI,dephasing:0,shots:512,seed:7});
  assert.equal(all.plus,512);
  assert.equal(none.plus,0);
});

test('SHA-256 receipt is replayed and tampering of input, derived state or sample fails',async()=>{
  const r=await makeQuantumReceipt({p0:.43,phaseRad:1.1,dephasing:.18,shots:512,seed:104729});
  assert.equal(r.schema,QUANTUM_RECEIPT_SCHEMA);
  assert.match(r.sha256,/^[a-f0-9]{64}$/);
  const replay=await replayQuantumReceipt(r);
  assert.equal(replay.matched,true);
  assert.equal(replay.sha256,r.sha256);
  const input=structuredClone(r);input.inputs.dephasing=.75;
  await assert.rejects(replayQuantumReceipt(input),/differs/);
  const measured=structuredClone(r);measured.trial.plus++;
  await assert.rejects(replayQuantumReceipt(measured),/differs/);
  const forged=structuredClone(r);forged.calculated.coherence.purity=.777;
  await assert.rejects(replayQuantumReceipt(forged),/differs/);
  await assert.rejects(replayQuantumReceipt({schema:'other',sha256:'bad'}),/unsupported/);
});

test('the same input produces byte-identical receipt and SHA on repeated runs',async()=>{
  const input={p0:.5,phaseRad:Math.PI,dephasing:.7,shots:128,seed:11};
  const a=await makeQuantumReceipt(input),b=await makeQuantumReceipt(input);
  assert.deepEqual(a,b);
  assert.equal(a.sha256,b.sha256);
});

test('quantum formalism explicitly carries no cosmological or numerological evidence authority',()=>{
  const state=quantumDensity();
  assert.match(state.measurement_authenticity,/no QPU connection/);
  assert.equal(state.physical_cosmology_coupling,'not established');
  assert.match(state.symbol_and_numerology_coupling,/none/);
});
