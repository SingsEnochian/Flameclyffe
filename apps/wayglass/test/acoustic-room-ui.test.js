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
function setup({loadCompositionControls,storage:stored=new Map()}={}){
 const descriptors=new Map(),storage=stored,globalListeners=new Map(),counts={closed:0,stops:0,contexts:0,resizeDisconnected:0};
 const replace=(key,value)=>{descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 const parameter=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const node=()=>({connect(){},disconnect(){}});
 class AudioContext{
  constructor(){counts.contexts++;this.currentTime=1;this.destination={};this.state='running';}
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
 const root=new Root(),dispose=mountWayglassAcousticRoom(root,{loadCompositionControls}),$=selector=>{const element=root.querySelector(selector);assert.ok(element,`missing ${selector}`);return element;};
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
  assert.equal(f.counts.resizeDisconnected,1);
  // The ship owns the one AudioContext across room unmounts. Feather stops
  // voices; room teardown must not close a shared device used by other rooms.
  assert.equal(f.counts.closed,0,'Room navigation must not dispose the ship-owned AudioContext');
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

test('expandable acoustic composition binds the authored score, preserves navigation and returns paused',async()=>{
 let controls=null,destroyed=0;
 const f=setup({loadCompositionControls:async()=>({mountWayglassSoundComposition(_root,options){controls=options;return{destroy(){destroyed++;}};}})});
 try{
  assert.equal(f.counts.contexts,0,'Fresh quiet generation must not create a sound device');
  const panel=f.$('[data-acoustic-composition-panel]');panel.open=true;f.root.dispatch('toggle',panel);await new Promise(resolve=>setImmediate(resolve));
  assert.ok(controls?.composition&&controls.storyBinding&&controls.soundscape);
  assert.equal(controls.storyBinding.getContext(),null);
  controls.soundscape.releaseFeather({confirmed:true});controls.composition.startGeneration({confirmed:true});
  const story=f.$('[data-acoustic-story]');story.value='Water wind and a river';f.root.dispatch('input',story);
  controls.storyBinding.setContext({voices:[{voice_id:'captured:acoustic-a',source_ref:'fixture:voice-a'},{voice_id:'captured:acoustic-b',source_ref:'fixture:voice-b'}],affinity:{value:.4,source_ref:'fixture:owner-affinity'}});
  await controls.composition.waitForScore();
  assert.equal(controls.composition.snapshot().score_status,'source-score-ready');assert.equal(controls.composition.snapshot().layers.length,4);
  const anchor=controls.composition.snapshot().program_provenance.return_anchor;
  await controls.composition.enableAudio({confirmed:true});
  assert.equal(f.counts.contexts,1);assert.equal(f.$('[data-audio]').checked,true);assert.equal(f.$('[data-ambience]').checked,true);
  assert.equal(controls.composition.snapshot().audio_enabled,true);
  f.$('[data-field-mass]').value='1.3';f.root.dispatch('change',f.$('[data-field-mass]'));
  assert.equal(controls.composition.snapshot().audio_enabled,true,'Field rendering must not silently stop explicitly enabled composition');
  assert.deepEqual(controls.composition.snapshot().program_provenance.return_anchor,anchor);
  controls.composition.disableAudio();assert.equal(f.$('[data-audio]').checked,false);assert.equal(controls.composition.snapshot().generating,true,'Silence does not pause score generation');
  f.root.dispatch('click',f.$('[data-save]'));const record=JSON.parse([...f.storage.values()][0]);assert.ok(record.sound_composition);assert.equal(record.sound_composition.story_text,story.value);
  f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowUp'});
  f.root.dispatch('click',f.$('[data-return]'));
  assert.equal(controls.composition.snapshot().generating,false);assert.equal(controls.composition.snapshot().audio_enabled,false);assert.equal(controls.composition.snapshot().score_status,'return-held');
  assert.deepEqual(controls.storyBinding.checkpoint().anchor,anchor);
  controls.soundscape.feather();assert.equal(controls.composition.snapshot().feather_stopped,true);assert.equal(f.$('[data-audio]').disabled,true);
  controls.soundscape.releaseFeather({confirmed:true});assert.equal(controls.composition.snapshot().generating,false);assert.equal(controls.composition.snapshot().audio_enabled,false);
  f.dispose();assert.equal(destroyed,1);
 }finally{f.restore();}
});
test('corrupt saved composition is rejected before changing active field or score',async()=>{
 let controls;const f=setup({loadCompositionControls:async()=>({mountWayglassSoundComposition(_root,options){controls=options;return{destroy(){}};}})});
 try{
  const panel=f.$('[data-acoustic-composition-panel]');panel.open=true;f.root.dispatch('toggle',panel);await new Promise(resolve=>setImmediate(resolve));
  controls.soundscape.releaseFeather({confirmed:true});controls.composition.startGeneration({confirmed:true});
  controls.storyBinding.setContext({voices:[{voice_id:'captured:a',source_ref:'fixture:a'},{voice_id:'captured:b',source_ref:'fixture:b'}],affinity:{value:.5,source_ref:'fixture:affinity'}});await controls.composition.waitForScore();
  f.root.dispatch('click',f.$('[data-save]'));const key=[...f.storage.keys()][0],record=JSON.parse(f.storage.get(key));
  f.root.dispatch('keydown',f.$('[data-stage]'),{key:'ArrowUp'});const before=f.packet().world,scoreBefore=controls.composition.checkpoint();
  record.sound_composition.binding.sourceHash='wrong-source';f.storage.set(key,JSON.stringify(record));f.root.dispatch('click',f.$('[data-return]'));
  assert.deepEqual(f.packet().world,before);assert.deepEqual(controls.composition.checkpoint(),scoreBefore);assert.match(f.$('[data-receipt]').textContent,/No valid saved return/);
 }finally{f.restore();}
});

test('regional cold remount restores actual score declarations and anchor with generation and playback held',async()=>{
 const storage=new Map();let original,returned;
 const loader=receive=>async()=>({mountWayglassSoundComposition(_root,options){receive(options);return{destroy(){}};}});
 const first=setup({storage,loadCompositionControls:loader(options=>{original=options;})});
 let checkpoint;
 try{
  const panel=first.$('[data-acoustic-composition-panel]');panel.open=true;first.root.dispatch('toggle',panel);await new Promise(resolve=>setImmediate(resolve));
  original.soundscape.releaseFeather({confirmed:true});original.composition.startGeneration({confirmed:true});
  first.$('[data-acoustic-story]').value='A flame beside the river';first.root.dispatch('input',first.$('[data-acoustic-story]'));
  original.storyBinding.setContext({voices:[{voice_id:'captured:return-a',source_ref:'fixture:return-a'},{voice_id:'captured:return-b',source_ref:'fixture:return-b'}],affinity:{value:.2,source_ref:'fixture:return-affinity'}});await original.composition.waitForScore();
  checkpoint=original.storyBinding.checkpoint();
 }finally{first.restore();}
 const cold=setup({storage,loadCompositionControls:loader(options=>{returned=options;})});
 try{
  assert.equal(cold.counts.contexts,0);
  const panel=cold.$('[data-acoustic-composition-panel]');panel.open=true;cold.root.dispatch('toggle',panel);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(returned.composition.snapshot().score_status,'return-held');assert.equal(returned.composition.snapshot().generating,false);assert.equal(returned.composition.snapshot().audio_enabled,false);
  assert.deepEqual(returned.storyBinding.checkpoint(),checkpoint);assert.equal(cold.$('[data-acoustic-story]').value,'A flame beside the river');
 }finally{cold.restore();}
});
