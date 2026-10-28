import test from 'node:test';
import assert from 'node:assert/strict';
import { avoidedCrossing, densityFromBloch, measureZ, evolveBloch } from '../src/quantum-model.mjs';
const near = (a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol, `${a} != ${b}`);

test('quantum avoided crossing: nonzero gap, degeneracy at zero coupling',()=>{
  near(avoidedCrossing(0,2).gap,4);
  near(avoidedCrossing(0,0).gap,0);
  near(avoidedCrossing(3,4).gap,10);
  assert.deepEqual(avoidedCrossing(0,2).energies,[-2,2]);
});

test('physical density rho: trace, positivity, purity and complex conjugate',()=>{
  const rho=densityFromBloch({x:0.3,y:0.4,z:0.5});
  near(rho.trace,1);
  near(rho.rho.r00+rho.rho.r11,1);
  near(rho.rho.r01.imag,-rho.rho.r10.imag);
  assert.ok(rho.purity>=0.5 && rho.purity<=1);
  assert.throws(()=>densityFromBloch({x:1.1,y:0,z:0}),/outside unit ball/);
});

test('measurement probabilities sum to one and conditional states are basis projectors',()=>{
  const results=measureZ({x:1,y:0,z:0});
  near(results.outcomes[0].probability,0.5);
  near(results.outcomes[1].probability,0.5);
  near(results.outcomes.reduce((a,o)=>a+o.probability,0),1);
  assert.equal(measureZ({x:0,y:0,z:1}).outcomes[1].conditional_bloch,null);
  assert.equal(results.domain,'SYMBOLIC');
});

test('unitary Bloch evolution preserves norm and matches X-axis rotation',()=>{
  const start={x:0,y:0,z:1};
  const end=evolveBloch(start,{lambda:0,g:1,time:Math.PI/4});
  near(end.x,0);near(end.y,-1);near(end.z,0);
  near(Math.hypot(end.x,end.y,end.z),1);
  const returnToStart=evolveBloch(start,{lambda:0,g:1,time:0});
  assert.deepEqual(returnToStart,start);
});

test('sound and mythic channel fields cannot be passed as quantum state',()=>{
  assert.throws(()=>measureZ({channel_state:'collapsed'}),/Bloch/);
  assert.throws(()=>evolveBloch({x:0,y:0,z:2},{lambda:1,g:1,time:1}),/unit ball/);
});
