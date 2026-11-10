import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sourceURL=new URL('../src/surfaces/sound-composition.js',import.meta.url);
const source=(await readFile(sourceURL,'utf8')).replace(/^import '\.\/sound-composition\.css';\s*/m,'').replace(/from '(\.\.[^']+)'/g,(_,path)=>`from '${new URL(path,sourceURL).href}'`);
const {mountWayglassSoundComposition,soundstagePosition,moveSoundObject}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Element {
 constructor(tag,attributes={}){this.tagName=tag.toUpperCase();this.attributes=attributes;this.dataset={};this.style={};this.children=[];this.value=attributes.value??'';this.checked=false;this.disabled=false;this.textContent='';for(const[k,v]of Object.entries(attributes))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=v;}
 matches(selector){const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(!m)return false;const attr=m[1];const value=attr.startsWith('data-')?this.dataset[attr.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]:this.attributes[attr];return value!==undefined&&(m[2]===undefined||value===m[2]);}
 closest(selector){return this.matches(selector)?this:null;}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...children){children.forEach(child=>{child.parent=this;this.children.push(child);});}
 replaceChildren(...children){this.children=[];this.append(...children);}
 remove(){this.parent.children=this.parent.children.filter(child=>child!==this);}
 getBoundingClientRect(){return{left:100,top:50,width:1000,height:500};}
 setPointerCapture(id){this.captured=id;}
}
class Root extends Element{
 constructor(){super('main');this.listeners=new Map();this.ownerDocument={createElement:tag=>new Element(tag)};}
 set innerHTML(html){this.children=[];for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){const attrs={};for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';this.append(new Element(match[1],attrs));}}
 all(){const visit=node=>[node,...node.children.flatMap(visit)];return this.children.flatMap(visit);}
 querySelector(s){return this.all().find(e=>e.matches(s))??null;}
 contains(element){return this.all().includes(element);}
 addEventListener(type,fn){this.listeners.set(type,fn);}
 removeEventListener(type,fn){if(this.listeners.get(type)===fn)this.listeners.delete(type);}
 dispatch(type,target,props={}){let prevented=false;this.listeners.get(type)?.({target,preventDefault(){prevented=true;},...props});return prevented;}
}
function fixture({storyBinding=null,statePatch={}}={}){
 const state={source_ref:'local:test-score',region:'wayglass-watercolor',sequence:0,generating:false,audio_enabled:false,feather_stopped:false,mono:false,density:.5,rate:4,last_error:null,bridge:{status:'local-only'},layers:[
 {id:'tide',label:'<Tide & copper>',region:'wayglass-watercolor',source_ref:'local:original-tone',available:true,position:{x:0,y:0},gain:.4,muted:false},
 {id:'bell',label:'Return bell',region:'acoustic',source_ref:'local:return-marker',available:false,position:{x:.5,y:-.5},gain:.2,muted:true}]};
 Object.assign(state,statePatch);
 const calls=[],subscribers=new Set(),storage=new Map();const snapshot=()=>structuredClone(state);const emit=()=>subscribers.forEach(fn=>fn(snapshot()));
 const engine={snapshot,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);},
 startGeneration(args){calls.push(['generate',args]);state.generating=true;emit();},pauseGeneration(){calls.push(['pause']);state.generating=false;emit();},
 async enableAudio(args){calls.push(['audio',args]);if(state.feather_stopped)throw new Error('Feather held');state.audio_enabled=true;emit();},disableAudio(){calls.push(['silence']);state.audio_enabled=false;emit();},
 feather(){calls.push(['feather']);state.feather_stopped=true;state.generating=false;state.audio_enabled=false;emit();},releaseFeather(args){calls.push(['release',args]);state.feather_stopped=false;emit();},
 setMix(patch){calls.push(['mix',patch]);Object.assign(state,patch);emit();},setLayer(id,patch){calls.push(['layer',id,patch]);Object.assign(state.layers.find(x=>x.id===id),patch);emit();},
 checkpoint(){calls.push(['checkpoint']);return snapshot();},restore(record){calls.push(['restore']);Object.assign(state,record,{generating:false,audio_enabled:false});emit();}};
 const root=new Root();const room=mountWayglassSoundComposition(root,{composition:engine,storyBinding,storage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)}});
 return{root,room,state,calls,engine,storage,subscribers,emit,$:s=>{const el=root.querySelector(s);assert.ok(el,'missing '+s);return el;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('positions use the engine signed coordinate domain and keyboard moves clamp',()=>{
 assert.deepEqual(soundstagePosition({clientX:600,clientY:300},{left:100,top:50,width:1000,height:500}),{x:0,y:0});
 assert.deepEqual(soundstagePosition({clientX:180,clientY:90},{left:100,top:50,width:1000,height:500}),{x:-1,y:-1});
 assert.throws(()=>soundstagePosition({clientX:NaN,clientY:0},{left:0,top:0,width:1,height:1}));
 assert.deepEqual(moveSoundObject({x:.99,y:0},'ArrowRight'),{x:1,y:0});assert.deepEqual(moveSoundObject({x:0,y:0},'ArrowUp',{fine:true}),{x:0,y:-.02});assert.equal(moveSoundObject({x:0,y:0},'Enter'),null);
});
test('entry never starts playback or generation and source strings stay text',()=>{
 const f=fixture();assert.equal(f.calls.length,0);assert.match(f.$('[data-composition-status]').textContent,/Score paused.*Sound off/);
 assert.equal(f.$('[data-sound-layer="tide"]').textContent,'<Tide & copper>');assert.match(f.$('[data-layer-source]').textContent,/local:original-tone/);
 assert.equal(f.$('[data-bridge-propose]').disabled,true);assert.match(f.$('[data-source-ledger]').children[1].textContent,/unavailable/);f.room.destroy();
});
test('score and playback have separate explicit controls; Feather release starts neither',async()=>{
 const f=fixture();f.root.dispatch('click',f.$('[data-score-start]'));await settle();assert.equal(f.state.generating,true);assert.equal(f.state.audio_enabled,false);
 f.root.dispatch('click',f.$('[data-audio-enable]'));await settle();assert.equal(f.state.audio_enabled,true);assert.deepEqual(f.calls[1],['audio',{confirmed:true}]);
 f.root.dispatch('click',f.$('[data-composition-feather]'));await settle();assert.equal(f.state.feather_stopped,true);assert.equal(f.$('[data-audio-enable]').disabled,true);
 f.root.dispatch('click',f.$('[data-composition-release]'));await settle();assert.equal(f.state.feather_stopped,false);assert.equal(f.state.generating,false);assert.equal(f.state.audio_enabled,false);f.room.destroy();
});
test('keyboard and touch update selected layer position without replacing its node',async()=>{
 const f=fixture(),point=f.$('[data-sound-layer="tide"]');assert.equal(f.root.dispatch('keydown',point,{key:'ArrowRight',shiftKey:false}),true);await settle();assert.deepEqual(f.state.layers[0].position,{x:.1,y:0});assert.equal(f.$('[data-sound-layer="tide"]'),point);
 f.root.dispatch('pointerdown',point,{pointerId:7,pointerType:'touch'});f.root.dispatch('pointermove',point,{pointerId:7,clientX:1020,clientY:510});await settle();assert.deepEqual(f.state.layers[0].position,{x:1,y:1});
 f.root.dispatch('pointercancel',point,{pointerId:7});const count=f.calls.length;f.root.dispatch('pointermove',point,{pointerId:7,clientX:600,clientY:300});assert.equal(f.calls.length,count);f.room.destroy();
});
test('mixer changes, mute and select preserve separate layers; input then change is not duplicated',async()=>{
 const f=fixture(),gain=f.$('[data-layer-gain]');gain.value='.7';f.root.dispatch('input',gain);await settle();f.root.dispatch('change',gain);await settle();assert.equal(f.state.layers[0].gain,.7);assert.equal(f.calls.length,1);
 const select=f.$('[data-layer-select]');select.value='bell';f.root.dispatch('change',select);const mute=f.$('[data-layer-muted]');mute.checked=false;f.root.dispatch('change',mute);await settle();assert.equal(f.state.layers[1].muted,false);assert.equal(f.state.layers[0].muted,false);
 const mono=f.$('[data-composition-mono]');mono.checked=true;f.root.dispatch('change',mono);await settle();assert.equal(f.state.mono,true);assert.deepEqual(f.state.layers[1].position,{x:.5,y:-.5});f.room.destroy();
});
test('return recovery stays muted and room teardown leaves explicitly running engine alone',async()=>{
 const f=fixture();f.root.dispatch('click',f.$('[data-composition-save]'));await settle();assert.equal(f.storage.size,1);
 f.root.dispatch('click',f.$('[data-score-start]'));f.root.dispatch('click',f.$('[data-audio-enable]'));await settle();f.root.dispatch('click',f.$('[data-composition-recover]'));await settle();assert.equal(f.state.generating,false);assert.equal(f.state.audio_enabled,false);
 f.root.dispatch('click',f.$('[data-score-start]'));await settle();const count=f.calls.length;f.room.destroy();f.room.destroy();assert.equal(f.calls.length,count);assert.equal(f.state.generating,true);assert.equal(f.subscribers.size,0);assert.equal(f.root.listeners.size,0);
});
test('audio failures and unavailable bridge proposals remain visible without fake success',async()=>{
 const f=fixture();f.engine.enableAudio=async()=>{throw new Error('Browser audio suspended');};f.root.dispatch('click',f.$('[data-audio-enable]'));await settle();assert.match(f.$('[data-composition-error]').textContent,/Browser audio suspended/);assert.equal(f.state.audio_enabled,false);
 f.engine.proposeBridge=()=>false;f.root.dispatch('click',f.$('[data-bridge-propose]'));await settle();assert.match(f.$('[data-composition-error]').textContent,/Bridge adapter unavailable/);assert.equal(f.state.bridge.status,'local-only');f.room.destroy();
});

test('mounted UI drives the actual shared engine through generation, layer placement and muted return',async()=>{
 const module=process.env.WAYGLASS_COMPOSITION_ENGINE_MODULE||new URL('../../../lib/wayglass-sound-composition.mjs',import.meta.url).href;
 const {createSoundComposition}=await import(module);
 let id=0,audioGestures=0,sharedStops=0;const tasks=new Map(),projected=[];
 const timers={setTimeout(fn){tasks.set(++id,fn);return id;},clearTimeout(id){tasks.delete(id);}};
 const composition=createSoundComposition({timers,eventScope:{},enableAudio:async()=>{audioGestures++;return true;},onScore:score=>{projected.push(score);return true;}});
 const store=new Map(),root=new Root();
 const room=mountWayglassSoundComposition(root,{composition,soundscape:{feather(){sharedStops++;return composition.feather();},releaseFeather:args=>composition.releaseFeather(args)},storage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)}});
 const $=selector=>root.querySelector(selector);
 assert.equal(tasks.size,0);assert.equal(audioGestures,0);assert.equal(projected.length,0);
 root.dispatch('click',$('[data-score-start]'));await settle();assert.equal(composition.snapshot().sequence,1);assert.equal(tasks.size,1);assert.equal(projected.length,0);
 root.dispatch('click',$('[data-audio-enable]'));await settle();assert.equal(audioGestures,1);assert.equal(projected.length,1);
 const point=$('[data-sound-layer="layer-0"]');root.dispatch('keydown',point,{key:'ArrowLeft',shiftKey:true});await settle();assert.equal(composition.snapshot().layers[0].position.x,projected[0].layers[0].position.x-.02);
 root.dispatch('click',$('[data-composition-save]'));await settle();const savedSequence=composition.snapshot().sequence;
 const [taskId,task]=tasks.entries().next().value;tasks.delete(taskId);task();assert.equal(composition.snapshot().sequence,savedSequence+1);
 root.dispatch('click',$('[data-composition-recover]'));await settle();assert.equal(composition.snapshot().sequence,savedSequence);assert.equal(composition.snapshot().generating,false);assert.equal(composition.snapshot().audio_enabled,false);assert.equal(tasks.size,0);
 root.dispatch('click',$('[data-composition-feather]'));await settle();assert.equal(sharedStops,1);assert.equal(composition.snapshot().feather_stopped,true);
 room.destroy();composition.dispose();
});

