import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Execute the production mount and its real handlers against a deliberately
// small DOM adapter. This verifies application wiring; it is not browser,
// layout, audible output or physical hearing-device validation.
const sourceURL=new URL('../src/surfaces/acoustic-room.js',import.meta.url);
const source=(await readFile(sourceURL,'utf8'))
 .replace(/^import '\.\/acoustic-room\.css';\s*/m,'')
 .replace(/from '(\.\.[^']+)'/g,(_,path)=>`from '${new URL(path,sourceURL).href}'`);
const {mountWayglassAcousticRoom}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

class Element{
 constructor(tag,attributes={}){
  this.tagName=tag.toUpperCase();this.attributes=attributes;this.dataset={};this.style={};this.checked=false;this.value=attributes.value??'';this.textContent='';
  for(const [key,value] of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
 }
 matches(selector){return selector.split(',').some(part=>{const s=part.trim();if(s.startsWith('[')){const match=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return !!match&&Object.hasOwn(this.attributes,match[1])&&(match[2]===undefined||this.attributes[match[1]]===match[2]);}return s.toUpperCase()===this.tagName;});}
 closest(selector){return this.matches(selector)?this:null;}
 getBoundingClientRect(){return {left:100,top:50,width:1000,height:500};}
 getContext(){return null;}
}
class Root{
 constructor(){this.elements=[];this.listeners=new Map();this.classList={toggle(){}};}
 set innerHTML(html){
  this.elements=[];
  for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
   const attributes={};for(const attribute of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attributes[attribute[1]]=attribute[2]??'';
   this.elements.push(new Element(match[1],attributes));
  }
 }
 querySelector(selector){return this.elements.find(element=>element.matches(selector))??null;}
 contains(element){return this.elements.includes(element);}
 addEventListener(type,handler){this.listeners.set(type,handler);}
 removeEventListener(type,handler){if(this.listeners.get(type)===handler)this.listeners.delete(type);}
 dispatch(type,target,properties={}){let prevented=false;this.listeners.get(type)?.({target,preventDefault(){prevented=true;},...properties});return prevented;}
}
function setup(){
 const descriptors=new Map(),storage=new Map(),globalListeners=new Map(),counts={closed:0,stops:0,contexts:0,resizeDisconnected:0};
 const replace=(key,value)=>{descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const node=()=>({connect(){},disconnect(){}});
 class AudioContext{
  constructor(){counts.contexts++;this.currentTime=1;this.destination={};}
  resume(){return Promise.resolve();}
  close(){counts.closed++;return Promise.resolve();}
  createGain(){return {...node(),gain:parameter()};}
  createStereoPanner(){return {...node(),pan:parameter()};}
  createDynamicsCompressor(){return {...node(),threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter()};}
  createOscillator(){return {...node(),frequency:parameter(),start(){},stop(){counts.stops++;}};}
 }
 replace('AudioContext',AudioContext);
 replace('localStorage',{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)});
 replace('matchMedia',()=>({matches:false}));
 replace('ResizeObserver',class{observe(){}disconnect(){counts.resizeDisconnected++;}});
 replace('addEventListener',(type,handler)=>globalListeners.set(type,handler));
 replace('removeEventListener',(type,handler)=>{if(globalListeners.get(type)===handler)globalListeners.delete(type);});
 const root=new Root(),dispose=mountWayglassAcousticRoom(root),$=selector=>{const element=root.querySelector(selector);assert.ok(element,`missing ${selector}`);return element;};
 const packet=()=>JSON.parse($('[data-inspector]').textContent);
 return {root,$,packet,storage,counts,globalListeners,dispose,restore(){dispose();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

// Acceptance is established before execution: actual mounted handlers must
// preserve probe and field, isolate Mirror, cancel audio, ignore form key input,
// release resources, and retain the active snapshot on failed recovery.
test('mounted room places the probe, preserves field and pose, and restores muted',()=>{
 const f=setup();try{
  f.root.dispatch('click',f.$('[data-stage]'),{clientX:790,clientY:205});
  const mass=f.$('[data-field-mass]');mass.value='1.15';f.root.dispatch('input',mass);
  const inputSnapshot=f.packet().world.snapshot_id;
  f.root.dispatch('change',mass);
  assert.equal(f.packet().world.snapshot_id,inputSnapshot,'input followed by change must not advance the same value twice');
  const before=f.packet();near(before.world.markerState.listener.x,0.5);near(before.world.markerState.listener.y,-0.5);
  assert.equal(before.world.markerState.events[0].type,'place');
  assert.equal(before.world.fieldMass,1.15);
  near(before.field.potential,-1.15/Math.sqrt(0.2**2+0.1**2+0.15**2));
  f.root.dispatch('click',f.$('[data-save]'));assert.equal(f.storage.size,1);
  mass.value='0.2';f.root.dispatch('change',mass);
  f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowUp'});
  f.root.dispatch('click',f.$('[data-return]'));
  const after=f.packet();assert.equal(after.world.fieldMass,1.15);
  assert.deepEqual(after.world.markerState.listener,before.world.markerState.listener);
  assert.equal(after.world.snapshot_id,before.world.snapshot_id);
  assert.equal(after.world.markerState.muted,true);assert.equal(f.$('[data-audio]').checked,false);
  assert.match(f.$('[data-receipt]').textContent,/audio muted/);assert.equal(f.counts.contexts,0);
 }finally{f.restore();}
});
test('Mirror renders an alternate field without changing the primary snapshot',()=>{
 const f=setup();try{
  const before=f.packet().world;
  f.$('[data-mirror-mass]').value='1.8';f.root.dispatch('click',f.$('[data-fork]'));
  const packet=f.packet();assert.deepEqual(packet.world,before);
  assert.equal(packet.comparison.world.fieldMass,1.8);
  assert.equal(packet.comparison.world.parent_snapshot_id,before.snapshot_id);
  assert.deepEqual(packet.comparison.difference.changes,[{path:'fieldMass',before:0.7,after:1.8}]);
  assert.match(f.$('[data-comparison]').textContent,/1.80 versus 0.70/);
  f.root.dispatch('click',f.$('[data-clear-mirror]'));assert.equal(f.packet().comparison,null);
  assert.deepEqual(f.packet().world,before);
 }finally{f.restore();}
});
test('stage keys move the listener while form keys retain their native control behavior',()=>{
 const f=setup();try{
  const before=f.packet().world.snapshot_id;
  assert.equal(f.root.dispatch('keydown',f.$('[data-field-mass]'),{key:'ArrowUp'}),false);
  assert.equal(f.root.dispatch('keydown',f.$('[data-save]'),{key:'ArrowRight'}),false);
  assert.equal(f.packet().world.snapshot_id,before);
  assert.equal(f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowUp'}),true);
  near(f.packet().world.markerState.listener.x,0.1);
  assert.equal(f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowRight'}),true);
  near(f.packet().world.markerState.listener.heading,Math.PI/12);
 }finally{f.restore();}
});
test('Feather clears active audio and mounted cleanup releases handlers and context',async()=>{
 const f=setup();try{
  const enable=f.$('[data-audio]');enable.checked=true;f.root.dispatch('change',enable);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.counts.contexts,1);
  const ambience=f.$('[data-ambience]');ambience.checked=true;f.root.dispatch('change',ambience);
  f.root.dispatch('click',f.$('[data-signal]'));
  f.root.dispatch('click',f.$('[data-intent="feather"]'));
  assert.equal(f.packet().world.markerState.status,'cancelled');
  assert.equal(f.$('[data-audio]').checked,false);assert.equal(f.$('[data-ambience]').checked,false);
  assert.ok(f.counts.stops>=3);assert.match(f.$('[data-audio-state]').textContent,/Sound stopped/);
  f.dispose();assert.equal(f.root.listeners.size,0);assert.equal(f.globalListeners.size,0);
  assert.equal(f.counts.resizeDisconnected,1);assert.equal(f.counts.closed,1);
 }finally{f.restore();}
});
test('malformed or corrupted saved state leaves the active room intact',()=>{
 const f=setup();try{
  f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowUp'});
  f.root.dispatch('click',f.$('[data-save]'));
  const key=[...f.storage.keys()][0],before=f.packet().world;
  const corrupt=JSON.parse(f.storage.get(key));corrupt.frame.units='metres';
  for(const saved of ['{incomplete',JSON.stringify(corrupt)]){
   f.storage.set(key,saved);f.root.dispatch('click',f.$('[data-return]'));
   assert.deepEqual(f.packet().world,before);
   assert.match(f.$('[data-receipt]').textContent,/No valid saved return/);
  }
 }finally{f.restore();}
});
