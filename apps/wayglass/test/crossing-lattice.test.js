import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrossingPacket,cross,traverseCrossings,crossingTopology} from '../src/crossing-lattice.js';
test('twenty directed engine and observer crossings',()=>{
 const topology=crossingTopology();
 assert.equal(topology.directedEdges,20);
 assert.equal(new Set(topology.edges.map(e=>e.id)).size,20);
});
test('crossing returns transformed payload with immutable provenance',()=>{
 const origin=createCrossingPacket({id:'p:1',origin:'state',payload:{value:2}});
 const geometry=cross(origin,'geometry',{transform:p=>({value:p.value*3})});
 const observer=cross(geometry,'observer',{transform:p=>({value:p.value+1}),observer:'Rarity'});
 assert.equal(origin.history.length,0);
 assert.equal(observer.payload.value,7);
 assert.deepEqual(observer.history.map(x=>x.edge),['state->geometry','geometry->observer']);
 assert.equal(observer.history[1].observer,'Rarity');
 assert.ok(observer.history.every(x=>x.authorityGrant===false));
});
test('recursive crossings are bounded and preserve traversal order',()=>{
 const packet=createCrossingPacket({id:'p:2',origin:'becoming',payload:{count:0}});
 const result=traverseCrossings(packet,[{to:'temporal',transform:p=>({count:p.count+1})},{to:'becoming',transform:p=>({count:p.count+1})}]);
 assert.deepEqual(result.visited,['becoming','temporal','becoming']);
 assert.equal(result.payload.count,2);
 assert.throws(()=>traverseCrossings(packet,Array.from({length:33},()=>({to:'state',transform:p=>p}))));
});
