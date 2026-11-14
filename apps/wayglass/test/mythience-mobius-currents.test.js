import {test} from 'node:test';
import assert from 'node:assert/strict';
import {membraneVisualState,membraneCurrents} from '../src/mythience-membrane-scene.js';
test('two independent visible currents preserve Harmony and Chaos',()=>{
  const state=membraneVisualState({intention:0,shifting:0,resonance:0,porosity:0});
  const currents=membraneCurrents(state,{width:400,height:300,reducedMotion:true});
  assert.deepEqual(currents.map(c=>c.name),['harmony','chaos']);
  assert.ok(currents.every(c=>c.opacity>0&&c.points.length===49));
  assert.notDeepEqual(currents[0].points,currents[1].points);
});
test('reduced motion is static and deterministic',()=>{
  const state=membraneVisualState({intention:.8,shifting:.6});
  assert.deepEqual(membraneCurrents(state,{time:1,reducedMotion:true}),
    membraneCurrents(state,{time:100,reducedMotion:true}));
});
test('live movement responds to time and field correspondence',()=>{
  const a=membraneVisualState({intention:.1,shifting:.1});
  const b=membraneVisualState({intention:1,shifting:1});
  assert.notDeepEqual(membraneCurrents(a,{time:1}),membraneCurrents(a,{time:2}));
  assert.notDeepEqual(membraneCurrents(a,{time:1}),membraneCurrents(b,{time:1}));
});
test('tiny iPad/mobile canvas never produces invalid geometry',()=>{
  const state=membraneVisualState({});
  for(const width of [0,1,320,1024]){
    const currents=membraneCurrents(state,{width,height:1,time:1});
    assert.ok(currents.flatMap(c=>c.points).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  }
});
