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
