import {test} from 'node:test';
import assert from 'node:assert/strict';
import {membraneVisualState} from '../src/mythience-membrane-scene.js';
test('the live preview responds to declared intention and shifting',()=>{
  const closed=membraneVisualState({intention:0,shifting:0,porosity:.9,resonance:1});
  const open=membraneVisualState({intention:1,shifting:1,porosity:.9,resonance:1});
  assert.ok(open.openness>closed.openness);
  assert.equal(closed.observed,false);
});
test('receipt-derived permeability is visibly distinguished from speculation',()=>{
  const preview=membraneVisualState({intention:1,shifting:1,porosity:1});
  const receipt=membraneVisualState({intention:1,shifting:1,porosity:1,permeability:.3,expression:.2});
  assert.equal(preview.observed,false);
  assert.equal(receipt.observed,true);
  assert.equal(receipt.openness,.3);
  assert.equal(receipt.correspondence,.2);
});
test('visual parameters stay bounded and non-finite input does not escape',()=>{
  const s=membraneVisualState({intention:Infinity,shifting:-10,porosity:5,resonance:NaN,compatibility:2});
  assert.ok(Object.values(s).every(v=>typeof v==='boolean'||Number.isFinite(v)));
  assert.ok(s.openness>=0&&s.openness<=1);
});
