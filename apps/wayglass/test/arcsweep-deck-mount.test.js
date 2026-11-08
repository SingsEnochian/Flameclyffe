import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const moduleURL=new URL('../src/surfaces/arcsweep-deck.js',import.meta.url);
const source=(await readFile(moduleURL,'utf8')).replace(/^import '\.\/arcsweep-deck\.css';\s*/m,'')
 .replace(/from '(\.\.[^']+)'/g,(_,path)=>`from '${new URL(path,moduleURL).href}'`);
const {mountArcSweepDeckSurface}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const schema='wayglass.arcsweep-deck/v1',session='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
class Element extends EventTarget{
 constructor(){super();this.attributes={};this.contentWindow={postMessage:(data,origin)=>this.sent.push({data,origin})};this.sent=[];this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;}replaceChildren(...nodes){this.children=nodes;}remove(){this.removed=true;}
 click(){this.dispatchEvent(new Event('click'));}
}
function fixture(options={}){
 const elements=new Map();for(const key of ['status','frame','load','feather','return'])elements.set(key,new Element());
 let frame;const root={set innerHTML(_){},querySelector:selector=>elements.get(selector.match(/data-deck-(\w+)/)[1]),ownerDocument:{createElement:()=>frame=new Element()}};
 const scope=new EventTarget();scope.location={origin:'https://wayglass.example'};scope.crypto={randomUUID:()=>session};
 const saved=new Map(),mounts=[];scope.sessionStorage={setItem:(k,v)=>saved.set(k,v)};scope.__wayglassOS={mount:id=>mounts.push(id)};
 let stopped=false,stopCalls=0,releases=0;const broadcast=()=>scope.dispatchEvent(new Event('wayglass:feather'));
 const sound={snapshot:()=>({feather_stopped:stopped}),stop:()=>stopCalls++,feather:()=>{stopped=true;broadcast();},releaseFeather:({confirmed})=>{assert.equal(confirmed,true);stopped=false;releases++;broadcast();}};
 const surface=mountArcSweepDeckSurface(root,{scope,sound,...options});
 const message=(data,overrides={})=>{const event=new Event('message');Object.assign(event,{source:frame.contentWindow,origin:scope.location.origin,data,...overrides});scope.dispatchEvent(event);};
 return{elements,scope,sound,saved,mounts,surface,message,frame:()=>frame,stops:()=>stopCalls,releases:()=>releases};
}
test('production mount waits for matched child core and ignores forged ready/return messages',()=>{
 const f=fixture();assert.equal(f.frame(),undefined);f.elements.get('load').click();assert.match(f.frame().src,/^\/arcsweep\/\?open=1&wayglassDeck=1$/);
 assert.equal(f.frame().inert,true);
 f.message({schema,kind:'ready',session},{origin:'https://foreign.example'});assert.equal(f.frame().inert,true);
 f.message({schema,kind:'ready',session},{source:{}});assert.equal(f.frame().inert,true);
 f.message({schema,kind:'ready',session,token:'secret'});assert.equal(f.frame().inert,true);
 f.message({schema,kind:'ready',session});assert.equal(f.frame().inert,false);
 f.elements.get('feather').click();assert.equal(f.frame().inert,true);assert.equal(f.frame().sent.at(-1).data.kind,'feather');
 f.elements.get('feather').click();assert.equal(f.frame().inert,false);assert.equal(f.releases(),1);
 f.message({schema,kind:'return',session},{source:{}});assert.equal(f.mounts.length,0);
 f.elements.get('return').click();assert.equal(f.frame().sent.at(-1).data.kind,'return');assert.equal(f.mounts.length,0);
 f.message({schema,kind:'return-held',session});assert.match(f.elements.get('status').textContent,/could not confirm/);assert.equal(f.mounts.length,0);f.elements.get('return').click();
 f.message({schema,kind:'return',session});assert.deepEqual(f.mounts,['wayglass:living-watercolor']);
 assert.equal(JSON.parse(f.saved.get('wayglass.arcsweep-deck.return/v1')).child_state_saved,true);
 f.surface.destroy();assert.equal(f.frame().removed,true);
});
test('missing child boot surfaces unavailable state and preserves a return without a saved-child claim',async()=>{
 const f=fixture({timeoutMs:5});f.elements.get('load').click();await new Promise(resolve=>setTimeout(resolve,12));
 assert.match(f.elements.get('status').textContent,/unavailable/);f.elements.get('return').click();
 assert.equal(JSON.parse(f.saved.get('wayglass.arcsweep-deck.return/v1')).child_state_saved,false);assert.equal(f.mounts.length,1);f.surface.destroy();
});

test('late child listener receives bounded repeated init and matched ready ends retries',async()=>{
 const f=fixture({timeoutMs:100,handshakeRetryMs:5});f.elements.get('load').click();
 f.frame().dispatchEvent(new Event('load')); // First greeting arrives before child listener exists.
 const first=f.frame().sent.length;assert.equal(first,2);
 await new Promise(resolve=>setTimeout(resolve,16));assert.ok(f.frame().sent.length>first);
 assert.ok(f.frame().sent.every(({data,origin})=>data.kind==='init'&&data.session===session&&origin===f.scope.location.origin));
 f.message({schema,kind:'ready',session});const count=f.frame().sent.length;
 await new Promise(resolve=>setTimeout(resolve,16));assert.equal(f.frame().sent.length,count);f.surface.destroy();
});
test('unavailable deadline and disposal terminate init retries',async()=>{
 const f=fixture({timeoutMs:12,handshakeRetryMs:3});f.elements.get('load').click();f.frame().dispatchEvent(new Event('load'));
 await new Promise(resolve=>setTimeout(resolve,22));assert.match(f.elements.get('status').textContent,/unavailable/);
 const count=f.frame().sent.length;f.frame().dispatchEvent(new Event('load'));await new Promise(resolve=>setTimeout(resolve,12));assert.equal(f.frame().sent.length,count);f.surface.destroy();
 const g=fixture({timeoutMs:100,handshakeRetryMs:3});g.elements.get('load').click();g.frame().dispatchEvent(new Event('load'));g.surface.destroy();
 const after=g.frame().sent.length;await new Promise(resolve=>setTimeout(resolve,12));assert.equal(g.frame().sent.length,after);
});

test('hydrated core can acknowledge while document load is still pending',async()=>{
 const f=fixture({timeoutMs:100,handshakeRetryMs:5});f.elements.get('load').click();
 assert.equal(f.frame().sent[0].data.kind,'init');
 await new Promise(resolve=>setTimeout(resolve,12));assert.ok(f.frame().sent.length>1);
 f.message({schema,kind:'ready',session});assert.equal(f.frame().inert,false);f.surface.destroy();
});
