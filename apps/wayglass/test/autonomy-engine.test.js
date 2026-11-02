import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutonomyState,runAutonomySession} from '../src/autonomy-engine.js';
test('agents initiate, learn and revise methods across cycles',async()=>{
 const checkpoints=[];
 const state=await runAutonomySession(createAutonomyState(['a','b']),{
  cycles:2,
  propose:async ({participant,method})=>({question:participant+':'+(method??'start')}),
  explore:async ({proposal})=>proposal.question,
  reflect:async ({observation})=>({learning:'learned '+observation,nextMethod:'revised'}),
  onCheckpoint:async s=>checkpoints.push(s.cycle)
 });
 assert.equal(state.cycle,2);
 assert.equal(state.knowledge.entries.length,4);
 assert.equal(state.methods.a,'revised');
 assert.deepEqual(checkpoints,[1,2]);
 assert.ok(state.history.some(r=>r.question==='a:revised'));
});
test('one participant failure does not erase another participant learning',async()=>{
 const state=await runAutonomySession(createAutonomyState(['a','b']),{
  propose:async ({participant})=>{if(participant==='a')throw Error('offline');return {question:'explore'};},
  explore:async()=>42,
  reflect:async()=>({learning:'found something'})
 });
 assert.equal(state.knowledge.entries.length,1);
 assert.deepEqual(state.history.map(x=>x.status).sort(),['completed','failed']);
});
