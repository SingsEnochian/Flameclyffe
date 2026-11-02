import test from 'node:test';
import assert from 'node:assert/strict';
import {runConcurrentWork,WAYGLASS_WORKSTREAMS} from '../src/concurrent-work.js';
test('workstreams execute concurrently with independent receipts',async()=>{
 let active=0,peak=0;
 const tasks=WAYGLASS_WORKSTREAMS.slice(0,4);
 const receipts=await runConcurrentWork({tasks,concurrency:4,execute:async task=>{
  active++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,5));
  active--;return task+' complete';
 }});
 assert.equal(peak,4);
 assert.deepEqual(receipts.map(r=>r.status),Array(4).fill('fulfilled'));
});
test('failure in one workstream does not cancel the others',async()=>{
 const receipts=await runConcurrentWork({tasks:['a','b','c'],execute:async task=>{
  if(task==='b')throw Error('blocked');return task;
 }});
 assert.deepEqual(receipts.map(r=>r.status),['fulfilled','rejected','fulfilled']);
});
