import {test} from 'node:test';
import assert from 'node:assert/strict';
import {membraneVisualState,mountMythienceMembraneScene} from '../src/mythience-membrane-scene.js';
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

test('keyboard shifting uses the declared field rather than derived alignment',()=>{
  const listeners=new Map(),shifts=[];
  const canvas={
    dataset:{},getContext:()=>null,
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name)=>listeners.delete(name),
    getBoundingClientRect:()=>({left:0,width:200}),
  };
  const scene=mountMythienceMembraneScene(canvas,{onShift:value=>shifts.push(value),reducedMotion:true});
  scene.setFields({intention:0,shifting:.6,resonance:0});
  listeners.get('keydown')({key:'ArrowRight',preventDefault(){}});
  assert.equal(shifts.at(-1),.65);
  scene.destroy();
  assert.equal(listeners.size,0);
});
test('secondary pointers cannot shift the membrane',()=>{
  const listeners=new Map(),shifts=[];
  const canvas={dataset:{},getContext:()=>null,
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name)=>listeners.delete(name),
    getBoundingClientRect:()=>({left:0,width:200})};
  const scene=mountMythienceMembraneScene(canvas,{onShift:value=>shifts.push(value),reducedMotion:true});
  listeners.get('pointerdown')({isPrimary:false,button:0,clientX:100,pointerId:2});
  assert.deepEqual(shifts,[]);
  listeners.get('pointerdown')({isPrimary:true,button:0,clientX:100,pointerId:1});
  assert.deepEqual(shifts,[.5]);
  scene.destroy();
});

test('active drag ignores foreign pointers and stops after lost capture',()=>{
  const listeners=new Map(),shifts=[];
  const canvas={dataset:{},getContext:()=>null,
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:(name)=>listeners.delete(name),
    getBoundingClientRect:()=>({left:0,width:200}),
    setPointerCapture(){},hasPointerCapture:()=>false};
  const scene=mountMythienceMembraneScene(canvas,{onShift:value=>shifts.push(value),reducedMotion:true});
  const emit=(name,pointerId,clientX)=>listeners.get(name)({pointerId,clientX,isPrimary:true,button:0});
  emit('pointerdown',11,20);
  emit('pointermove',22,180);
  assert.deepEqual(shifts,[.1],'foreign pointer must not change active drag');
  emit('pointerup',22,180);
  emit('pointermove',11,80);
  assert.deepEqual(shifts,[.1,.4],'foreign pointerup must not cancel owner drag');
  emit('lostpointercapture',11,80);
  emit('pointermove',11,160);
  assert.deepEqual(shifts,[.1,.4],'lost capture must terminate drag');
  scene.destroy();
  assert.equal(listeners.size,0);
});
