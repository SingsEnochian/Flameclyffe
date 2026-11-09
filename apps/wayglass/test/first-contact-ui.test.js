import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountLivingWatercolorSurface} from '../src/surfaces/living-watercolor.js';
import {watercolorSnapshot} from '../src/watercolor-bridge.js';
import {WAYGLASS_ENTRY_SURFACE,resolveWayglassEntry} from '../src/wayglass-entry.js';
import {wayglassSomaticSound} from '../src/somatic-sound.js';
import {journeyLedger} from '../src/journey-before-destination.js';

// Production surface, modes and route client run unchanged. Only browser I/O
// and HTTP transport are captured adapters; no live model inference is claimed.
class Element{
 constructor(tag,attrs={}){
  this.tagName=tag.toUpperCase();this.attributes=attrs;this.dataset={};this.listeners=new Map();this.children=[];this._text='';this.value=attrs.value??'';this.disabled=Object.hasOwn(attrs,'disabled');this.hidden=Object.hasOwn(attrs,'hidden');this.style={};this.clientWidth=960;this.clientHeight=540;
  this.classList={toggle(){},add(){},remove(){}};
  for(const [key,value] of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
 }
 set textContent(text){this._text=String(text);this.children=[];}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 addEventListener(type,handler,options={}){if(options?.signal?.aborted)return;const handlers=this.listeners.get(type)??new Set();handlers.add(handler);this.listeners.set(type,handlers);options?.signal?.addEventListener('abort',()=>this.removeEventListener(type,handler),{once:true});}
 removeEventListener(type,handler){this.listeners.get(type)?.delete(handler);if(this.listeners.get(type)?.size===0)this.listeners.delete(type);}
 append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}if(this.tagName==='SELECT'&&!this.value)this.value=children[0]?.value??'';}
 replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
 matches(selector){return selector.split(',').some(part=>{const s=part.trim();if(s.startsWith('#'))return this.attributes.id===s.slice(1);if(s.startsWith('.'))return (this.attributes.class??'').split(/\s+/).includes(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return !!m&&Object.hasOwn(this.attributes,m[1])&&(m[2]===undefined||this.attributes[m[1]]===m[2]);}return this.tagName===s.toUpperCase();});}
 closest(selector){return this.matches(selector)?this:this.parentNode?.closest?.(selector)??null;}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
 getBoundingClientRect(){return {left:0,top:0,width:960,height:540};}
 getContext(){return null;}
 focus(){this.focused=true;}
 setPointerCapture(){}
 releasePointerCapture(){}
 async dispatch(type,details={}){const event={target:this,currentTarget:this,preventDefault(){},...details};await Promise.all([...this.listeners.get(type)??[]].map(handler=>handler(event)));}
}
class Root extends Element{
 constructor(){super('main');}
 set innerHTML(html){
  this.children=[];
  for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
   const attrs={};for(const attr of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[attr[1]]=attr[2]??'';
   this.append(new Element(match[1],attrs));
  }
 }
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const response=(body,{ok=true,status=200}={})=>({ok,status,json:async()=>structuredClone(body)});
const catalogue={routes:[{route_id:'local:ollama',provider:'ollama',model:'ornith-captured',label:'Captured local transport',configured:true}]};
const capturedTurn={schema:'wayglass.route-turn/v0.1',route_id:'local:ollama',output:'Captured transport fixture: the next question is open.',provider:'ollama',model:'ornith-captured',receipt:{schema:'wayglass.route-receipt/v0.1',observation_id:'capture:first-contact:1'}};
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};}
async function setup({respond=async()=>response(capturedTurn),offline=false,storage=new Map(),ship=false}={}){
 if(journeyLedger.snapshot().feather_stopped)journeyLedger.resume({confirmed:true});
 if(wayglassSomaticSound.snapshot().feather_stopped)wayglassSomaticSound.releaseFeather({confirmed:true});
 const descriptors=new Map(),frames=new Map(),calls=[];let sequence=0;
 const replace=(key,value)=>{descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 replace('document',{createElement:tag=>new Element(tag)});
 replace('matchMedia',()=>({matches:false}));
 replace('requestAnimationFrame',callback=>{const id=++sequence;frames.set(id,callback);return id;});
 replace('cancelAnimationFrame',id=>frames.delete(id));
 replace('localStorage',{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)});
 replace('fetch',async(url,options={})=>{calls.push({url,options});if(url==='/api/v1/wayglass/routes'){if(offline)throw new Error('Captured transport unavailable');return response(ship?{routes:[{route_id:'wayglass:ship',provider:'ollama',model:'ornith-captured',label:'Wayglass · Ship Voice',configured:true},...catalogue.routes]}:catalogue);}if(url==='/api/v1/wayglass/respond'){
    if(ship)return response({...capturedTurn,route_id:'wayglass:ship',participant_id:'wayglass',receipt:{...capturedTurn.receipt,character_id:'wayglass',voice_seat_kind:'system-voice-over-external-route'}});
    return respond(url,options);
  }throw new Error('Unexpected captured request: '+url);});
 const root=new Root(),mounted=await mountLivingWatercolorSurface(root);await flush();
 const q=id=>{const element=root.querySelector('#'+id);assert.ok(element,'Missing mounted control '+id);return element;};
 let destroyed=false;
 return {root,mounted,q,calls,frames,storage,destroy(){if(!destroyed){mounted.destroy();destroyed=true;}},restore(){if(!destroyed)mounted.destroy();for(const [key,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}

// Acceptance: the mounted entry keeps its local painting during missing
// transport, displays only actual captured route outcomes, translates receipt
// events into pigment, preserves a return, and rejects stale completion after
// Feather or teardown. The Acoustic Room remains registered in the current shell.
test('offline entry paints locally and preserves Acoustic Room in the application shell',async()=>{
 const f=await setup({offline:true});try{
  assert.equal(resolveWayglassEntry({available:[WAYGLASS_ENTRY_SURFACE,'wayglass:acoustic-room']}).surface_id,WAYGLASS_ENTRY_SURFACE);
  assert.equal(f.q('wc-invite').disabled,true);
  assert.match(f.q('wc-route-state').textContent,/offline/i);
  assert.ok(f.mounted.fluid.snapshot().pigment_mass>0);
  assert.equal(f.calls.filter(call=>call.url==='/api/v1/wayglass/respond').length,0);
  const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/mountWayglassAcousticRoom/);
  assert.match(main,/surface_id:\s*['"]wayglass:acoustic-room['"]/);
  assert.match(main,/resolveWayglassEntry/);
 }finally{f.restore();}
});
test('captured production route outcome displays attribution and receipt while its events paint the body',async()=>{
 const f=await setup();try{
  const eventsBefore=watercolorSnapshot().events.length,massBefore=f.mounted.fluid.snapshot().pigment_mass;
  f.q('wc-prompt').value='What can we examine together?';
  await f.q('wc-invite').dispatch('click');
  await flush();
  const call=f.calls.find(item=>item.url==='/api/v1/wayglass/respond');assert.ok(call);
  const body=JSON.parse(call.options.body);
  assert.equal(body.route_id,'local:ollama');assert.equal(body.surface_id,'wayglass:living-watercolor');
  assert.match(body.input,/What can we examine together\?/);
  assert.match(f.q('wc-voice').textContent,/ollama \/ ornith-captured/);
  assert.match(f.q('wc-voice').textContent,/Captured transport fixture: the next question is open/);
  assert.match(f.q('wc-feedback').textContent,/capture:first-contact:1/);
  const events=watercolorSnapshot().events.slice(eventsBefore);
  assert.ok(events.some(event=>event.kind==='route:pending'));
  assert.ok(events.some(event=>event.kind==='route:responded'&&event.evidence?.receipt_ref==='capture:first-contact:1'));
  assert.ok(f.mounted.fluid.snapshot().pigment_mass>massBefore);
 }finally{f.restore();}
});
test('failed captured transport remains visible without inventing a model contribution',async()=>{
 const f=await setup({respond:async()=>response({error:'Captured route unavailable'},{ok:false,status:503})});try{
  await f.q('wc-invite').dispatch('click');
  await flush();
  assert.match(f.q('wc-feedback').textContent,/Captured route unavailable/);
  assert.doesNotMatch(f.q('wc-voice').textContent,/Captured transport fixture/);
  assert.equal(watercolorSnapshot().events.at(-1).kind,'route:failed');
 }finally{f.restore();}
});
test('incomplete route attribution is retained for inspection without becoming an authored voice',async()=>{
 const unattributed={...capturedTurn};delete unattributed.route_id;
 const f=await setup({respond:async()=>response(unattributed)});try{
  await f.q('wc-invite').dispatch('click');await flush();
  assert.doesNotMatch(f.q('wc-voice').textContent,/Captured transport fixture/);
  assert.equal(f.q('wc-unverified').hidden,false);
  assert.deepEqual(JSON.parse(f.q('wc-unverified-text').textContent),unattributed);
  assert.match(f.q('wc-feedback').textContent,/attribution|route|identity/i);
 }finally{f.restore();}
});
test('First Contact requests an actual route contribution and preserves authorship of optional voice notes',async()=>{
 const f=await setup();try{
  f.q('wc-voice-notes').value='A warm measured cadence.';
  await f.q('wc-first-contact').dispatch('click');await flush();
  assert.equal(f.calls.filter(call=>call.url==='/api/v1/wayglass/respond').length,0);
  assert.match(f.q('wc-feedback').textContent,/authored|author/i);
  f.q('wc-voice-author').value='Rowan';
  await f.q('wc-first-contact').dispatch('click');await flush();
  const calls=f.calls.filter(call=>call.url==='/api/v1/wayglass/respond');assert.equal(calls.length,1);
  const body=JSON.parse(calls[0].options.body);
  assert.match(body.input,/choose|decline/i);assert.match(body.input,/A warm measured cadence/);assert.match(body.input,/Rowan/);
  assert.match(f.q('wc-voice').textContent,/Captured transport fixture/);
 }finally{f.restore();}
});
test('Feather invalidates a pending contribution and requires explicit release',async()=>{
 const pending=deferred(),f=await setup({respond:()=>pending.promise});try{
  const request=f.q('wc-invite').dispatch('click');await flush();
  await f.q('wc-feather').dispatch('click');
  const stoppedVoice=f.q('wc-voice').textContent;
  pending.resolve(response(capturedTurn));await request;await flush();
  assert.equal(f.q('wc-voice').textContent,stoppedVoice);
  assert.equal(f.q('wc-invite').disabled,true);
  assert.match(f.q('wc-feedback').textContent,/Feather|paused|cancel/i);
  await f.q('wc-feather').dispatch('click');
  assert.equal(f.q('wc-invite').disabled,false);
 }finally{f.restore();}
});
test('destroyed entry ignores late captured response and detaches its controls',async()=>{
 const pending=deferred(),f=await setup({respond:()=>pending.promise});try{
  const request=f.q('wc-invite').dispatch('click');await flush();
  const voice=f.q('wc-voice').textContent,feedback=f.q('wc-feedback').textContent;
  f.destroy();assert.equal(f.frames.size,0);
  pending.resolve(response(capturedTurn));await request;await flush();
  assert.equal(f.q('wc-voice').textContent,voice);
  assert.equal(f.q('wc-feedback').textContent,feedback);
  for(const control of f.root.children)assert.equal(control.listeners.size,0,control.attributes.id??control.tagName);
 }finally{f.restore();}
});
test('local cold return preserves exact captured contribution without another inference request',async()=>{
 const storage=new Map();let f=await setup({storage});
 try{
  f.q('wc-prompt').value='Keep this question open on return.';
  await f.q('wc-invite').dispatch('click');
  await flush();
  const voice=f.q('wc-voice').textContent;
  assert.match(voice,/Captured transport fixture/);
  const originalRequest=JSON.parse(f.calls.find(call=>call.url==='/api/v1/wayglass/respond').options.body);
  await f.q('wc-save-return').dispatch('click');
  assert.ok(storage.size>0);
  f.restore();
  f=await setup({storage});
  assert.doesNotMatch(f.q('wc-voice').textContent,/Captured transport fixture/);
  await f.q('wc-recover-return').dispatch('click');
  assert.equal(f.q('wc-voice').textContent,voice);
  assert.equal(f.calls.filter(call=>call.url==='/api/v1/wayglass/respond').length,0);
  assert.equal(wayglassSomaticSound.snapshot().audio_enabled,false);
  assert.match(f.q('wc-feedback').textContent,/return|recover|restor/i);
  f.q('wc-prompt').value='Continue the preserved question.';
  await f.q('wc-invite').dispatch('click');await flush();
  const nextRequest=JSON.parse(f.calls.find(call=>call.url==='/api/v1/wayglass/respond').options.body);
  assert.equal(nextRequest.session_id,originalRequest.session_id);
  assert.ok(nextRequest.history.some(turn=>turn.role==='user'&&turn.content==='Keep this question open on return.'));
  assert.ok(nextRequest.history.some(turn=>turn.role==='assistant'&&turn.content===capturedTurn.output));
 }finally{f.restore();}
});
