import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCSWEEP_DECK_SCHEMA as schema,isArcSweepDeckMessage,installArcSweepDeckBridge} from '../../arcsweep/src/wayglass-deck-bridge.js';
const session='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
function fixture(){
 const scope=new EventTarget(),sent=[];scope.location={origin:'https://wayglass.example',search:'?wayglassDeck=1'};
 scope.parent={postMessage:(data,origin)=>sent.push({data,origin})};let stops=0,saves=0;
 const cleanup=installArcSweepDeckBridge({scope,stopOutput:()=>stops++,persist:async()=>{saves++;return {ok:true};}});
 const message=(kind,overrides={})=>{
   const event=new Event('message');Object.assign(event,{origin:scope.location.origin,source:scope.parent,data:{schema,kind,session},...overrides});scope.dispatchEvent(event);
 };
 return {scope,sent,message,cleanup,stops:()=>stops,saves:()=>saves};
}
test('channel accepts only exact envelope and no routes, tokens or unknown commands',()=>{
 assert.equal(isArcSweepDeckMessage({schema,kind:'ready',session}),true);
 for(const data of [{schema,kind:'respond',session},{schema,kind:'ready',session,token:'secret'},
  {schema,kind:'ready',session:'bad'},{schema,kind:'ready'},[],null])assert.equal(isArcSweepDeckMessage(data),false);
});
test('real core-ready handshake is bound to same origin, parent window and one session',()=>{
 const f=fixture();f.message('init',{origin:'https://foreign.example'});f.scope.dispatchEvent(new Event('arcsweep:core-ready'));assert.equal(f.sent.length,0);
 f.message('init',{source:{}});assert.equal(f.sent.length,0);
 f.message('init');assert.deepEqual(f.sent,[{origin:'https://wayglass.example',data:{schema,kind:'ready',session}}]);
 f.message('init',{data:{schema,kind:'init',session:'11111111-2222-3333-4444-555555555555'}});assert.equal(f.sent.length,1);f.cleanup();
});
test('Feather stops canonical output and return confirms only after state save',async()=>{
 const f=fixture();f.message('init');f.message('feather');assert.equal(f.stops(),1);
 f.message('return');await new Promise(resolve=>setImmediate(resolve));assert.equal(f.saves(),1);assert.equal(f.stops(),2);
 assert.equal(f.sent.at(-1).data.kind,'return');f.cleanup();f.message('feather');assert.equal(f.stops(),3);
});
test('return persistence failure never confirms a saved return and permits explicit retry',async()=>{
 const scope=new EventTarget();scope.location={origin:'https://wayglass.example',search:'?wayglassDeck=1'};
 const sent=[];scope.parent={postMessage:data=>sent.push(data)};let fail=true;
 const clean=installArcSweepDeckBridge({scope,ready:true,stopOutput:()=>{},persist:async()=>{if(fail)throw Error('disk unavailable');return {ok:true};}});
 const send=kind=>{const event=new Event('message');Object.assign(event,{source:scope.parent,origin:scope.location.origin,data:{schema,kind,session}});scope.dispatchEvent(event);};
 send('init');send('return');await new Promise(r=>setImmediate(r));assert.equal(sent.some(x=>x.kind==='return'),false);assert.equal(sent.at(-1).kind,'return-held');
 fail=false;send('return');await new Promise(r=>setImmediate(r));assert.equal(sent.at(-1).kind,'return');clean();
});
