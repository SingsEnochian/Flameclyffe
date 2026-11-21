import test from 'node:test';
import assert from 'node:assert/strict';
import {spatialWithnessPigment} from '../src/surfaces/living-watercolor.js';

test('crossing paths keep separate pigments and meet at midpoint',()=>{
  const start=spatialWithnessPigment(0), middle=spatialWithnessPigment(9), end=spatialWithnessPigment(18);
  assert.equal(start.length,2);assert.notEqual(start[0].color,start[1].color);
  assert.equal(middle[0].x,.5);assert.equal(middle[1].x,.5);
  assert.equal(start[0].x,end[1].x);assert.equal(start[1].x,end[0].x);
});
test('stationary positions never cross and all supported relationships remain bounded',()=>{
  for(const beatHz of [3,6,9])for(let t=0;t<=18;t+=.1){
    for(const p of spatialWithnessPigment(t,{beatHz,crossing:false})){
      assert.equal(p.x,.5);assert.ok(p.amount>=.04&&p.amount<=.151);
    }
  }
});
test('unrecognised or out-of-range score samples are silent',()=>{
  for(const t of [-1,19,NaN,Infinity])assert.deepEqual(spatialWithnessPigment(t),[]);
  assert.deepEqual(spatialWithnessPigment(0,{beatHz:4}),[]);
});
