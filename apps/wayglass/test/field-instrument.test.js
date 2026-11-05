import test from 'node:test';
import assert from 'node:assert/strict';
import {potential,gradient,displacement,jacobian,instrumentSnapshot,validateSources} from '../src/field-instrument-model.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
test('zero sources yield identity transform and Jacobian',()=>{
 const p=instrumentSnapshot({x:0.3,y:-0.6});near(p.potential,0);near(p.gradient.x,0);near(p.gradient.y,0);
 near(p.transformed.x,0.3);near(p.transformed.y,-0.6);
 assert.deepEqual(p.jacobian.singularValues.map(x=>+x.toFixed(7)),[1,1]);
 near(p.jacobian.determinant,1);near(p.jacobian.foldIndex,0);
});
test('symmetric sources cancel gradient at origin',()=>{
 const s=[{id:'a',x:-1,y:0,mass:2},{id:'b',x:1,y:0,mass:2}];
 const g=gradient(0,0,s);near(g.x,0);near(g.y,0);
});
test('potential obeys superposition',()=>{
 const a={id:'a',x:0,y:0,mass:1},b={id:'b',x:1,y:0,mass:3};
 near(potential(0.2,0.1,[a,b]),potential(0.2,0.1,[a])+potential(0.2,0.1,[b]));
});
test('gradient matches independent central difference of potential',()=>{
 const s=[{id:'a',x:0.2,y:0.4,mass:0.8}],h=1e-5;
 const g=gradient(-0.4,0.6,s);
 near(g.x,(potential(-0.4+h,0.6,s)-potential(-0.4-h,0.6,s))/(2*h),1e-7);
 near(g.y,(potential(-0.4,0.6+h,s)-potential(-0.4,0.6-h,s))/(2*h),1e-7);
});
test('Jacobian approximates displacement finite differences',()=>{
 const s=[{id:'a',x:0.1,y:-0.1,mass:0.5}],x=0.5,y=0.3,h=1e-4;
 const j=jacobian(x,y,s),p=displacement(x,y,s),q=displacement(x+h,y,s);
 near((q.x-p.x)/h,j.matrix[0][0],0.005);
 near((q.y-p.y)/h,j.matrix[1][0],0.005);
});
test('fold metrics and source validation never return NaN on bounded samples',()=>{
 for(let i=0;i<100;i++){
  const x=-1+2*i/99,y=Math.sin(i)*0.7;
  const j=jacobian(x,y,[{id:'a',x:0,y:0,mass:1}]);
  assert.ok(j.singularValues.every(Number.isFinite));assert.ok(Number.isFinite(j.determinant));
  assert.ok(!Number.isNaN(j.conditionNumber));assert.ok(!Number.isNaN(j.foldIndex));
 }
});
test('reject malformed, duplicated, excessive and non-finite sources',()=>{
 assert.throws(()=>validateSources([{id:'a',x:0,y:0,mass:1},{id:'a',x:0,y:0,mass:2}]));
 assert.throws(()=>potential(0,0,[{id:'x',x:0,y:0,mass:NaN}]));
 assert.throws(()=>validateSources(Array.from({length:17},(_,i)=>({id:String(i),x:0,y:0,mass:1}))));
 assert.throws(()=>jacobian(0,0,[],{derivativeStep:0}));
});


test('every field operation rejects invalid coordinates and numeric model options',()=>{
 const operations=[potential,gradient,displacement,jacobian];
 const invalid=[NaN,Infinity,-Infinity,'0.15',null,true,{},1n];
 for(const operation of operations){
  for(const value of invalid){
   assert.throws(()=>operation(value,0,[]),TypeError);
   assert.throws(()=>operation(0,value,[]),TypeError);
   for(const key of ['softening','strength','displacementScale','derivativeStep']){
    assert.throws(()=>operation(0,0,[],{[key]:value}),TypeError,`${operation.name}: ${key}`);
   }
  }
  for(const options of [null,[],1,'options'])assert.throws(()=>operation(0,0,[],options),TypeError);
  for(const options of [{softening:0},{strength:-1},{displacementScale:2},{derivativeStep:0}]){
   assert.throws(()=>operation(0,0,[],options),RangeError);
  }
 }
 assert.throws(()=>validateSources(new Array(1)),TypeError);
 assert.throws(()=>instrumentSnapshot({options:{softening:NaN}}),TypeError);
});

function referenceJacobian(x,y,sources,{softening,strength,displacementScale}){
 const result=[[1,0],[0,1]];
 for(const source of sources){
  const v=[x-source.x,y-source.y],r=Math.sqrt(v[0]**2+v[1]**2+softening**2);
  for(let row=0;row<2;row++)for(let column=0;column<2;column++){
   const hessian=strength*source.mass*((row===column?1:0)/r**3-3*v[row]*v[column]/r**5);
   result[row][column]-=displacementScale*hessian;
  }
 }
 return result;
}

test('central-difference Jacobian converges quadratically to independent analytic Hessian',()=>{
 const sources=[{id:'a',x:0.1,y:-0.2,mass:0.8},{id:'b',x:-0.6,y:0.1,mass:0.3}];
 const options={softening:0.2,strength:0.7,displacementScale:0.08};
 const reference=referenceJacobian(0.5,0.4,sources,options);
 const error=step=>{
  const measured=jacobian(0.5,0.4,sources,{...options,derivativeStep:step}).matrix;
  return Math.max(...measured.flatMap((row,i)=>row.map((v,j)=>Math.abs(v-reference[i][j]))));
 };
 const coarse=error(0.02),fine=error(0.01);
 assert.ok(coarse/fine>3.8&&coarse/fine<4.2,`convergence ratio ${coarse/fine}`);
 assert.ok(error(0.0001)<1e-7);
});

test('nearly singular Jacobian retains its small singular value and finite condition',()=>{
 const softening=0.15,displacementScale=0.1,remaining=1e-9;
 const mass=(1-remaining)*(1+softening**2)**1.5/displacementScale;
 const options={softening,displacementScale,strength:1,derivativeStep:0.000001};
 const result=jacobian(1,0,[{id:'near-fold',x:0,y:0,mass}],options);
 assert.ok(result.singularValues[1]>0);
 near(result.singularValues[1],remaining,5e-11);
 assert.ok(Number.isFinite(result.conditionNumber)&&result.conditionNumber>1e9);
 assert.equal(result.conditionStatus,'finite');
});

test('singular snapshots survive JSON roundtrip with explicit unbounded condition status',()=>{
 const softening=0.15,displacementScale=0.1,derivativeStep=0.000001;
 // Tune the tangential central difference to zero at the declared step.
 const mass=(1+softening**2+derivativeStep**2)**1.5/displacementScale;
 const snapshot=instrumentSnapshot({x:1,y:0,sources:[{id:'fold',x:0,y:0,mass}],
  options:{softening,displacementScale,derivativeStep}});
 assert.equal(snapshot.jacobian.conditionStatus,'singular-at-instrument-resolution');
 assert.equal(snapshot.jacobian.conditionNumber,null);
 assert.equal(snapshot.jacobian.foldIndex,null);
 assert.deepEqual(JSON.parse(JSON.stringify(snapshot)),snapshot);
 assert.equal(snapshot.options.strength,1);
});