test('declaration controls begin blank and require two independent voices and actual affinity',async()=>{
 const contexts=[];const storyBinding={getContext:()=>({voices:[],affinity:null}),setContext:patch=>contexts.push(patch)};
 const f=fixture({storyBinding,statePatch:{score_status:'source-score-unavailable',last_error:'Source declarations required'}});
 assert.equal(f.$('[data-story-voice-one]').value,'');assert.equal(f.$('[data-story-voice-two]').value,'');assert.equal(f.$('[data-story-affinity]').value,'');
 assert.match(f.$('[data-story-declaration-status]').textContent,/Pending/);assert.match(f.$('[data-composition-status]').textContent,/source-score-unavailable/);
 assert.equal(f.$('[data-audio-enable]').disabled,true);
 f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(contexts.length,0);assert.match(f.$('[data-story-declaration-status]').textContent,/Pending/);
 f.$('[data-story-voice-one]').value='source:one';f.$('[data-story-voice-two]').value='source:one';f.$('[data-story-affinity]').value='.4';
 f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(contexts.length,0);assert.match(f.$('[data-composition-error]').textContent,/different/);
 f.$('[data-story-voice-two]').value='source:two';f.$('[data-story-affinity]').value='';f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(contexts.length,0);assert.match(f.$('[data-composition-error]').textContent,/affinity/);
 f.$('[data-story-affinity]').value='1.1';f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(contexts.length,0);
 f.$('[data-story-affinity]').value='0';f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(contexts.length,1);
 assert.deepEqual(contexts[0],{voices:[{voice_id:'source:one',source_ref:'owner-declaration:composer-controls'},{voice_id:'source:two',source_ref:'owner-declaration:composer-controls'}],affinity:{value:0,source_ref:'owner-declaration:composer-controls'}});f.room.destroy();
});
test('unchanged declared sources survive affinity edits and score updates retain typed voice drafts',async()=>{
 let context={voices:[{voice_id:'declared:one',source_ref:'receipt:one'},{voice_id:'declared:two',source_ref:'receipt:two'}],affinity:{value:.3,source_ref:'receipt:affinity'},anchor:{turn:42}};
 const changes=[];const f=fixture({storyBinding:{getContext:()=>structuredClone(context),setContext:patch=>{changes.push(patch);context={...context,...patch};}}});
 assert.equal(f.$('[data-story-affinity]').value,'0.3');assert.equal(f.$('[data-story-voice-one]').value,'declared:one');
 f.$('[data-story-affinity]').value='.6';f.root.dispatch('click',f.$('[data-story-apply]'));await settle();
 assert.equal(changes[0].voices[0].source_ref,'receipt:one');assert.equal(changes[0].voices[1].source_ref,'receipt:two');assert.equal(changes[0].affinity.source_ref,'owner-declaration:composer-controls');
 assert.equal(Object.hasOwn(changes[0],'anchor'),false);assert.deepEqual(context.anchor,{turn:42});
 f.$('[data-story-voice-one]').value='unfinished draft';f.emit();assert.equal(f.$('[data-story-voice-one]').value,'unfinished draft');
 f.$('[data-story-voice-one]').value='declared:one';f.root.dispatch('click',f.$('[data-story-apply]'));await settle();assert.equal(changes[1].affinity.source_ref,'owner-declaration:composer-controls');f.room.destroy();
});
test('source-program status visibly gates playback and healthy program state clears stale errors',()=>{
 const f=fixture({statePatch:{score_status:'source-score-unavailable',last_error:'Affinity missing'}});
 assert.match(f.$('[data-composition-status]').textContent,/source-score-unavailable/);assert.equal(f.$('[data-audio-enable]').disabled,true);assert.match(f.$('[data-composition-error]').textContent,/Affinity missing/);
 f.state.score_status='pending';f.state.last_error=null;f.emit();assert.match(f.$('[data-composition-status]').textContent,/pending/);assert.equal(f.$('[data-audio-enable]').disabled,true);assert.equal(f.$('[data-composition-error]').textContent,'');
 f.state.score_status='source-score-ready';f.emit();assert.match(f.$('[data-composition-status]').textContent,/source-score-ready/);assert.equal(f.$('[data-audio-enable]').disabled,false);
 f.state.feather_stopped=true;f.emit();assert.equal(f.$('[data-audio-enable]').disabled,true);f.room.destroy();
});


test('instrument, harmony and beat controls update the real layer palette without enabling audio',async()=>{
 const f=fixture();
 try{
  f.$('[data-sound-voice]').value='bell';f.$('[data-sound-chord]').value='minor7';f.$('[data-sound-rhythm]').value='eighths';f.$('[data-sound-bpm]').value='110';f.$('[data-sound-root]').value='220';
  f.root.dispatch('change',f.$('[data-sound-voice]'));await new Promise(r=>setImmediate(r));
  assert.deepEqual(f.state.layers[0].palette,{voice:'bell',chord:'minor7',rhythm:'eighths',bpm:110,root_hz:220});
  assert.equal(f.state.audio_enabled,false);
 }finally{f.room.destroy();}
});
