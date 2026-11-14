import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTriHorizonDream} from '../src/tri-horizon-dreaming.js';
test('explores all three scales with immutable origin and receipts',async()=>{
 const seen=[],receipts=[];
 const dream=createTriHorizonDream({dream_id:'voyage-1',origin:'original',change:'new visitor',
  propose:async({horizon,previous})=>{seen.push({horizon,previous});return [{summary:horizon+' possibility',assumptions:['hypothesis']}];},
  record:r=>receipts.push(r)});
 const result=await dream.explore();
 assert.deepEqual(seen.map(x=>x.horizon),['one','multiple','long']);
 assert.deepEqual(Object.keys(result.horizons),['one','multiple','long']);
 assert.equal(result.anchor.origin,'original');
 assert.equal(result.anchor.canon_mutated,false);
 assert.equal(receipts.length,3);
 assert.equal(Object.isFrozen(result.horizons.long[0]),true);
});
test('Feather while awaiting a branch records late result but does not adopt',async()=>{
 const receipts=[];let resolve;
 const dream=createTriHorizonDream({dream_id:'voyage-2',origin:'o',change:'c',propose:()=>new Promise(r=>resolve=r),record:r=>receipts.push(r)});
 const pending=dream.explore();
 dream.feather();
 resolve([{summary:'late'}]);
 const result=await pending;
 assert.equal(result.interrupted,true);
 assert.deepEqual(result.horizons,{});
 assert.equal(receipts.some(x=>x.stage==='late-observation'),true);
});
