import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutonomyState,runAutonomyCycle} from '../src/autonomy-engine.js';
test('participants encounter shared knowledge and inherit with provenance',async()=>{
 let state=createAutonomyState(['first','second']);
 const seen=[];
 for(let i=0;i<2;i++){
  ({state}=await runAutonomyCycle(state,{
   propose:async ({participant,knowledge})=>{seen.push({participant,count:knowledge.length});return {question:'Inquiry '+participant};},
   explore:async ()=> 'observation',
   reflect:async ({participant,knowledge})=>({learning:'learning '+participant,parents:knowledge.length?[knowledge.at(-1).id]:[]}),
  }));
 }
 assert.equal(state.knowledge.entries.length,4);
 assert.ok(seen.some(x=>x.count===2));
 assert.equal(state.knowledge.entries[2].kind,'transformation');
 assert.equal(state.knowledge.entries[2].parents.length,1);
});
