const test = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {resolve} = require('node:path');
const registryUrl = pathToFileURL(resolve(__dirname,'../../apps/wayglass/src/surface-registry.js')).href;

test('stale async room mount cannot reclaim cleanup ownership',async()=>{
 const {registerWayglassSurface,mountWayglassSurface} = await import(registryUrl);
 let finishOld;
 const oldReady = new Promise(resolve => {finishOld=resolve;});
 let oldClean=0,newClean=0;
 registerWayglassSurface({surface_id:'test:slow-room',mount:async()=>{await oldReady;return ()=>{oldClean++;};}});
 registerWayglassSurface({surface_id:'test:fast-room',mount:()=>()=>{newClean++;}});
 const root={};
 const slow=mountWayglassSurface('test:slow-room',root);
 await mountWayglassSurface('test:fast-room',root);
 finishOld();await slow;
 assert.equal(oldClean,1,'superseded room is disposed');
 assert.equal(newClean,0,'new room remains mounted');
 await mountWayglassSurface('test:fast-room',root);
 assert.equal(newClean,1,'new room is cleaned on subsequent navigation');
});

test('navigation aborts departing room and passes an opt-in cancellation signal',async()=>{
 const {registerWayglassSurface,mountWayglassSurface}=await import(registryUrl);
 let departingSignal,arrivingSignal;
 registerWayglassSurface({surface_id:'test:abort-departing',mount:(_root,{signal})=>{departingSignal=signal;return ()=>{};}});
 registerWayglassSurface({surface_id:'test:abort-arriving',mount:(_root,{signal})=>{arrivingSignal=signal;return ()=>{};}});
 const root={};
 await mountWayglassSurface('test:abort-departing',root);
 assert.equal(departingSignal.aborted,false);
 await mountWayglassSurface('test:abort-arriving',root);
 assert.equal(departingSignal.aborted,true);
 assert.equal(arrivingSignal.aborted,false);
});
test('failed async mount aborts its own signal without reclaiming a newer room',async()=>{
 const {registerWayglassSurface,mountWayglassSurface}=await import(registryUrl);
 let fail,signal,clean=0;
 const gate=new Promise((_,reject)=>{fail=reject;});
 registerWayglassSurface({surface_id:'test:reject-late',mount:async(_root,ctx)=>{signal=ctx.signal;await gate;}});
 registerWayglassSurface({surface_id:'test:survivor',mount:()=>()=>{clean++;}});
 const root={};
 const stale=mountWayglassSurface('test:reject-late',root);
 await mountWayglassSurface('test:survivor',root);
 fail(new Error('synthetic stale failure'));
 await assert.rejects(stale,/synthetic stale failure/);
 assert.equal(signal.aborted,true);
 await mountWayglassSurface('test:survivor',root);
 assert.equal(clean,1);
});
