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
