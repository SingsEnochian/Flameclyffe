import test from 'node:test';
import assert from 'node:assert/strict';
import { installMotionChoreography } from '../src/motion-choreography.js';

class Events {
  listeners = new Map();
  addEventListener(name, fn) { if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, event = {}) { for(const fn of this.listeners.get(name)||[])fn(event); }
}
function element() {
  const e = new Events(); e.dataset={}; e.attrs={}; e.children=[]; e.properties=new Map();
  e.style={setProperty:(k,v)=>e.properties.set(k,v),removeProperty:k=>e.properties.delete(k)};
  e.setAttribute=(k,v)=>e.attrs[k]=v;e.append=(...items)=>e.children.push(...items);e.remove=()=>{e.removed=true;};
  return e;
}
function fixture({ reduced = false } = {}) {
  const scope=new Events(),preference=new Events(),root=element(),host=element(),document=new Events(),frames=new Map();
  let sequence=0,subscriber,activitySubscriber,unsubscribed=false,activityUnsubscribed=false,now=0;
  preference.matches=reduced;scope.matchMedia=()=>preference;scope.document=document;document.createElement=()=>element();
  scope.innerWidth=1000;scope.innerHeight=800;scope.performance={now:()=>now+=16};
  scope.requestAnimationFrame=fn=>{const id=++sequence;frames.set(id,fn);return id;};scope.cancelAnimationFrame=id=>frames.delete(id);
  const controller=installMotionChoreography({root,controlsHost:host,scope,document,subscribe:fn=>{subscriber=fn;return()=>{unsubscribed=true;};},subscribeActivity:fn=>{activitySubscriber=fn;return()=>{activityUnsubscribed=true;};}});
  const control=element();control.closest=()=>control;control.matches=()=>false;control.contains=child=>child===control.child;
  control.getBoundingClientRect=()=>({left:100,top:100,width:100,height:50});
  return {scope,root,host,document,preference,controller,frames,control,observe:sample=>subscriber(sample),observeActivity:sample=>activitySubscriber(sample),
    flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},get unsubscribed(){return unsubscribed&&activityUnsubscribed;}};
}
const move=(f,overrides={})=>f.scope.emit('pointermove',{pointerType:'mouse',clientX:190,clientY:145,target:f.control,...overrides});

test('pointer work is bounded to one frame, zero initial velocity, and small magnetic displacement',()=>{
 const f=fixture();move(f);move(f);assert.equal(f.frames.size,1);f.flush();
 assert.equal(f.control.properties.get('--wg-magnet-x'),'1.20px');assert.equal(f.control.properties.get('--wg-magnet-y'),'1.20px');
 assert.equal(f.root.properties.get('--wg-velocity'),'0.000');f.controller.destroy();
});
test('touch and disabled controls keep magnetic motion still',()=>{
 const f=fixture();move(f,{pointerType:'touch'});assert.equal(f.frames.size,0);
 f.control.matches=()=>true;move(f);f.flush();assert.equal(f.control.properties.size,0);f.controller.destroy();
});
test('pointerout before queued frame cannot restore a departed magnet, child transitions preserve it',()=>{
 const f=fixture();move(f);f.scope.emit('pointerout',{target:f.control,relatedTarget:null});f.flush();assert.equal(f.control.properties.size,0);
 move(f);f.flush();f.control.child={};f.scope.emit('pointerout',{target:f.control,relatedTarget:f.control.child});
 assert.equal(f.control.properties.size,2);f.scope.emit('pointercancel');assert.equal(f.control.properties.size,0);f.controller.destroy();
});
test('system preference changes cancel pending work and require deliberate re-enable after release',()=>{
 const f=fixture();move(f);f.preference.matches=true;f.preference.emit('change',{matches:true});
 assert.equal(f.frames.size,0);assert.equal(f.controller.setEnabled(true),false);assert.equal(f.host.children[0].disabled,true);
 f.preference.matches=false;f.preference.emit('change',{matches:false});assert.equal(f.controller.snapshot().enabled,false);
 assert.equal(f.controller.setEnabled(true),true);f.controller.destroy();
});
test('Feather cancels active arrivals and pointer frames; confirmed release does not auto-resume',()=>{
 const f=fixture();let cancellations=0;const target={animate:()=>({cancel:()=>cancellations++})};
 f.controller.arrive(target);move(f);f.scope.emit('wayglass:feather',{detail:{stopped:true}});
 assert.equal(cancellations,1);assert.equal(f.frames.size,0);assert.equal(f.controller.setEnabled(true),false);
 f.scope.emit('wayglass:feather',{detail:{stopped:false}});assert.equal(f.controller.snapshot().featherStopped,true);
 f.scope.emit('wayglass:feather',{detail:{stopped:false,confirmed:true}});assert.equal(f.controller.snapshot().enabled,false);
 f.host.children[0].emit('click');assert.equal(f.controller.snapshot().enabled,true);f.controller.destroy();
});
test('route status reports observed transport identifiers even with motion disabled',()=>{
 const f=fixture({reduced:true});assert.equal(f.host.children[1].textContent,'No route activity observed');
 f.observe({status:'started',route_id:'route:1',provider:'provider:1',model:'model:1'});
 assert.equal(f.root.dataset.wgRouteStatus,'started');assert.equal(f.host.children[1].textContent,'Route started · route:1 · provider:1 · model:1');
 f.observe({status:'completed',route_id:'route:1'});assert.equal(f.root.dataset.wgRouteStatus,'completed');
 f.observe({status:'unverified-participant'});assert.equal(f.root.dataset.wgRouteStatus,'completed');
 assert.equal(f.host.children[1].attrs['aria-live'],'polite');
 f.observeActivity({kind:'route:failed',actor:'wayglass:route-client'});assert.equal(f.root.dataset.wgRouteStatus,'failed');
 assert.equal(f.host.children[1].textContent,'Route failed · unidentified route');f.controller.destroy();
});
test('teardown removes listeners, cancels animation, unsubscribes and clears controls',()=>{
 const f=fixture();move(f);f.controller.destroy();f.controller.destroy();assert.equal(f.frames.size,0);assert.equal(f.unsubscribed,true);
 assert.ok(f.host.children.every(c=>c.removed));assert.equal(f.root.dataset.wgMotion,undefined);
 for(const listeners of f.scope.listeners.values())assert.equal(listeners.size,0);
 for(const listeners of f.preference.listeners.values())assert.equal(listeners.size,0);
 move(f);assert.equal(f.frames.size,0);
});
